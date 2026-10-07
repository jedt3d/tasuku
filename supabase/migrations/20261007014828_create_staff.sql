-- Staff: the people a Task Master has registered. Being signed in is not enough to be Staff.
-- The first Task Master is seeded (app/scripts/seed.mjs); later ones come through the invite function (#3).
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  is_task_master boolean not null default false,
  language text not null default 'en' check (language in ('en', 'th', 'ja'))
);

alter table public.staff enable row level security;

-- Default privileges would hand every column to the API roles; give back only what the app needs.
revoke all on public.staff from anon, authenticated;
grant select on public.staff to authenticated;
grant update (language) on public.staff to authenticated;

create policy "staff read own record" on public.staff
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "staff set own language" on public.staff
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The seed step and the invite function (#3) write here with the secret key. Stated outright because
-- a project can be set not to grant new tables to the API roles automatically.
grant select, insert, update, delete on public.staff to service_role;
