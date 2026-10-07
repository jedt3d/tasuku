-- Staff open and browse Tasks (#4).

-- A Staff member is shown by name on a Task; until they set one, the app shows their email.
alter table public.staff
  add column name text not null default '' check (char_length(name) <= 80);
grant update (name) on public.staff to authenticated;
alter policy "staff set own language" on public.staff rename to "staff change own record";

-- The number is what people say to each other ("Task 42") and what the address of a Task carries.
create table public.tasks (
  id bigint generated always as identity primary key,
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  description text not null check (btrim(description) <> ''),
  due_date date,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'done', 'cancelled')),
  -- Whoever opens a Task is its Owner. A removed Staff member's record stays, so this still names them.
  owner_id uuid not null default auth.uid() references public.staff (user_id),
  created_at timestamptz not null default now()
);
create index tasks_owner_id_idx on public.tasks (owner_id);

alter table public.tasks enable row level security;

-- A column privilege belongs to a role, not to a policy: `status` and `owner_id` are granted to
-- nobody, so they change only through functions (#5, #8, #12). A Task is never deleted.
revoke all on public.tasks from anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (title, description, due_date) on public.tasks to authenticated;
grant update (title, description, due_date) on public.tasks to authenticated;
grant select, insert, update, delete on public.tasks to service_role;

create policy "staff read tasks" on public.tasks
  for select to authenticated
  using ((select private.is_staff()));

create policy "staff open tasks" on public.tasks
  for insert to authenticated
  with check ((select private.is_staff()) and owner_id = (select auth.uid()));

-- Collaborators join this rule when they exist (#6).
create policy "owner and task master change details" on public.tasks
  for update to authenticated
  using (
    (select private.is_staff())
    and (owner_id = (select auth.uid()) or (select private.is_task_master()))
  )
  with check (
    (select private.is_staff())
    and (owner_id = (select auth.uid()) or (select private.is_task_master()))
  );
