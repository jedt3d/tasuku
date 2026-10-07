-- Closing and cancelling (#8).

-- A new Task can refer to an earlier one, so a problem that comes back is tracked as new work. It
-- is one of the details of a Task ("writers change details", #6). The number is all the Customer
-- of the new Task learns of the earlier one.
alter table public.tasks
  add column earlier_task_id bigint references public.tasks (id) check (earlier_task_id < id);
create index tasks_earlier_task_id_idx on public.tasks (earlier_task_id);
grant insert (earlier_task_id), update (earlier_task_id) on public.tasks to authenticated;

-- A 'moved' event names who moved the Task: a Staff member in `author_id`, a Customer in
-- `customer_id`, neither when Tasuku did it by itself.
alter table public.timeline_entries
  drop constraint timeline_entries_check,
  add constraint timeline_entries_check check (
    (kind in ('collaborator_added', 'collaborator_removed')) = (subject_id is not null)
    and case
      when kind = 'comment' then
        (author_id is null) <> (customer_id is null) and status is null
        and (body is null) = (deleted_at is not null)
        and (body is null or body ~ '\S')
      else
        body is null and deleted_at is null and (kind = 'moved') = (status is not null)
        and case
          when kind = 'moved' then author_id is null or customer_id is null
          else (kind in ('customer_added', 'customer_removed')) = (customer_id is not null)
        end
    end
  );

-- Who confirms, Reopens and cancels as the Customer of a Task. A Staff member whose email is the
-- Customer does too, unless they own the Task: an Owner does not confirm their own proposal.
create function private.acts_as_customer(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.tasks
      where id = task
        and customer_id = (select auth.uid())
        and owner_id <> (select auth.uid())
    );
  $$;

-- Sets the status and writes the event. The caller has been checked by the function that calls
-- this. As with a comment (`private.sign_comment`), a Staff member moves a Task as Staff.
create function private.move_task(task bigint, new_status text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    staff boolean := private.is_staff();
  begin
    update public.tasks set status = new_status where id = task;
    insert into public.timeline_entries (task_id, kind, status, author_id, customer_id)
      values (
        task, 'moved', new_status,
        case when staff then auth.uid() end,
        case when not staff then auth.uid() end
      );
  end;
  $$;

-- Each function below holds the Task row before it checks the caller, so the status and the
-- Customer it decides on cannot change under it. Done and Cancelled are final: no function
-- accepts a Task in either.

-- The Owner proposes closing the Task. A Task Master may act on any Task.
create function public.resolve_task(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
  begin
    select * into t from public.tasks where id = task for update;
    if (private.manages_task(task) and t.status = 'in_progress') is not true then
      raise exception 'only the Owner and a Task Master resolve a Task in progress'
        using errcode = '42501';
    end if;
    perform private.move_task(task, 'resolved');
  end;
  $$;

-- Done. The Customer says so at any time before the Task is closed. The Owner does only when
-- there is no Customer to confirm. A Task Master confirms a Resolved Task, so none is ever stuck.
create function public.complete_task(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
  begin
    select * into t from public.tasks where id = task for update;
    if (
      (private.acts_as_customer(task) and t.status in ('open', 'in_progress', 'resolved'))
      or (
        private.manages_task(task)
        and (
          (t.customer_id is null and t.owner_id = auth.uid())
          or (private.is_task_master() and t.status = 'resolved')
        )
      )
    ) is not true then
      raise exception 'this Task is not yours to mark Done' using errcode = '42501';
    end if;
    perform private.move_task(task, 'done');
  end;
  $$;

-- Reopen: the proposed closure is not accepted, and work continues.
create function public.reopen_task(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
  begin
    select * into t from public.tasks where id = task for update;
    if (
      t.status = 'resolved'
      and (private.acts_as_customer(task) or (private.manages_task(task) and private.is_task_master()))
    ) is not true then
      raise exception 'only the Customer and a Task Master Reopen a Resolved Task'
        using errcode = '42501';
    end if;
    perform private.move_task(task, 'in_progress');
  end;
  $$;

-- Once a Task is Resolved the only choices are Done and Reopen.
create function public.cancel_task(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
  begin
    select * into t from public.tasks where id = task for update;
    if (
      t.status in ('open', 'in_progress')
      and (private.acts_as_customer(task) or private.manages_task(task))
    ) is not true then
      raise exception 'only the Customer, the Owner and a Task Master cancel a Task, before it is Resolved'
        using errcode = '42501';
    end if;
    perform private.move_task(task, 'cancelled');
  end;
  $$;

revoke execute on function
  private.acts_as_customer(bigint), private.move_task(bigint, text),
  public.resolve_task(bigint), public.complete_task(bigint), public.reopen_task(bigint),
  public.cancel_task(bigint)
  from public, anon, authenticated;
grant execute on function
  public.resolve_task(bigint), public.complete_task(bigint), public.reopen_task(bigint),
  public.cancel_task(bigint)
  to authenticated;
