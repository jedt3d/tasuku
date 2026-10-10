-- A Task Master reassigns the Owner (#12).

-- For when an Owner is away or has left: the Task goes to another Staff member at once, without
-- their acceptance, and the previous Owner stays on it as a Collaborator. One event on the
-- Timeline says so. `subject_id` names the new Owner; the Owner before is whoever the Timeline had
-- as Owner until then, starting from the author of 'opened'.
alter table public.timeline_entries
  drop constraint timeline_entries_kind_check,
  drop constraint timeline_entries_check,
  add constraint timeline_entries_kind_check check (
    kind in (
      'comment', 'opened', 'moved', 'collaborator_added', 'collaborator_removed',
      'customer_added', 'customer_removed', 'attachment_deleted', 'owner_changed'
    )
  ),
  add constraint timeline_entries_check check (
    (kind in ('collaborator_added', 'collaborator_removed', 'owner_changed')) = (subject_id is not null)
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

-- As in #6, except while `reassign_task` moves people between Owner and Collaborator: that is one
-- event, 'owner_changed', and not also "added" and "removed". The setting lasts for the
-- transaction at most, and nobody sets it through the API.
create or replace function private.record_collaborator_change() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if current_setting('tasuku.reassigning', true) = 'on' then
      return null;
    end if;
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

-- "The Owner is never a Collaborator" was checked by the policy alone (`private.can_collaborate`,
-- #6), which reads the Task as it was when the statement began. Now that the Owner changes, a
-- Staff member added as a Collaborator at the moment the Task is given to them would be both. So
-- the row waits here for whoever holds the Task, and the Owner is read again.
create function private.keep_owner_out_of_collaborators() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    perform from public.tasks where id = new.task_id for share;
    if exists (select from public.tasks where id = new.task_id and owner_id = new.staff_id) then
      raise exception 'the Owner of a Task is not also a Collaborator on it' using errcode = '42501';
    end if;
    return new;
  end;
  $$;

create trigger keep_owner_out_of_collaborators
  before insert on public.task_collaborators
  for each row
  execute function private.keep_owner_out_of_collaborators();

-- Two more emails: 'assigned' to the new Owner, 'unassigned' to the previous one.
alter table private.email_outbox
  drop constraint email_outbox_kind_check,
  add constraint email_outbox_kind_check check (
    kind in ('added', 'comment', 'resolved', 'cancelled', 'reminder', 'closed', 'assigned', 'unassigned')
  );

-- Any Task that is not Done or Cancelled, a Resolved one included: its closing time stays, as the
-- Customer was told it. The new Owner is Staff who has not been removed and is not the Customer
-- of the Task, who would otherwise have nobody left to confirm to (`private.acts_as_customer`).
create function public.reassign_task(task bigint, new_owner uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
    entry bigint;
    queued int;
  begin
    -- The Task row is held before the caller is checked, as everywhere since #7.
    select * into t from public.tasks where id = task for update;
    if (private.is_task_master() and t.status not in ('done', 'cancelled')) is not true then
      raise exception 'only a Task Master reassigns a Task, before it is Done or Cancelled'
        using errcode = '42501';
    end if;
    if new_owner = t.owner_id then
      return;
    end if;
    -- Held too, so the new Owner is not removed from Staff (`remove_staff`) in the meantime.
    perform from public.staff where user_id = new_owner and removed_at is null for share;
    if not found or new_owner is not distinct from t.customer_id then
      raise exception 'the new Owner is Staff, and not the Customer of the Task' using errcode = '42501';
    end if;

    update public.tasks set owner_id = new_owner where id = task;
    -- A Staff member is the Owner or a Collaborator, never both. The previous Owner becomes a
    -- Collaborator even when removed from Staff: like any removed Collaborator (#6) they keep
    -- their place, and collaborate again once added back.
    perform set_config('tasuku.reassigning', 'on', true);
    delete from public.task_collaborators where task_id = task and staff_id = new_owner;
    insert into public.task_collaborators (task_id, staff_id) values (task, t.owner_id);
    perform set_config('tasuku.reassigning', '', true);
    insert into public.timeline_entries (task_id, kind, author_id, subject_id)
      values (task, 'owner_changed', auth.uid(), new_owner)
      returning id into entry;

    -- The event alone does not name the previous Owner, so the emails are queued here and not by
    -- `private.queue_emails`. Nobody is told of what they did themselves (#10).
    insert into private.email_outbox (entry_id, recipient, kind)
      select entry, person, mail
      from (values (new_owner, 'assigned'), (t.owner_id, 'unassigned')) as told (person, mail)
      where person <> auth.uid()
        and exists (select from public.staff s where s.user_id = person and s.removed_at is null);
    get diagnostics queued = row_count;
    if queued > 0 then
      perform private.poke_send_emails();
    end if;
  end;
  $$;

-- As in #11, and: an email about a change of Owner is dropped once the Task has changed Owner
-- again in a way that makes it wrong. `owner` is who the Task went to, for the email that says so
-- (the Owner of the Task for any other kind).
drop function public.claim_emails();
create function public.claim_emails()
  returns table (
    id bigint, kind text, task_id bigint, title text, email text, language text, actor text, hours int,
    owner text
  )
  language sql security definer set search_path = ''
  as $$
    with gone as (
      delete from private.email_outbox o
        using public.timeline_entries e, public.tasks t
        where o.sent_at is null and e.id = o.entry_id and t.id = e.task_id
          and (
            e.deleted_at is not null
            or exists (
              select from public.staff s where s.user_id = o.recipient and s.removed_at is not null
            )
            or (
              o.recipient <> t.owner_id
              and o.recipient is distinct from t.customer_id
              and not exists (
                select from public.task_collaborators c
                where c.task_id = t.id and c.staff_id = o.recipient
              )
            )
            or (
              o.kind in ('resolved', 'reminder')
              and exists (
                select from public.timeline_entries later
                where later.task_id = t.id and later.kind = 'moved' and later.id > o.entry_id
              )
            )
            or (o.kind = 'assigned' and o.recipient <> t.owner_id)
            or (o.kind = 'unassigned' and o.recipient = t.owner_id)
          )
        returning o.id
    ),
    due as (
      select o.id from private.email_outbox o
      where o.sent_at is null and o.attempts < 5
        and (o.claimed_at is null or o.claimed_at < now() - interval '2 minutes')
        and o.id not in (select gone.id from gone)
      order by o.id
      limit 50
      for update skip locked
    ),
    claimed as (
      update private.email_outbox o set claimed_at = now(), attempts = o.attempts + 1
        from due where o.id = due.id
        returning o.id, o.kind, o.entry_id, o.recipient
    )
    select
      c.id, c.kind, t.id, t.title,
      coalesce(to_staff.email, to_customer.email),
      coalesce(to_staff.language, to_customer.language),
      case
        when to_staff.user_id is not null then coalesce(nullif(by_staff.name, ''), by_staff.email, by_customer.email)
        else coalesce(nullif(by_staff.name, ''), 'PSP')
      end,
      greatest(1, round(extract(epoch from t.closes_at - now()) / 3600))::int,
      case
        when to_staff.user_id is not null then coalesce(nullif(owned_by.name, ''), owned_by.email)
        else coalesce(nullif(owned_by.name, ''), 'PSP')
      end
    from claimed c
      join public.timeline_entries e on e.id = c.entry_id
      join public.tasks t on t.id = e.task_id
      join public.staff owned_by
        on owned_by.user_id = case when e.kind = 'owner_changed' then e.subject_id else t.owner_id end
      left join public.staff to_staff on to_staff.user_id = c.recipient
      left join public.customers to_customer on to_customer.user_id = c.recipient
      left join public.staff by_staff
        on by_staff.user_id = case when c.kind = 'closed' then t.owner_id else e.author_id end
      left join public.customers by_customer on by_customer.user_id = e.customer_id and e.author_id is null
    order by c.id;
  $$;

revoke execute on function
  public.reassign_task(bigint, uuid), public.claim_emails(), private.keep_owner_out_of_collaborators()
  from public, anon, authenticated;
grant execute on function public.reassign_task(bigint, uuid) to authenticated;
grant execute on function public.claim_emails() to service_role;
