-- Email notifications (#10).

-- Every event that needs an email is already a row of the Timeline, so one trigger there covers
-- them all. It only writes down who must be told (the outbox), in the transaction of the event:
-- sending is the work of the Edge Function `send-emails`, so a mail server that is down never
-- refuses a comment. pg_net calls the function once the transaction is committed; pg_cron calls
-- it again every minute while something is still waiting.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table private.email_outbox (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.timeline_entries (id),
  recipient uuid not null references auth.users (id) on delete cascade,
  -- Which text is sent (supabase/functions/send-emails/emails).
  kind text not null check (kind in ('added', 'comment', 'resolved', 'cancelled')),
  created_at timestamptz not null default now(),
  -- Set when `send-emails` takes the row; a row taken and not sent is offered again later.
  claimed_at timestamptz,
  attempts int not null default 0,
  sent_at timestamptz,
  unique (entry_id, recipient)
);
create index email_outbox_waiting_idx on private.email_outbox (id) where sent_at is null;

alter table private.email_outbox enable row level security;
revoke all on private.email_outbox from anon, authenticated;

-- Where `send-emails` is and the secret it expects are kept in Vault, because they differ between
-- the local stack (supabase/seed.sql) and the cloud project (docs/deploy.md). Until both are set,
-- nothing is called and the outbox keeps what is waiting.
create function private.poke_send_emails() returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    address text;
    secret text;
  begin
    select decrypted_secret into address from vault.decrypted_secrets where name = 'send_emails_url';
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'send_emails_secret';
    if address is null or secret is null then
      return;
    end if;
    perform net.http_post(
      url := address,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
      body := '{}'::jsonb
    );
  exception when others then
    -- The event must be written whatever happens here; pg_cron tries again.
    raise warning 'send-emails was not called: %', sqlerrm;
  end;
  $$;

-- Who is told about a Timeline entry. Nobody is told of what they did themselves: a person is one
-- account, so a Staff member who is also the Customer of the Task is left out in either role.
create function private.queue_emails() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  declare
    t public.tasks;
    -- On 'customer_added' `customer_id` is who was added, and `author_id` who added them.
    actor uuid := coalesce(new.author_id, new.customer_id);
    mail text;
    queued int;
  begin
    select * into t from public.tasks where id = new.task_id;
    mail := case
      when new.kind in ('collaborator_added', 'customer_added') then 'added'
      when new.kind = 'comment' then 'comment'
      when new.kind = 'moved' and new.status = 'resolved' then 'resolved'
      -- "The Customer cancels" is whoever cancels as the Customer (`private.acts_as_customer`):
      -- a Staff member who is the Customer is recorded as Staff, so the row alone does not say.
      when new.kind = 'moved' and new.status = 'cancelled'
        and actor = t.customer_id and actor <> t.owner_id then 'cancelled'
    end;
    if mail is null then
      return null;
    end if;

    insert into private.email_outbox (entry_id, recipient, kind)
      select distinct new.id, person, mail
      from unnest(
        case mail
          when 'added' then array[coalesce(new.subject_id, new.customer_id)]
          when 'comment' then
            array[t.owner_id, t.customer_id]
            || array(select staff_id from public.task_collaborators where task_id = new.task_id)
          when 'resolved' then array[t.customer_id]
          else array[t.owner_id]
        end
      ) as person
      where person is not null and person is distinct from actor;
    get diagnostics queued = row_count;
    if queued > 0 then
      perform private.poke_send_emails();
    end if;
    return null;
  end;
  $$;

create trigger queue_emails
  after insert on public.timeline_entries
  for each row
  execute function private.queue_emails();

-- Hands `send-emails` what is waiting, with everything an email is made of. A row is offered
-- again two minutes after it was taken and not sent, five times at most.
--
-- What must no longer be sent is dropped first: a comment deleted since, and a recipient who is
-- no longer on the Task or was removed from Staff. A removed Staff member gets nothing, also on a
-- Task whose Customer they are.
--
-- The name of whoever did it follows the Task page (#7): a Customer reads the names of Staff
-- only, never an email, and a Staff member with no name is "PSP".
create function public.claim_emails()
  returns table (id bigint, kind text, task_id bigint, title text, email text, language text, actor text)
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
      end
    from claimed c
      join public.timeline_entries e on e.id = c.entry_id
      join public.tasks t on t.id = e.task_id
      left join public.staff to_staff on to_staff.user_id = c.recipient
      left join public.customers to_customer on to_customer.user_id = c.recipient
      left join public.staff by_staff on by_staff.user_id = e.author_id
      left join public.customers by_customer on by_customer.user_id = e.customer_id and e.author_id is null
    order by c.id;
  $$;

create function public.email_sent(email_id bigint) returns void
  language sql security definer set search_path = ''
  as $$
    update private.email_outbox set sent_at = now() where id = email_id;
  $$;

revoke execute on function
  private.poke_send_emails(), private.queue_emails(), public.claim_emails(), public.email_sent(bigint)
  from public, anon, authenticated;
grant execute on function public.claim_emails(), public.email_sent(bigint) to service_role;

-- ponytail: pg_cron keeps a row per run in cron.job_run_details and never clears it; add a
-- cleanup job if the table grows.
select cron.schedule(
  'send-emails', '* * * * *',
  $$select private.poke_send_emails()
    where exists (select from private.email_outbox where sent_at is null and attempts < 5)$$
);
