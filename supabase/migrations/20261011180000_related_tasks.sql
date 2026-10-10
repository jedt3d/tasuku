-- Related Tasks (#41).

-- A second kind of link between Tasks, next to `tasks.earlier_task_id` ("carries on from": one,
-- from the new Task to the old one). Two Tasks are related by content: any number of them, with
-- no direction. One row per pair, the lower number first, so the same pair is not linked twice the
-- other way round and a Task is not linked to itself.
create table public.task_links (
  task_id bigint not null references public.tasks (id),
  related_task_id bigint not null references public.tasks (id),
  added_by uuid not null references public.staff (user_id),
  added_at timestamptz not null default now(),
  primary key (task_id, related_task_id),
  check (task_id < related_task_id)
);
create index task_links_related_task_id_idx on public.task_links (related_task_id);

alter table public.task_links enable row level security;

-- `added_by` is granted to nobody: the trigger below writes it. A link is added or taken away,
-- never changed.
revoke all on public.task_links from anon, authenticated;
grant select, delete on public.task_links to authenticated;
grant insert (task_id, related_task_id) on public.task_links to authenticated;
grant select, insert, update, delete on public.task_links to service_role;

-- The two Tasks can be named in either order, and the link is signed by whoever adds it. A link
-- written with the secret key names nobody and is refused.
create function private.sign_link() returns trigger
  language plpgsql set search_path = ''
  as $$
  declare
    first bigint := least(new.task_id, new.related_task_id);
  begin
    new.related_task_id := greatest(new.task_id, new.related_task_id);
    new.task_id := first;
    new.added_by := auth.uid();
    return new;
  end;
  $$;

create trigger sign_link
  before insert on public.task_links
  for each row
  execute function private.sign_link();

-- Every Staff member reads, adds and removes a link, on a Task in any status and whether they are
-- on it or not: a link changes nothing of the Task or its Timeline, and following a subject after
-- the work is finished is the point. A Customer neither reads nor writes one.
create policy "staff read links" on public.task_links
  for select to authenticated
  using ((select private.is_staff()));

create policy "staff add links" on public.task_links
  for insert to authenticated
  with check ((select private.is_staff()));

create policy "staff remove links" on public.task_links
  for delete to authenticated
  using ((select private.is_staff()));

-- The earlier Task of a Task is a detail writers change (#8), because it can be typed by hand.
-- The one a transfer wrote is not: the Transferred Task is final, and what carries it on is part
-- of its record.
create index timeline_entries_next_task_id_idx on public.timeline_entries (next_task_id)
  where next_task_id is not null;

create function private.keep_transferred_from() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if exists (select from public.timeline_entries where next_task_id = new.id) then
      raise exception 'a Task opened by a transfer keeps the Task it carries on'
        using errcode = '42501';
    end if;
    return new;
  end;
  $$;

create trigger keep_transferred_from
  before update of earlier_task_id on public.tasks
  for each row
  when (old.earlier_task_id is distinct from new.earlier_task_id)
  execute function private.keep_transferred_from();

-- As in #39, and: the Related Tasks of the old Task are those of the new one too, added by
-- whoever transfers. The old Task keeps its own. The two are not related to each other: the new
-- one carries the old one on.
create or replace function public.transfer_task(task bigint) returns bigint
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
    insert into public.task_links (task_id, related_task_id)
      select new_task, case when l.task_id = task then l.related_task_id else l.task_id end
      from public.task_links l
      where task in (l.task_id, l.related_task_id);

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

revoke execute on function private.sign_link(), private.keep_transferred_from()
  from public, anon, authenticated;
