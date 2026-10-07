-- Attachments (#9).

-- Files live in one private bucket. Storage itself refuses a file over 10 MB or of another type,
-- so the limits hold for an upload that does not come from the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
);

-- A file is part of a comment. The row says which object in the bucket it is; the object's name is
-- '<task>/<uuid>'. Rows are never deleted: a deleted file stays as a marker, without its name.
create table public.attachments (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.timeline_entries (id),
  task_id bigint not null references public.tasks (id),
  path text not null unique,
  -- The name the file had on its sender's device. Erased with the file.
  name text check (name ~ '\S' and char_length(name) <= 255),
  -- Both as Storage recorded them, not as the sender said.
  mime_type text not null,
  size bigint not null,
  deleted_at timestamptz,
  deleted_by uuid references public.staff (user_id),
  check ((name is null) = (deleted_at is not null))
);
create index attachments_entry_idx on public.attachments (entry_id);
create index attachments_task_idx on public.attachments (task_id);

alter table public.attachments enable row level security;

-- Written only by the functions below.
revoke all on public.attachments from anon, authenticated;
grant select on public.attachments to authenticated;
grant select, insert, update, delete on public.attachments to service_role;

-- Whoever reads the Task reads what is attached to it.
create policy "staff and the customer of the task read its attachments" on public.attachments
  for select to authenticated
  using ((select private.is_staff()) or private.is_customer_of(task_id));

-- A comment may now be files without text: `has_files` says so, and only `comment_with_files`
-- sets it. 'attachment_deleted' is an event by a Staff member (`author_id`).
alter table public.timeline_entries
  add column has_files boolean not null default false,
  drop constraint timeline_entries_kind_check,
  drop constraint timeline_entries_check,
  add constraint timeline_entries_kind_check check (
    kind in (
      'comment', 'opened', 'moved', 'collaborator_added', 'collaborator_removed',
      'customer_added', 'customer_removed', 'attachment_deleted'
    )
  ),
  add constraint timeline_entries_check check (
    (kind in ('collaborator_added', 'collaborator_removed')) = (subject_id is not null)
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

-- Who uploads where: whoever may comment on a Task, into that Task's folder.
create function private.uploads_to_task(object_name text) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select case
      when object_name ~ '^[0-9]{1,18}/[0-9a-f-]{36}$'
        then private.comments_on_task(split_part(object_name, '/', 1)::bigint)
      else false
    end;
  $$;

-- Who reads an object: readers of the Task, once the file is attached and until it is deleted.
-- After that only whoever erases it (Storage reads an object before it removes it). A file that
-- was uploaded and never attached is read by nobody.
create function private.reads_attachment(object_name text) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.attachments
      where path = object_name
        and case
          when deleted_at is null then private.is_staff() or private.is_customer_of(task_id)
          else private.is_task_master() or deleted_by = (select auth.uid())
        end
    );
  $$;

-- Who erases an object: whoever deleted the attachment, or a Task Master if that did not finish.
create function private.erases_attachment(object_name text) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select from public.attachments
      where path = object_name
        and deleted_at is not null
        and (private.is_task_master() or deleted_by = (select auth.uid()))
    );
  $$;

create policy "people who comment on a task upload to it" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and private.uploads_to_task(name));

create policy "readers of a task read its attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and private.reads_attachment(name));

create policy "a deleted attachment is erased" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and private.erases_attachment(name));

