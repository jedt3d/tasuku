-- Transfer a Task instead of replacing its Customer (#39).

-- The Customer of a Task is never replaced or taken off. When the work goes on with someone else,
-- the Owner or a Task Master transfers the Task: a new Task carries it on, and the old one becomes
-- Transferred, a third final status. The old Task stays as the record of who read it.
alter table public.tasks
  drop constraint tasks_status_check,
  add constraint tasks_status_check
    check (status in ('open', 'in_progress', 'resolved', 'done', 'cancelled', 'transferred'));

-- "Unfinished" (CONTEXT.md): not Done, Cancelled or Transferred. The one place that lists them;
-- the app has its own in `app/src/lib/status.js`.
create function private.is_unfinished(status text) returns boolean
  language sql immutable set search_path = ''
  as $$
    select status not in ('done', 'cancelled', 'transferred');
  $$;

-- As in #6 and #7, asking the function above.
create or replace function private.manages_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_staff() and exists (
      select from public.tasks
      where id = task
        and private.is_unfinished(status)
        and (owner_id = (select auth.uid()) or private.is_task_master())
    );
  $$;

create or replace function private.writes_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_staff() and exists (
      select from public.tasks
      where id = task
        and private.is_unfinished(status)
        and (
          owner_id = (select auth.uid())
          or private.is_task_master()
          or exists (
            select from public.task_collaborators c
            where c.task_id = task and c.staff_id = (select auth.uid())
          )
        )
    );
  $$;

create or replace function private.comments_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.writes_on_task(task) or exists (
      select from public.tasks
      where id = task
        and private.is_unfinished(status)
        and customer_id = (select auth.uid())
    );
  $$;

-- The event that makes a Task Transferred is a 'moved' like any change of status, and names the
-- Task that carries it on in `next_task_id`. The Customer of the old Task reads the number and
-- nothing else of the new Task.
-- 'opened' may now name two people: whoever opened the Task (`author_id`) and, when that is a
-- Task Master transferring someone else's Task, its Owner (`subject_id`).
alter table public.timeline_entries
  add column next_task_id bigint references public.tasks (id),
  drop constraint timeline_entries_check,
  add constraint timeline_entries_check check (
    (kind = 'opened' or (kind in ('collaborator_added', 'collaborator_removed', 'owner_changed')) = (subject_id is not null))
    and (next_task_id is not null) = (status is not distinct from 'transferred')
    and (has_files = false or kind = 'comment')
    and case
      when kind = 'comment' then
        (author_id is null) <> (customer_id is null) and status is null
        and case
          when deleted_at is not null then body is null
          else body is not null or has_files
        end
        and (body is null or body ~ '\S')
      else
        body is null and deleted_at is null and (kind = 'moved') = (status is not null)
        and case
          when kind = 'moved' then author_id is null or customer_id is null
          else (kind in ('customer_added', 'customer_removed')) = (customer_id is not null)
        end
    end
  );

-- As in #5, and: the Owner is named apart when someone else opened the Task for them. A Task
-- written with the secret key has nobody signed in, and is its Owner's.
create or replace function private.record_task_opened() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  declare
    opener uuid := coalesce(auth.uid(), new.owner_id);
  begin
    insert into public.timeline_entries (task_id, kind, author_id, subject_id, created_at)
      values (new.id, 'opened', opener, nullif(new.owner_id, opener), new.created_at);
    return null;
  end;
  $$;

-- One more email: 'transferred', to the Owner whose Task a Task Master transferred.
alter table private.email_outbox
  drop constraint email_outbox_kind_check,
  add constraint email_outbox_kind_check check (
    kind in (
      'added', 'comment', 'resolved', 'cancelled', 'reminder', 'closed', 'assigned', 'unassigned',
      'transferred'
    )
  );

-- Opens the Task that carries `task` on and returns its number. The new Task is the old one in
-- everything but the Customer: it has none until one is added, it is Open, and its Timeline
-- starts over. Files stay on the old Task. A Resolved Task is Reopened first.
create function public.transfer_task(task bigint) returns bigint
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
    new_task bigint;
    person uuid;
  begin
    -- The Task row is held before the caller is checked, as everywhere since #7.
    select * into t from public.tasks where id = task for update;
    if (private.manages_task(task) and t.status in ('open', 'in_progress')) is not true then
      raise exception 'only the Owner and a Task Master transfer a Task, while it is Open or In progress'
        using errcode = '42501';
    end if;

    insert into public.tasks (title, description, due_date, organization_id, owner_id, earlier_task_id)
      values (t.title, t.description, t.due_date, t.organization_id, t.owner_id, task)
      returning id into new_task;
    -- Each Collaborator is added as on any Task: an event, and the "added" email (#10), also for
    -- one removed from Staff, who keeps their place (#6) and gets no email (`claim_emails`). One
    -- at a time, each with its own time, so they are listed in the order they had.
    for person in
      select c.staff_id from public.task_collaborators c where c.task_id = task order by c.added_at
    loop
      insert into public.task_collaborators (task_id, staff_id, added_at)
        values (new_task, person, clock_timestamp());
    end loop;

    update public.tasks set status = 'transferred' where id = task;
    insert into public.timeline_entries (task_id, kind, status, author_id, next_task_id)
      values (task, 'moved', 'transferred', auth.uid(), new_task);

    -- Nobody is told of what they did themselves (#10). The email hangs on the 'opened' event of
    -- the new Task, so it names who transferred and links to the Task that goes on.
    insert into private.email_outbox (entry_id, recipient, kind)
      select e.id, t.owner_id, 'transferred'
      from public.timeline_entries e
      where e.task_id = new_task and e.kind = 'opened' and t.owner_id <> auth.uid()
        and exists (select from public.staff s where s.user_id = t.owner_id and s.removed_at is null);
    if found then
      perform private.poke_send_emails();
    end if;
    return new_task;
  end;
  $$;

-- Fills the empty place of a Task, and nothing else: a Task that has a Customer is transferred
-- instead. That refusal comes before TSK02, so the invite function makes no account for an email
-- that would be refused anyway. Naming the Customer the Task already has changes nothing, as before.
create or replace function public.set_customer(task bigint, customer_email text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    address text := lower(btrim(customer_email));
    person uuid;
    present uuid;
    current_status text;
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
    insert into public.customers (user_id, email) values (person, address)
      on conflict (user_id) do nothing;

    if present is not null then
      return;
    end if;
    update public.tasks set customer_id = person where id = task;
    insert into public.timeline_entries (task_id, kind, author_id, customer_id)
      values (task, 'customer_added', auth.uid(), person);
  end;
  $$;

-- Nobody takes a Customer off a Task. 'customer_removed' stays a kind of event: Timelines written
-- before this hold it.
drop function public.remove_customer(bigint);

-- As in #12, asking `private.is_unfinished`.
create or replace function public.reassign_task(task bigint, new_owner uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
    entry bigint;
    queued int;
  begin
    -- The Task row is held before the caller is checked, as everywhere since #7.
    select * into t from public.tasks where id = task for update;
    if (private.is_task_master() and private.is_unfinished(t.status)) is not true then
      raise exception 'only a Task Master reassigns a Task, while it is unfinished'
        using errcode = '42501';
    end if;
    if new_owner = t.owner_id then
      return;
    end if;
    -- Held too, so the new Owner is not removed from Staff (`remove_staff`) in the meantime.
    perform from public.staff where user_id = new_owner and removed_at is null for share;
    if not found or new_owner is not distinct from t.customer_id then
      raise exception 'the new Owner is Staff, and not the Customer of the Task' using errcode = '42501';
    end if;

    update public.tasks set owner_id = new_owner where id = task;
    -- A Staff member is the Owner or a Collaborator, never both. The previous Owner becomes a
    -- Collaborator even when removed from Staff: like any removed Collaborator (#6) they keep
    -- their place, and collaborate again once added back.
    perform set_config('tasuku.reassigning', 'on', true);
    delete from public.task_collaborators where task_id = task and staff_id = new_owner;
    insert into public.task_collaborators (task_id, staff_id) values (task, t.owner_id);
    perform set_config('tasuku.reassigning', '', true);
    insert into public.timeline_entries (task_id, kind, author_id, subject_id)
      values (task, 'owner_changed', auth.uid(), new_owner)
      returning id into entry;

    -- The event alone does not name the previous Owner, so the emails are queued here and not by
    -- `private.queue_emails`. Nobody is told of what they did themselves (#10).
    insert into private.email_outbox (entry_id, recipient, kind)
      select entry, person, mail
      from (values (new_owner, 'assigned'), (t.owner_id, 'unassigned')) as told (person, mail)
      where person <> auth.uid()
        and exists (select from public.staff s where s.user_id = person and s.removed_at is null);
    get diagnostics queued = row_count;
    if queued > 0 then
      perform private.poke_send_emails();
    end if;
  end;
  $$;

revoke execute on function private.is_unfinished(text), public.transfer_task(bigint)
  from public, anon, authenticated;
grant execute on function public.transfer_task(bigint) to authenticated;
