-- Customer on a Task (#7).

-- A Customer is a person outside PSP whom a Staff member has added to a Task by email. The record
-- is shared by every Task they are on, and its emails are what "add a Customer" offers again.
-- The account itself is created by the invite function (ADR 0003).
create table public.customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  -- Optional, and chosen by Staff: it need not match the domain of the email.
  organization_id bigint references public.organizations (id),
  language text not null default 'en' check (language in ('en', 'th', 'ja')),
  created_at timestamptz not null default now()
);
create index customers_organization_id_idx on public.customers (organization_id);

alter table public.customers enable row level security;

-- A column privilege belongs to a role, not to a policy: a Customer sets their own language here,
-- so the Organization, which Staff decide, is set through a function below.
revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;
grant update (language) on public.customers to authenticated;
grant select, insert, update, delete on public.customers to service_role;

create policy "staff read customers, a customer reads their own record" on public.customers
  for select to authenticated
  using ((select private.is_staff()) or user_id = (select auth.uid()));

create policy "a customer sets their own language" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A Task holds at most one Customer: one column, so a second cannot exist. It is granted to
-- nobody and changes only through the functions below.
alter table public.tasks add column customer_id uuid references public.customers (user_id);
create index tasks_customer_id_idx on public.tasks (customer_id);

-- Access is per Task and nothing else: not the Organization, not having been its Customer before.
create policy "a customer reads their tasks" on public.tasks
  for select to authenticated
  using (customer_id = (select auth.uid()));

create function private.is_customer_of(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.tasks where id = task and customer_id = (select auth.uid())
    );
  $$;

-- The Timeline is the only part of a Task its Customer sees besides the Task itself.
create policy "a customer reads the timeline of their tasks" on public.timeline_entries
  for select to authenticated
  using (private.is_customer_of(task_id));

-- `customer_id` names the Customer an entry is by or about: the author of a comment a Customer
-- wrote, and the person a 'customer_added' or 'customer_removed' event concerns (`author_id` is
-- then the Staff member who did it). A comment has one author: a Staff member or a Customer.
alter table public.timeline_entries
  add column customer_id uuid references public.customers (user_id),
  drop constraint timeline_entries_kind_check,
  drop constraint timeline_entries_check,
  add constraint timeline_entries_kind_check check (
    kind in (
      'comment', 'opened', 'moved', 'collaborator_added', 'collaborator_removed',
      'customer_added', 'customer_removed'
    )
  ),
  add constraint timeline_entries_check check (
    (kind in ('collaborator_added', 'collaborator_removed')) = (subject_id is not null)
    and case
      when kind = 'comment' then
        (author_id is null) <> (customer_id is null) and status is null
        and (body is null) = (deleted_at is not null)
        and (body is null or body ~ '\S')
      else
        body is null and deleted_at is null and (kind = 'moved') = (status is not null)
        and (kind in ('customer_added', 'customer_removed')) = (customer_id is not null)
    end
  );