-- Writes a comment with files the caller has already uploaded to the Task's folder. `files` is
-- [{ "path": ..., "name": ... }]. The text may be blank; the files may not be missing.
create function public.comment_with_files(task bigint, body text, files jsonb) returns bigint
  language plpgsql security definer set search_path = ''
  as $$
  declare
    entry bigint;
    file jsonb;
    object record;
  begin
    perform from public.tasks where id = task for update;
    if not private.comments_on_task(task) then
      raise exception 'you cannot comment on this Task' using errcode = '42501';
    end if;
    if jsonb_typeof(files) is distinct from 'array'
      or jsonb_array_length(files) not between 1 and 10 then
      raise exception 'a comment takes 1 to 10 files' using errcode = '22023';
    end if;

    insert into public.timeline_entries (task_id, body, has_files)
      values (task, case when body ~ '\S' then body end, true)
      returning id into entry;

    for file in select * from jsonb_array_elements(files) loop
      select o.name, o.metadata into object
        from storage.objects o
        where o.bucket_id = 'attachments'
          and o.name = file ->> 'path'
          and o.owner_id = auth.uid()::text
          and split_part(o.name, '/', 1) = task::text;
      if not found then
        raise exception 'no such file uploaded to this Task' using errcode = 'P0002';
      end if;
      insert into public.attachments (entry_id, task_id, path, name, mime_type, size)
        values (
          entry, task, object.name, file ->> 'name',
          object.metadata ->> 'mimetype', (object.metadata ->> 'size')::bigint
        );
    end loop;
    return entry;
  end;
  $$;

-- The Owner and a Task Master delete an attachment; on a Done or Cancelled Task only a Task Master
-- does, as with a comment. This cuts the reading at once and returns the object's path: the caller
-- then erases the object through Storage, which is the only way to erase one.
create function public.delete_attachment(attachment_id bigint) returns text
  language plpgsql security definer set search_path = ''
  as $$
  declare
    task bigint;
    erased text;
  begin
    select a.task_id into task from public.attachments a where a.id = attachment_id;
    perform from public.tasks where id = task for update;
    if not (private.manages_task(task) or private.is_task_master()) then
      raise exception 'only the Owner or a Task Master deletes an attachment' using errcode = '42501';
    end if;
    update public.attachments
      set name = null, deleted_at = now(), deleted_by = auth.uid()
      where id = attachment_id and deleted_at is null
      returning path into erased;
    if not found then
      raise exception 'no such attachment' using errcode = 'P0002';
    end if;
    insert into public.timeline_entries (task_id, kind, author_id)
      values (task, 'attachment_deleted', auth.uid());
    return erased;
  end;
  $$;

-- Deleting a comment deletes its files with it, and returns their paths for the caller to erase.
drop function public.delete_comment(bigint);
create function public.delete_comment(entry_id bigint) returns text[]
  language plpgsql security definer set search_path = ''
  as $$
  declare
    erased text[];
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
    with gone as (
      update public.attachments a
        set name = null, deleted_at = now(), deleted_by = auth.uid()
        where a.entry_id = delete_comment.entry_id and a.deleted_at is null
        returning path
    )
    select coalesce(array_agg(path), '{}') into erased from gone;
    return erased;
  end;
  $$;

-- The report for a Task Master: files that were deleted but whose object is still in the bucket,
-- because the erasing through Storage did not finish. Nobody reads them; a Task Master erases them.
create function public.unerased_attachments()
  returns table (id bigint, task_id bigint, path text, deleted_at timestamptz)
  language plpgsql stable security definer set search_path = ''
  as $$
  begin
    if not private.is_task_master() then
      raise exception 'only a Task Master reads this report' using errcode = '42501';
    end if;
    return query
      select a.id, a.task_id, a.path, a.deleted_at
      from public.attachments a
      where a.deleted_at is not null
        and exists (
          select from storage.objects o where o.bucket_id = 'attachments' and o.name = a.path
        )
      order by a.deleted_at;
  end;
  $$;

revoke execute on function
  private.uploads_to_task(text), private.reads_attachment(text), private.erases_attachment(text),
  public.comment_with_files(bigint, text, jsonb), public.delete_attachment(bigint),
  public.delete_comment(bigint), public.unerased_attachments()
  from public, anon, authenticated;
grant execute on function
  private.uploads_to_task(text), private.reads_attachment(text), private.erases_attachment(text),
  public.comment_with_files(bigint, text, jsonb), public.delete_attachment(bigint),
  public.delete_comment(bigint), public.unerased_attachments()
  to authenticated;
