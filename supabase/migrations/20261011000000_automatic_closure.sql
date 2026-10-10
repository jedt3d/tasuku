-- Automatic closure (#11).

-- A Resolved Task its Customer does not answer becomes Done by itself. The Customer is told three
-- times: when the Task is Resolved, some hours before it closes (the reminder), and once it has.

-- The two periods. One row: `id` can only be true. Staff read them; a Task Master changes them.
create table public.settings (
  id boolean primary key default true check (id),
  -- How long a Task stays Resolved before it becomes Done by itself.
  closure_hours int not null default 48,
  -- How long before that the Customer is reminded.
  reminder_hours int not null default 24,
  check (reminder_hours >= 1 and reminder_hours < closure_hours and closure_hours <= 720)
);
insert into public.settings default values;

alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
grant select on public.settings to authenticated;
grant update (closure_hours, reminder_hours) on public.settings to authenticated;
grant select, update on public.settings to service_role;

create policy "staff read settings" on public.settings
  for select to authenticated
  using ((select private.is_staff()));

create policy "task master changes settings" on public.settings
  for update to authenticated
  using ((select private.is_task_master()))
  with check ((select private.is_task_master()));

-- When a Resolved Task becomes Done by itself; null in every other status. It is fixed when the
-- Task becomes Resolved, because the Customer is told then: a Task Master who changes the period
-- changes it for the Tasks Resolved from then on. A Task Reopened and Resolved again starts over.
alter table public.tasks add column closes_at timestamptz;
create index tasks_closes_at_idx on public.tasks (closes_at) where status = 'resolved';

update public.tasks t
  set closes_at = interval '48 hours' + (
    select max(e.created_at) from public.timeline_entries e
    where e.task_id = t.id and e.kind = 'moved' and e.status = 'resolved'
  )
  where t.status = 'resolved';

create or replace function private.move_task(task bigint, new_status text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    staff boolean := private.is_staff();
  begin
    update public.tasks
      set status = new_status,
        closes_at = case when new_status = 'resolved' then
          now() + make_interval(hours => (select closure_hours from public.settings))
        end
      where id = task;
    insert into public.timeline_entries (task_id, kind, status, author_id, customer_id)
      values (
        task, 'moved', new_status,
        case when staff then auth.uid() end,
        case when not staff then auth.uid() end
      );
  end;
  $$;

-- While a Task is Resolved its Customer has been asked a question and given a time to answer, so
-- the Customer is neither replaced nor taken off: the Task is Reopened first. Otherwise as in #7.
create or replace function public.set_customer(task bigint, customer_email text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    address text := lower(btrim(customer_email));
    person uuid;
    previous uuid;
    current_status text;
  begin
    -- The Task row is held before the caller is checked, so the Task cannot become Done or
    -- Cancelled between the check and the change.
    select customer_id, status into previous, current_status from public.tasks where id = task for update;
    if not private.manages_task(task) or current_status = 'resolved' then
      raise exception 'only the Owner and a Task Master choose the Customer, and not while the Task is Resolved'
        using errcode = '42501';
    end if;
    select id into person from auth.users where email = address;
    if person is null then
      raise exception 'no account for this email' using errcode = 'TSK02';
    end if;
    insert into public.customers (user_id, email) values (person, address)
      on conflict (user_id) do nothing;

    if previous is not distinct from person then
      return;
    end if;
    update public.tasks set customer_id = person where id = task;
    if previous is not null then
      insert into public.timeline_entries (task_id, kind, author_id, customer_id)
        values (task, 'customer_removed', auth.uid(), previous);
    end if;
    insert into public.timeline_entries (task_id, kind, author_id, customer_id)
      values (task, 'customer_added', auth.uid(), person);
  end;
  $$;

create or replace function public.remove_customer(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    previous uuid;
    current_status text;
  begin
    select customer_id, status into previous, current_status from public.tasks where id = task for update;
    if not private.manages_task(task) or current_status = 'resolved' then
      raise exception 'only the Owner and a Task Master choose the Customer, and not while the Task is Resolved'
        using errcode = '42501';
    end if;
    if previous is null then
      return;
    end if;
    update public.tasks set customer_id = null where id = task;
    insert into public.timeline_entries (task_id, kind, author_id, customer_id)
      values (task, 'customer_removed', auth.uid(), previous);
  end;
  $$;

-- Two more emails. 'closed' follows the event of the Task closing by itself. A reminder is no
-- event of the Timeline: it hangs on the event that made the Task Resolved, next to the 'resolved'
-- email to the same Customer, so an entry now holds one email of each kind for a recipient. That
-- is also what keeps a reminder to once: a Task Resolved again has a new event, and a new reminder.
alter table private.email_outbox
  drop constraint email_outbox_kind_check,
  add constraint email_outbox_kind_check
    check (kind in ('added', 'comment', 'resolved', 'cancelled', 'reminder', 'closed')),
  drop constraint email_outbox_entry_id_recipient_key,
  add constraint email_outbox_entry_id_recipient_kind_key unique (entry_id, recipient, kind);

create or replace function private.queue_emails() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
    -- On 'customer_added' `customer_id` is who was added, and `author_id` who added them.
    actor uuid := coalesce(new.author_id, new.customer_id);
    mail text;
    queued int;
  begin
    select * into t from public.tasks where id = new.task_id;
    mail := case
      when new.kind in ('collaborator_added', 'customer_added') then 'added'
      when new.kind = 'comment' then 'comment'
      when new.kind = 'moved' and new.status = 'resolved' then 'resolved'
      -- Done with nobody named: the Task closed by itself (`close_due_tasks`).
      when new.kind = 'moved' and new.status = 'done' and actor is null then 'closed'
      -- "The Customer cancels" is whoever cancels as the Customer (`private.acts_as_customer`):
      -- a Staff member who is the Customer is recorded as Staff, so the row alone does not say.
      when new.kind = 'moved' and new.status = 'cancelled'
        and actor = t.customer_id and actor <> t.owner_id then 'cancelled'
    end;
    if mail is null then
      return null;
    end if;

    insert into private.email_outbox (entry_id, recipient, kind)
      select distinct new.id, person, mail
      from unnest(
        case mail
          when 'added' then array[coalesce(new.subject_id, new.customer_id)]
          when 'comment' then
            array[t.owner_id, t.customer_id]
            || array(select staff_id from public.task_collaborators where task_id = new.task_id)
          when 'resolved' then array[t.customer_id]
          -- An Owner who is the Customer of their own Task was not asked anything.
          when 'closed' then array[nullif(t.customer_id, t.owner_id)]
          else array[t.owner_id]
        end
      ) as person
      where person is not null and person is distinct from actor;
    get diagnostics queued = row_count;
    if queued > 0 then
      perform private.poke_send_emails();
    end if;
    return null;
  end;
  $$;

-- As in #10, and: the 'resolved' email and the reminder are dropped once the Task has moved on from
-- the Resolved they were about, as both ask a question that is no longer open and name its time.
-- `hours` is how long the Task has before it closes by itself, for the emails that say so. In a
-- 'closed' email the person named is the Owner, who the Customer turns to next.
drop function public.claim_emails();
create function public.claim_emails()
  returns table (
    id bigint, kind text, task_id bigint, title text, email text, language text, actor text, hours int
  )
  language sql security definer set search_path = ''
  as $$
    with gone as (
      delete from private.email_outbox o
        using public.timeline_entries e, public.tasks t
        where o.sent_at is null and e.id = o.entry_id and t.id = e.task_id
          and (
            e.deleted_at is not null
            or exists (
              select from public.staff s where s.user_id = o.recipient and s.removed_at is not null
            )
            or (
              o.recipient <> t.owner_id
              and o.recipient is distinct from t.customer_id
              and not exists (
                select from public.task_collaborators c
                where c.task_id = t.id and c.staff_id = o.recipient
              )
            )
            or (
              o.kind in ('resolved', 'reminder')
              and exists (
                select from public.timeline_entries later
                where later.task_id = t.id and later.kind = 'moved' and later.id > o.entry_id
              )
            )
          )
        returning o.id
    ),
    due as (
      select o.id from private.email_outbox o
      where o.sent_at is null and o.attempts < 5
        and (o.claimed_at is null or o.claimed_at < now() - interval '2 minutes')
        and o.id not in (select gone.id from gone)
      order by o.id
      limit 50
      for update skip locked
    ),
    claimed as (
      update private.email_outbox o set claimed_at = now(), attempts = o.attempts + 1
        from due where o.id = due.id
        returning o.id, o.kind, o.entry_id, o.recipient
    )
    select
      c.id, c.kind, t.id, t.title,
      coalesce(to_staff.email, to_customer.email),
      coalesce(to_staff.language, to_customer.language),
      case
        when to_staff.user_id is not null then coalesce(nullif(by_staff.name, ''), by_staff.email, by_customer.email)
        else coalesce(nullif(by_staff.name, ''), 'PSP')
      end,
      greatest(1, round(extract(epoch from t.closes_at - now()) / 3600))::int
    from claimed c
      join public.timeline_entries e on e.id = c.entry_id
      join public.tasks t on t.id = e.task_id
      left join public.staff to_staff on to_staff.user_id = c.recipient
      left join public.customers to_customer on to_customer.user_id = c.recipient
      left join public.staff by_staff
        on by_staff.user_id = case when c.kind = 'closed' then t.owner_id else e.author_id end
      left join public.customers by_customer on by_customer.user_id = e.customer_id and e.author_id is null
    order by c.id;
  $$;

-- The scheduled job. `as_of` is the time it takes for now, so tests need not wait; for that
-- reason nobody signed in may call it, or anyone could close Tasks by naming a later time.
-- Tasks past their time become Done first, so none of them is reminded. Then the Customer of each
-- Task within the lead time is reminded; the outbox refuses a second reminder for the same Resolved.
create function public.close_due_tasks(as_of timestamptz) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    due bigint;
    queued int;
  begin
    -- A Task someone is acting on right now is left for the next run.
    for due in
      select id from public.tasks
      where status = 'resolved' and closes_at <= as_of
      order by id
      for update skip locked
    loop
      perform private.move_task(due, 'done');
    end loop;

    insert into private.email_outbox (entry_id, recipient, kind)
      select
        (
          select max(e.id) from public.timeline_entries e
          where e.task_id = t.id and e.kind = 'moved' and e.status = 'resolved'
        ),
        t.customer_id, 'reminder'
      from public.tasks t, public.settings s
      where t.status = 'resolved'
        -- An Owner who is the Customer of their own Task cannot answer.
        and t.customer_id <> t.owner_id
        -- A removed Staff member gets no email (`claim_emails`): none is queued, run after run.
        and not exists (
          select from public.staff gone where gone.user_id = t.customer_id and gone.removed_at is not null
        )
        -- Not a Task past its time that the loop above left for the next run.
        and t.closes_at > as_of
        and t.closes_at - make_interval(hours => s.reminder_hours) <= as_of
      on conflict do nothing;
    get diagnostics queued = row_count;
    if queued > 0 then
      perform private.poke_send_emails();
    end if;
  end;
  $$;

revoke execute on function public.claim_emails(), public.close_due_tasks(timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_emails(), public.close_due_tasks(timestamptz) to service_role;

-- Every 15 minutes: a Task closes, and a reminder leaves, at most that much late and never early.
select cron.schedule('close-due-tasks', '*/15 * * * *', $$select public.close_due_tasks(now())$$);
