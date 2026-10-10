-- Take a Customer's access to Tasuku away (#42).

-- As with Staff (`staff.removed_at`), the record is kept: the Tasks and the Timelines still name
-- the Customer. It covers every Task they are on, not one. `removed_by` is who did it: an Owner
-- removes too, and only a Task Master gives the access back.
alter table public.customers
  add column removed_at timestamptz,
  add column removed_by uuid references public.staff (user_id),
  add constraint customers_removed_check check ((removed_at is null) = (removed_by is null));

-- "A Customer, not removed": the one place that answers it, as `private.is_staff()` does for
-- Staff. Every rule that lets a person act as the Customer of a Task asks this as well.
create function private.is_customer() returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.customers where user_id = (select auth.uid()) and removed_at is null
    );
  $$;

drop policy "a customer reads their tasks" on public.tasks;
create policy "a customer reads their tasks" on public.tasks
  for select to authenticated
  using (customer_id = (select auth.uid()) and (select private.is_customer()));

create or replace function private.is_customer_of(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_customer() and exists (
      select from public.tasks where id = task and customer_id = (select auth.uid())
    );
  $$;

create or replace function private.comments_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.writes_on_task(task) or (
      private.is_customer() and exists (
        select from public.tasks
        where id = task
          and private.is_unfinished(status)
          and customer_id = (select auth.uid())
      )
    );
  $$;

-- A Staff member removed as a Customer stays Staff, and no longer confirms, Reopens or cancels as
-- the Customer of any Task.
create or replace function private.acts_as_customer(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_customer() and exists (
      select from public.tasks
      where id = task
        and customer_id = (select auth.uid())
        and owner_id <> (select auth.uid())
    );
  $$;

-- A removed Customer reads nothing, their own record included: the app shows them what it shows
-- an email that was never added.
drop policy "staff read customers, a customer reads their own record" on public.customers;
create policy "staff read customers, a customer reads their own record" on public.customers
  for select to authenticated
  using ((select private.is_staff()) or (user_id = (select auth.uid()) and removed_at is null));

drop policy "a customer sets their own language" on public.customers;
create policy "a customer sets their own language" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()) and removed_at is null)
  with check (user_id = (select auth.uid()) and removed_at is null);

-- A Task Master removes any Customer; a Staff member removes a Customer who is on a Task they
-- own, in any status. Nothing is written on a Timeline and nobody is told.
-- A Customer who is also Staff is removed by a Task Master only, and every unfinished Task they
-- are the Customer of is closed with it: a Resolved one becomes Done, as it would have by itself,
-- the others get `final_status` (Done or Cancelled). They stay on those Tasks as Staff, and
-- nobody would be left to answer as the Customer.
-- TSK04: such a Task exists and no final status was chosen. Nothing is removed and no Task changes.
create function public.remove_customer(customer uuid, final_status text default null) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    gone timestamptz;
    also_staff boolean;
    t record;
  begin
    if not private.is_staff() then
      raise exception 'only Staff remove a Customer' using errcode = '42501';
    end if;
    -- Held until the end, so the Customer is not added to a Task (`set_customer`) meanwhile.
    select removed_at into gone from public.customers where user_id = customer for update;
    if not found then
      raise exception 'no such Customer' using errcode = 'P0002';
    end if;
    -- Held too, so they are not removed from Staff or brought back in the meantime.
    perform from public.staff where user_id = customer and removed_at is null for share;
    also_staff := found;
    if not (
      private.is_task_master()
      or (
        not also_staff
        and exists (
          select from public.tasks where customer_id = customer and owner_id = auth.uid()
        )
      )
    ) then
      raise exception 'only a Task Master, or the Owner of a Task this Customer is on, removes a Customer'
        using errcode = '42501';
    end if;
    if gone is not null then
      return;
    end if;

    if also_staff then
      for t in
        select id, status from public.tasks
        where customer_id = customer and private.is_unfinished(status)
        order by id
        for update
      loop
        if final_status is null or final_status not in ('done', 'cancelled') then
          raise exception 'choose Done or Cancelled for the unfinished Tasks of this Customer'
            using errcode = 'TSK04';
        end if;
        perform private.move_task(t.id, case when t.status = 'resolved' then 'done' else final_status end);
      end loop;
    end if;
    update public.customers set removed_at = now(), removed_by = auth.uid() where user_id = customer;
  end;
  $$;