-- Puts the person with this email on the Task as its Customer, in place of the one before. The
-- Owner and a Task Master decide who is on a Task (`private.manages_task`, #6).
-- TSK02: the email has no account yet. The invite function then creates one and calls again; the
-- caller has been checked by then, so nobody else makes Tasuku create an account.
create function public.set_customer(task bigint, customer_email text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    address text := lower(btrim(customer_email));
    person uuid;
    previous uuid;
  begin
    if not private.manages_task(task) then
      raise exception 'only the Owner and a Task Master choose the Customer' using errcode = '42501';
    end if;
    select id into person from auth.users where email = address;
    if person is null then
      raise exception 'no account for this email' using errcode = 'TSK02';
    end if;
    insert into public.customers (user_id, email) values (person, address)
      on conflict (user_id) do nothing;

    select customer_id into previous from public.tasks where id = task for update;
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

-- Takes the Customer off the Task, for one added by mistake: they stop reading it at once.
create function public.remove_customer(task bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    previous uuid;
  begin
    if not private.manages_task(task) then
      raise exception 'only the Owner and a Task Master choose the Customer' using errcode = '42501';
    end if;
    select customer_id into previous from public.tasks where id = task for update;
    if previous is null then
      return;
    end if;
    update public.tasks set customer_id = null where id = task;
    insert into public.timeline_entries (task_id, kind, author_id, customer_id)
      values (task, 'customer_removed', auth.uid(), previous);
  end;
  $$;

-- An Organization is a label and grants no access, so every Staff member sets a Customer's.
create function public.set_customer_organization(customer uuid, organization bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if not private.is_staff() then
      raise exception 'only Staff set the Organization of a Customer' using errcode = '42501';
    end if;
    update public.customers set organization_id = organization where user_id = customer;
    if not found then
      raise exception 'no such Customer' using errcode = 'P0002';
    end if;
  end;
  $$;

-- A Customer reads nothing of `staff`. This gives them the names, and only the names, of the Staff
-- who appear on their Task: its Owner, and whoever a Timeline entry is by or about. A name is ''
-- until that Staff member sets one; their email is never given.
create function public.staff_on_task(task bigint) returns table (user_id uuid, name text)
  language sql stable security definer set search_path = ''
  as $$
    select s.user_id, s.name from public.staff s
    where private.is_customer_of(task)
      and (
        s.user_id = (select t.owner_id from public.tasks t where t.id = task)
        or exists (
          select from public.timeline_entries e
          where e.task_id = task and s.user_id in (e.author_id, e.subject_id)
        )
      );
  $$;

revoke execute on function
  private.is_customer_of(bigint), public.set_customer(bigint, text), public.remove_customer(bigint),
  public.set_customer_organization(uuid, bigint), public.staff_on_task(bigint)
  from public, anon, authenticated;
grant execute on function
  private.is_customer_of(bigint), public.set_customer(bigint, text), public.remove_customer(bigint),
  public.set_customer_organization(uuid, bigint), public.staff_on_task(bigint)
  to authenticated;

-- Who comments on a Task: whoever writes on it (#6), and its Customer, until it is Done or
-- Cancelled. The Customer is not in `private.writes_on_task`, which also opens the details of the
-- Task to change.
create function private.comments_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.writes_on_task(task) or exists (
      select from public.tasks
      where id = task
        and status not in ('done', 'cancelled')
        and customer_id = (select auth.uid())
    );
  $$;

-- Says who wrote a comment; nobody chooses that through the API. A Staff member who is also the
-- Customer of the Task writes as Staff.
create function private.sign_comment() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if private.is_staff() then
      new.author_id := auth.uid();
      new.customer_id := null;
    else
      new.author_id := null;
      new.customer_id := (select user_id from public.customers where user_id = auth.uid());
    end if;
    return new;
  end;
  $$;

create trigger sign_comment
  before insert on public.timeline_entries
  for each row
  when (new.kind = 'comment')
  execute function private.sign_comment();

drop policy "writers comment" on public.timeline_entries;
create policy "writers and the customer comment" on public.timeline_entries
  for insert to authenticated
  with check (
    kind = 'comment'
    and coalesce(author_id, customer_id) = (select auth.uid())
    and private.comments_on_task(task_id)
  );

-- As before (#5), for whoever the author is: only while they may still comment on the Task, so
-- not once a Customer has been replaced.
drop policy "authors edit for 15 minutes" on public.timeline_entries;
create policy "authors edit for 15 minutes" on public.timeline_entries
  for update to authenticated
  using (
    kind = 'comment'
    and coalesce(author_id, customer_id) = (select auth.uid())
    and deleted_at is null
    and created_at > now() - interval '15 minutes'
    and private.comments_on_task(task_id)
  );

-- Only a Staff comment starts an Open Task: a Customer's comment does not say that work has begun.
drop trigger start_task_on_comment on public.timeline_entries;
create trigger start_task_on_comment
  after insert on public.timeline_entries
  for each row
  when (new.kind = 'comment' and new.author_id is not null)
  execute function private.start_task_on_comment();

revoke execute on function private.comments_on_task(bigint), private.sign_comment()
  from public, anon, authenticated;
grant execute on function private.comments_on_task(bigint) to authenticated;
