-- Organizations (#7).

-- The outside company a Task is for. It is a label for grouping and grants no access, so every
-- Staff member creates one. Nobody renames or deletes one yet.
create table public.organizations (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '\S' and name = btrim(name) and char_length(name) <= 120),
  created_at timestamptz not null default now()
);
-- "PSP Hospital" and "psp hospital" are one Organization.
create unique index organizations_name_idx on public.organizations (lower(name));

alter table public.organizations enable row level security;

revoke all on public.organizations from anon, authenticated;
grant select on public.organizations to authenticated;
grant insert (name) on public.organizations to authenticated;
grant select, insert, update, delete on public.organizations to service_role;

create policy "staff read organizations" on public.organizations
  for select to authenticated
  using ((select private.is_staff()));

create policy "staff create organizations" on public.organizations
  for insert to authenticated
  with check ((select private.is_staff()));

-- A Task relates to at most one Organization; with none it is internal work. It is one of the
-- details of a Task, so whoever writes on the Task changes it ("writers change details", #6).
alter table public.tasks add column organization_id bigint references public.organizations (id);
create index tasks_organization_id_idx on public.tasks (organization_id);
grant insert (organization_id), update (organization_id) on public.tasks to authenticated;