-- Gives the access back: the Customer reads the Tasks they are on again. Tasks closed by the
-- removal stay closed.
create function public.restore_customer(customer uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if not private.is_task_master() then
      raise exception 'only a Task Master gives a Customer their access back' using errcode = '42501';
    end if;
    update public.customers set removed_at = null, removed_by = null where user_id = customer;
    if not found then
      raise exception 'no such Customer' using errcode = 'P0002';
    end if;
  end;
  $$;

-- As in #39, and: a removed Customer is not added to a Task.
-- TSK03: this Customer was removed. Only whoever chooses the Customer of this Task is told so.
create or replace function public.set_customer(task bigint, customer_email text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    address text := lower(btrim(customer_email));
    person uuid;
    present uuid;
    current_status text;
    gone timestamptz;
  begin
    -- The Task row is held before the caller is checked, so the Task cannot become final between
    -- the check and the change.
    select customer_id, status into present, current_status from public.tasks where id = task for update;
    select id into person from auth.users where email = address;
    if not private.manages_task(task) or current_status = 'resolved'
      or (present is not null and present is distinct from person) then
      raise exception 'only the Owner and a Task Master add a Customer, to a Task that has none and is not Resolved'
        using errcode = '42501';
    end if;
    if person is null then
      raise exception 'no account for this email' using errcode = 'TSK02';
    end if;
    if present is not null then
      return;
    end if;
    -- Held, so the Customer is not removed (`remove_customer`) between this check and the change.
    select removed_at into gone from public.customers where user_id = person for share;
    if gone is not null then
      raise exception 'this Customer was removed' using errcode = 'TSK03';
    end if;
    insert into public.customers (user_id, email) values (person, address)
      on conflict (user_id) do nothing;

    update public.tasks set customer_id = person where id = task;
    insert into public.timeline_entries (task_id, kind, author_id, customer_id)
      values (task, 'customer_added', auth.uid(), person);
  end;
  $$;

-- A Staff member who is removed is no longer the Customer of anything either (open since #8: they
-- still read such a Task and acted on it). Their Tasks stay as they are: they are not Staff any
-- more, so the Owner of each decides. Coming back as Staff (`register_staff`) does not give the
-- Customer's access back; a Task Master does that.
create or replace function public.remove_staff(staff_id uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    perform private.begin_staff_change();
    if private.is_last_task_master(staff_id) then
      raise exception 'the last Task Master cannot be removed' using errcode = 'TSK01';
    end if;
    update public.staff set removed_at = now(), is_task_master = false
      where user_id = staff_id and removed_at is null;
    if found then
      update public.customers set removed_at = now(), removed_by = auth.uid()
        where user_id = staff_id and removed_at is null;
    end if;
  end;
  $$;

-- As in #12, and: a removed Customer gets no email. What waits for them is dropped, unless they
-- are on that Task as Staff too (its Owner or a Collaborator); what only a Customer is sent is
-- dropped in any case.
create or replace function public.claim_emails()
  returns table (
    id bigint, kind text, task_id bigint, title text, email text, language text, actor text, hours int,
    owner text
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
              and not exists (
                select from public.customers k
                where k.user_id = o.recipient and k.user_id = t.customer_id and k.removed_at is null
              )
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
            or (
              o.kind in ('resolved', 'reminder', 'closed')
              and exists (
                select from public.customers k where k.user_id = o.recipient and k.removed_at is not null
              )
            )
            or (o.kind = 'assigned' and o.recipient <> t.owner_id)
            or (o.kind = 'unassigned' and o.recipient = t.owner_id)
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
      greatest(1, round(extract(epoch from t.closes_at - now()) / 3600))::int,
      case
        when to_staff.user_id is not null then coalesce(nullif(owned_by.name, ''), owned_by.email)
        else coalesce(nullif(owned_by.name, ''), 'PSP')
      end
    from claimed c
      join public.timeline_entries e on e.id = c.entry_id
      join public.tasks t on t.id = e.task_id
      join public.staff owned_by
        on owned_by.user_id = case when e.kind = 'owner_changed' then e.subject_id else t.owner_id end
      left join public.staff to_staff on to_staff.user_id = c.recipient
      left join public.customers to_customer on to_customer.user_id = c.recipient
      left join public.staff by_staff
        on by_staff.user_id = case when c.kind = 'closed' then t.owner_id else e.author_id end
      left join public.customers by_customer on by_customer.user_id = e.customer_id and e.author_id is null
    order by c.id;
  $$;

-- As in #11, and: a removed Customer is not reminded.
create or replace function public.close_due_tasks(as_of timestamptz) returns void
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
        and not exists (
          select from public.customers gone where gone.user_id = t.customer_id and gone.removed_at is not null
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

revoke execute on function
  private.is_customer(), public.remove_customer(uuid, text), public.restore_customer(uuid)
  from public, anon, authenticated;
grant execute on function
  private.is_customer(), public.remove_customer(uuid, text), public.restore_customer(uuid)
  to authenticated;
