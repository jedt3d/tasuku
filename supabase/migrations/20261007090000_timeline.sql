-- Timeline comments (#5).

-- One table holds the whole Timeline of a Task, comments and events alike, so reading it in time
-- order is one query. Entries are never deleted: a comment a Task Master deletes stays as a marker.
create table public.timeline_entries (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id),
  -- 'opened' and 'moved' are events. Later issues add their own kinds to this list.
  kind text not null default 'comment' check (kind in ('comment', 'opened', 'moved')),
  -- Who wrote the comment or caused the event; null when Tasuku did it by itself. A Customer
  -- cannot be named here yet (#7).
  author_id uuid default auth.uid() references public.staff (user_id),
  -- Kept exactly as written. Null on an event, and on a comment once it is deleted.
  body text check (char_length(body) <= 10000),
  -- On 'moved': the status the Task moved to.
  status text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.staff (user_id),
  check (
    case kind
      when 'comment' then
        author_id is not null and status is null
        and (body is null) = (deleted_at is not null)
        and (body is null or body ~ '\S')
      else body is null and deleted_at is null and (kind = 'moved') = (status is not null)
    end
  )
);
create index timeline_entries_task_idx on public.timeline_entries (task_id, created_at, id);

alter table public.timeline_entries enable row level security;

-- Only the text of a comment is ever written through the API. Everything else is set by a default
-- or by a function below, so nobody writes an event, another author or another time.
revoke all on public.timeline_entries from anon, authenticated;
grant select on public.timeline_entries to authenticated;
grant insert (task_id, body) on public.timeline_entries to authenticated;
grant update (body) on public.timeline_entries to authenticated;
grant select, insert, update, delete on public.timeline_entries to service_role;

-- Who writes on a Task: its Owner and a Task Master, until it is Done or Cancelled. Collaborators
-- (#6) and the Customer (#7) join here.
create function private.writes_on_task(task bigint) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select private.is_staff() and exists (
      select from public.tasks
      where id = task
        and status not in ('done', 'cancelled')
        and (owner_id = (select auth.uid()) or private.is_task_master())
    );
  $$;

create policy "staff read the timeline" on public.timeline_entries
  for select to authenticated
  using ((select private.is_staff()));

create policy "writers comment" on public.timeline_entries
  for insert to authenticated
  with check (
    kind = 'comment'
    and author_id = (select auth.uid())
    and private.writes_on_task(task_id)
  );

-- The 15 minutes are counted here, not in the app (spec #1). With no `with check`, the same rule
-- is applied to the row as it would be after the change.
create policy "authors edit for 15 minutes" on public.timeline_entries
  for update to authenticated
  using (
    kind = 'comment'
    and author_id = (select auth.uid())
    and deleted_at is null
    and created_at > now() - interval '15 minutes'
    and private.writes_on_task(task_id)
  );

create function private.stamp_comment_edit() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    new.edited_at := now();
    return new;
  end;
  $$;

create trigger stamp_comment_edit
  before update of body on public.timeline_entries
  for each row
  when (new.body is distinct from old.body and new.deleted_at is null)
  execute function private.stamp_comment_edit();

-- The first Staff comment on an Open Task starts it. Every author is Staff today; a Customer's
-- comment must leave the Task Open (#7). Two first comments at the same moment wait for each other
-- on the Task row, so only one of them writes the event.
create function private.start_task_on_comment() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    update public.tasks set status = 'in_progress' where id = new.task_id and status = 'open';
    if found then
      insert into public.timeline_entries (task_id, kind, author_id, status)
        values (new.task_id, 'moved', null, 'in_progress');
    end if;
    return null;
  end;
  $$;

create trigger start_task_on_comment
  after insert on public.timeline_entries
  for each row
  when (new.kind = 'comment')
  execute function private.start_task_on_comment();

create function private.record_task_opened() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    insert into public.timeline_entries (task_id, kind, author_id, created_at)
      values (new.id, 'opened', new.owner_id, new.created_at);
    return null;
  end;
  $$;

create trigger record_task_opened
  after insert on public.tasks
  for each row
  execute function private.record_task_opened();

-- Tasks opened before the Timeline existed.
insert into public.timeline_entries (task_id, kind, author_id, created_at)
  select id, 'opened', owner_id, created_at from public.tasks;

-- A Task Master deletes a comment on any Task, closed ones included. The text is erased, not
-- hidden: it is content that must not stay. The entry remains where it was, as the marker.
create function public.delete_comment(entry_id bigint) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if not private.is_task_master() then
      raise exception 'only a Task Master deletes a comment' using errcode = '42501';
    end if;
    update public.timeline_entries
      set body = null, deleted_at = now(), deleted_by = auth.uid()
      where id = entry_id and kind = 'comment' and deleted_at is null;
    if not found then
      raise exception 'no such comment' using errcode = 'P0002';
    end if;
  end;
  $$;

revoke execute on function
  private.writes_on_task(bigint), private.stamp_comment_edit(), private.start_task_on_comment(),
  private.record_task_opened(), public.delete_comment(bigint)
  from public, anon, authenticated;
grant execute on function private.writes_on_task(bigint), public.delete_comment(bigint)
  to authenticated;
