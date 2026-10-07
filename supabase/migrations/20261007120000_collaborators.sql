-- Collaborators (#6).

-- A Staff member is on a Task as its Owner or as one of its Collaborators, never both.
create table public.task_collaborators (
  task_id bigint not null references public.tasks (id),
  staff_id uuid not null references public.staff (user_id),
  added_at timestamptz not null default now(),
  primary key (task_id, staff_id)
);
create index task_collaborators_staff_idx on public.task_collaborators (staff_id);

alter table public.task_collaborators enable row level security;

revoke all on public.task_collaborators from anon, authenticated;
grant select, delete on public.task_collaborators to authenticated;
grant insert (task_id, staff_id) on public.task_collaborators to authenticated;
grant select, insert, update, delete on public.task_collaborators to service_role;

-- Who decides who is on a Task: its Owner and a Task Master, until it is Done or Cancelled.
-- Closing, cancelling and the Customer (#7, #8) follow the same rule.
create function private.manages_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_staff() and exists (
      select from public.tasks
      where id = task
        and status not in ('done', 'cancelled')
        and (owner_id = (select auth.uid()) or private.is_task_master())
    );
  $$;

-- Who can be added: Staff who have not been removed, other than the Owner.
create function private.can_collaborate(task bigint, person uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (select from public.staff where user_id = person and removed_at is null)
      and not exists (select from public.tasks where id = task and owner_id = person);
  $$;

-- Collaborators now write on a Task (#5 left this place for them).
create or replace function private.writes_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_staff() and exists (
      select from public.tasks
      where id = task
        and status not in ('done', 'cancelled')
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

create policy "staff read collaborators" on public.task_collaborators
  for select to authenticated
  using ((select private.is_staff()));

create policy "owner and task master add collaborators" on public.task_collaborators
  for insert to authenticated
  with check (private.manages_task(task_id) and private.can_collaborate(task_id, staff_id));

create policy "owner and task master remove collaborators" on public.task_collaborators
  for delete to authenticated
  using (private.manages_task(task_id));

-- The details of a Task follow the one rule for writing on it, so Collaborators edit them too.
-- The status and the Owner stay out of everyone's reach: those columns are granted to nobody (#4).
drop policy "owner and task master change details" on public.tasks;
create policy "writers change details" on public.tasks
  for update to authenticated
  using (private.writes_on_task(id));

-- Adding and removing a Collaborator are events on the Timeline. `subject_id` names the Staff
-- member the event is about; `author_id` is who did it.
alter table public.timeline_entries
  add column subject_id uuid references public.staff (user_id),
  drop constraint timeline_entries_kind_check,
  drop constraint timeline_entries_check,
  add constraint timeline_entries_kind_check
    check (kind in ('comment', 'opened', 'moved', 'collaborator_added', 'collaborator_removed')),
  add constraint timeline_entries_check check (
    (kind in ('collaborator_added', 'collaborator_removed')) = (subject_id is not null)
    and case kind
      when 'comment' then
        author_id is not null and status is null
        and (body is null) = (deleted_at is not null)
        and (body is null or body ~ '\S')
      else body is null and deleted_at is null and (kind = 'moved') = (status is not null)
    end
  );

create function private.record_collaborator_change() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if tg_op = 'INSERT' then
      insert into public.timeline_entries (task_id, kind, author_id, subject_id)
        values (new.task_id, 'collaborator_added', auth.uid(), new.staff_id);
    else
      insert into public.timeline_entries (task_id, kind, author_id, subject_id)
        values (old.task_id, 'collaborator_removed', auth.uid(), old.staff_id);
    end if;
    return null;
  end;
  $$;

create trigger record_collaborator_change
  after insert or delete on public.task_collaborators
  for each row
  execute function private.record_collaborator_change();

-- The Tasks the caller is part of: the ones they own and the ones they collaborate on. It runs as
-- the caller, so Row Level Security still decides what they read.
create function public.my_tasks() returns setof public.tasks
  language sql stable set search_path = ''
  as $$
    select t.* from public.tasks t
    where t.owner_id = (select auth.uid())
      or exists (
        select from public.task_collaborators c
        where c.task_id = t.id and c.staff_id = (select auth.uid())
      );
  $$;

revoke execute on function
  private.manages_task(bigint), private.can_collaborate(bigint, uuid),
  private.record_collaborator_change(), public.my_tasks()
  from public, anon, authenticated;
grant execute on function
  private.manages_task(bigint), private.can_collaborate(bigint, uuid), public.my_tasks()
  to authenticated;
