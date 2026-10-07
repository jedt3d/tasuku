-- A Task Master registers Staff, removes them, and promotes or demotes Task Masters (#3).

-- Removing a Staff member keeps the record, so that Tasks they owned can still name them and be
-- reassigned. Every rule that asks "is this person Staff?" must also ask that this is null.
alter table public.staff add column removed_at timestamptz;

-- Not exposed through the API. The functions here run as their owner because a policy on `staff`
-- that read `staff` under the caller's own rights would recurse.
create schema private;
grant usage on schema private to authenticated;

create function private.is_staff() returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.staff where user_id = (select auth.uid()) and removed_at is null
    );
  $$;

create function private.is_task_master() returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.staff
      where user_id = (select auth.uid()) and removed_at is null and is_task_master
    );
  $$;

-- Staff read every Staff record, removed ones included: an Owner chooses Collaborators from this
-- list, and it names the people on Tasks. A removed person reads nothing.
drop policy "staff read own record" on public.staff;
create policy "staff read staff" on public.staff
  for select to authenticated
  using ((select private.is_staff()));

drop policy "staff set own language" on public.staff;
create policy "staff set own language" on public.staff
  for update to authenticated
  using ((select auth.uid()) = user_id and removed_at is null)
  with check ((select auth.uid()) = user_id and removed_at is null);

-- The role and the removal are changed only through the functions below, never by writing the
-- columns: a column privilege belongs to a role, not to a policy, so granting `is_task_master` to
-- `authenticated` would let any Staff member promote themselves through the language policy.

-- Holds off every other change to `staff` until the transaction ends, then refuses the caller
-- unless they are a Task Master. The lock comes first: a Task Master who was removed while waiting
-- for it must be refused, and two Task Masters must not stand each other down at the same moment.
-- ponytail: a table lock, fine for about 10 Staff; lock only the Task Master rows if that grows.
create function private.begin_staff_change() returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    lock table public.staff in share row exclusive mode;
    if not private.is_task_master() then
      raise exception 'only a Task Master manages Staff' using errcode = '42501';
    end if;
  end;
  $$;

create function private.is_last_task_master(staff_id uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select not exists (
      select from public.staff
      where is_task_master and removed_at is null and user_id <> staff_id
    ) and exists (
      select from public.staff
      where is_task_master and removed_at is null and user_id = staff_id
    );
  $$;

-- TSK01: the app shows its own message for "this is the last Task Master".
create function public.set_task_master(staff_id uuid, value boolean) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    perform private.begin_staff_change();
    if not value and private.is_last_task_master(staff_id) then
      raise exception 'the last Task Master cannot be demoted' using errcode = 'TSK01';
    end if;
    update public.staff set is_task_master = value
      where user_id = staff_id and removed_at is null;
    if not found then
      raise exception 'no such Staff member' using errcode = 'P0002';
    end if;
  end;
  $$;

create function public.remove_staff(staff_id uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    perform private.begin_staff_change();
    if private.is_last_task_master(staff_id) then
      raise exception 'the last Task Master cannot be removed' using errcode = 'TSK01';
    end if;
    update public.staff set removed_at = now(), is_task_master = false
      where user_id = staff_id and removed_at is null;
  end;
  $$;

-- Called by the invite function with the secret key, after it has created the account (ADR 0003).
-- Registers the email as Staff, or brings a removed Staff member back as plain Staff.
create function public.register_staff(staff_email text) returns uuid
  language sql security definer set search_path = ''
  as $$
    insert into public.staff (user_id, email)
      select id, email from auth.users where email = lower(trim(staff_email))
    on conflict (user_id) do update set removed_at = null
    returning user_id;
  $$;

-- Functions are executable by everyone unless that is taken away.
revoke execute on function
  private.is_staff(), private.is_task_master(), private.begin_staff_change(),
  private.is_last_task_master(uuid), public.set_task_master(uuid, boolean),
  public.remove_staff(uuid), public.register_staff(text)
  from public, anon, authenticated;
grant execute on function
  private.is_staff(), private.is_task_master(),
  public.set_task_master(uuid, boolean), public.remove_staff(uuid)
  to authenticated;
grant execute on function public.register_staff(text) to service_role;
