# Deploying Tasuku

Runbook for [#13](https://github.com/jedt3d/tasuku/issues/13). It records what has actually been done and what is still open. The repository is public: **never write a secret, key or token in this file or anywhere in the repo.**

| Piece | Where | Value |
|---|---|---|
| Frontend | Cloudflare Worker with static assets | Worker `tasuku` |
| URL | Worker Custom Domain | `https://tasuku.servicework.cloud` |
| DNS zone | Cloudflare (`servicework.cloud`) | record created automatically by the Custom Domain |
| Backend | Supabase cloud project `Tasuku (タスク)` | ref `nhibizypckyznlzprsnv`, region `ap-southeast-1` |

The plan and the issue originally said Cloudflare Pages. The deployed target is a Worker with static assets, which is what Cloudflare recommends for new projects and which supports a Custom Domain on a Cloudflare-managed zone.

## Status

- [x] Cloudflare: Worker `tasuku` deployed with a placeholder page, Custom Domain attached, HTTPS 200
- [x] Supabase Auth: Site URL and redirect allow list set
- [x] Supabase: schema and Row Level Security applied (12 migrations, 11 Oct 2026; section 4)
- [x] App built from the repo and deployed to the Worker (section 5)
- [x] First Task Master seeded and signed in with a magic link on the deployed app (11 Oct 2026, built-in sender)
- [ ] Mailgun SMTP configured (before real use)
- [x] Decided: new sign-ups are closed (ADR 0003)
- [x] Supabase: both invite functions deployed (section 6)
- [x] Supabase: "Allow new users to sign up" turned off, once the invite function is deployed (11 Oct 2026)
- [ ] Supabase: sessions time-boxed to 7 days (section 7; needs the Pro plan)
- [x] Supabase: `send-emails` deployed (section 8, step 1)
- [ ] Supabase: `send-emails` has its secrets and the two Vault secrets (section 8, steps 2 and 3); until then the outbox only fills

## 1. Cloudflare Worker and domain

Prerequisites: the zone `servicework.cloud` is on Cloudflare, and `tasuku.servicework.cloud` has no existing CNAME (a Custom Domain cannot be created over one).

1. `npx wrangler login` and approve in the browser. Check with `npx wrangler whoami`.
2. The Wrangler config is `app/wrangler.jsonc`: it serves the folder `app/build`, falls back to `index.html` for every path, and answers on one hostname only. It holds no secret. `workers_dev: false` removes the `*.workers.dev` address so the only URL to allow in Supabase is the real one.
3. `npx wrangler deploy`, from `app/`. Cloudflare creates the DNS record and the certificate itself; allow a minute or two. Wrangler is not a dependency of the app: `npx` downloads it (4.149.0 on 11 Oct 2026).
4. Verify: `curl -I https://tasuku.servicework.cloud` returns `200`.

Wrangler stores its login outside the repo. "Always Use HTTPS" is on for the zone `servicework.cloud` (SSL/TLS → Edge Certificates), so `http://` answers `301`; it was off until 11 Oct 2026 and the app answered over plain HTTP.

## 2. Supabase Auth URLs

Needed so the magic link comes back to the right place.

| Setting | Value |
|---|---|
| Site URL | `https://tasuku.servicework.cloud` |
| Redirect URLs | `https://tasuku.servicework.cloud/**` and `http://localhost:5173/**` |

`http://localhost:5173` is the dev server, kept so the local app can sign in against the cloud project when needed. Local development against the local Supabase stack (#2) does not use this list.

Set in the dashboard under Authentication → URL Configuration, or through the Management API:

```bash
export SUPABASE_ACCESS_TOKEN=...   # a personal access token; keep it in your shell, not in the repo
curl -X PATCH "https://api.supabase.com/v1/projects/nhibizypckyznlzprsnv/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"site_url":"https://tasuku.servicework.cloud","uri_allow_list":"https://tasuku.servicework.cloud/**,http://localhost:5173/**"}'
```

This list lives only in the cloud project. The local stack has its own in `supabase/config.toml` (`site_url` and `additional_redirect_urls`, both `http://localhost:5173`); the two are not kept in sync automatically. The same file closes sign-up locally with `[auth] enable_signup = false`. Leave `[auth.email] enable_signup` on: turning that one off disables email sign-in altogether.

## 3. Email

The built-in Supabase sender is used for testing. Limits that matter:

- It only delivers to addresses that are members of the Supabase organization; any other address fails with "Email address not authorized".
- The project is currently limited to 2 emails per hour (`rate_limit_email_sent`).

So the first Task Master must be an organization member, and magic-link tests should not be repeated quickly. Before Staff and Customers use it, configure Mailgun as custom SMTP in Authentication → SMTP Settings (credentials go in the Supabase dashboard only).

Those settings are for the mail Supabase Auth sends (magic links). The notification emails of Tasuku do not go through them, and never through the built-in sender: see section 8.

## 4. Schema and Row Level Security

Applied from the repo's migrations with the Supabase CLI, from the repository root: `supabase login`, `supabase link --project-ref nhibizypckyznlzprsnv`, `supabase db push`. With CLI 2.120.0 neither `link` nor `db push` asked for the database password (the CLI makes a login role of its own). `db push` does not run `supabase/seed.sql`, which is for the local stack only: never add `--include-seed`. `supabase db push --dry-run` lists what would be applied.

All access rules live in Row Level Security (ADR 0002). Checked on the cloud project after the first push (11 Oct 2026):

- 12 migrations recorded; `pg_net` in `extensions`, `pg_cron` in `pg_catalog`.
- `select jobname, schedule, active from cron.job`: `send-emails` (`* * * * *`) and `close-due-tasks` (`*/15 * * * *`), both active.
- The bucket `attachments` exists and is private, with three policies on `storage.objects`.
- Row Level Security is on for every table in `public` and for `private.email_outbox`. The role `anon` has no privilege on any table: a request with only the publishable key gets `42501`.
- The security advisor names `public.rls_auto_enable()` as callable without signing in. It is not from this repo: Supabase creates it with the project (an event trigger that turns Row Level Security on for new tables in `public`), and a call through the API fails with `0A000`. Its other findings are the RPCs of the app, which check the caller themselves, and `private.email_outbox`, which has no policy on purpose.

## 5. Deploy the app and seed the first Task Master

1. Build the static app in `app/` with the Supabase project URL and the **publishable** key in the environment. The build refuses to run without them. Never use the secret / service-role key in the frontend or the repo.

   ```bash
   cd app && npm ci
   VITE_SUPABASE_URL=https://nhibizypckyznlzprsnv.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=... npm run build
   ```

   The publishable key is under Project Settings → API Keys and is not a secret; it is in the built files.
2. The build writes `app/build`, with `index.html` as the shell that `not_found_handling: single-page-application` serves for every path.
3. `npx wrangler deploy`, still in `app/`. Then open a deep path such as `/tasks/1` without a session: it must show the sign-in page at `/?next=/tasks/1`.
4. Seed the first Task Master. This is the one step that needs the secret key: keep it in your shell, and unset it afterwards.

   ```bash
   cd app
   read -s "SUPABASE_SECRET_KEY?Secret key: " && export SUPABASE_SECRET_KEY
   SUPABASE_URL=https://nhibizypckyznlzprsnv.supabase.co TASK_MASTER_EMAIL=... node scripts/seed.mjs
   unset SUPABASE_SECRET_KEY
   ```

   `read -s` (zsh) keeps the key off the screen and out of the shell history.

   It creates the account and registers it as Staff with the Task Master flag; running it again changes nothing. Then sign in with a magic link on the deployed app. While the built-in sender is in use the address must be a member of the Supabase organization (section 3).

## 6. The invite functions

Two functions are the only places an account is created (ADR 0003). A Task Master calls `supabase/functions/invite-staff` from the Staff page. The Owner of a Task or a Task Master calls `supabase/functions/invite-customer` from the Task page; the database decides whether they may (`set_customer`), and the function creates an account only when the email has none. Deploy both from the repository root (Docker must be running: the CLI bundles the function in it):

```bash
supabase functions deploy invite-staff
supabase functions deploy invite-customer
```

They read `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from the function's environment. The local stack supplies all three, and so does the cloud project (`supabase secrets list` names them; checked 11 Oct 2026). Without a signed-in caller both answer `401`. `invite-staff` was tried from the Staff page of the deployed app and created the account; `invite-customer` has not been tried on the cloud project. Neither sends email: the person who added someone tells them, and they then ask for a magic link on the sign-in page.

## 7. Session length (open)

Everyone signs in again 7 days after their last magic link: Staff, Task Masters and Customers alike. Supabase Auth has one setting per project, not one per kind of user, so the 30 days for Staff in spec #1 was dropped (decided in #3).

Locally this is `[auth.sessions] timebox = "168h"` in `supabase/config.toml`. On the cloud project it is the time-box setting under Authentication → Sessions, and it **needs the Pro plan**. On the Free plan a session never expires. No test covers this: the test seam cannot wait 7 days.

## 8. Notification emails (steps 2 and 3 open)

Being added to a Task, a comment by someone else, a Task becoming Resolved and the Customer cancelling each send an email (#10). The database writes who must be told into `private.email_outbox`, in the transaction of the event, and calls the Edge Function `send-emails` (pg_net); pg_cron calls it again every minute while something is waiting. An email that fails stays in the outbox and is tried five times. Automatic closure (#11) adds a second pg_cron job, `close-due-tasks`, every 15 minutes: it marks Resolved Tasks past their time Done and queues the reminder, and the Task closing by itself sends an email to its Customer too. It needs nothing set up beyond the migration. On the cloud project the function is deployed and both jobs are scheduled (11 Oct 2026); no email has been sent from it yet.

The migration installs `pg_net` and `pg_cron`. Edge Functions cannot open ports 25 and 587, so the function sends through Mailgun's HTTP API, not SMTP: it needs a Mailgun API key, which is not the SMTP password of section 3.

1. Deploy the function. It is called by the database, which has no JWT, so it checks a secret of its own (`verify_jwt = false` in `supabase/config.toml`):

   ```bash
   supabase functions deploy send-emails
   ```

   The deploy keeps `verify_jwt = false`. A call without the secret, or before `SEND_EMAILS_SECRET` is set, gets `401`.

2. Set its secrets. `MAILGUN_URL` is the whole address of the messages endpoint: `https://api.mailgun.net/v3/<domain>/messages`, or `https://api.eu.mailgun.net/...` for a domain in the EU region. Choose a long random value for `SEND_EMAILS_SECRET`. `MAILGUN_API_KEY` is the password of HTTP basic auth with the user name `api` (Mailgun's documentation, "Authentication"); a Domain Sending Key is enough and can do nothing but send for that one domain. The domain in `MAILGUN_URL` must exist in Mailgun with its DNS records: `tasuku.servicework.cloud` has none yet. A Mailgun sandbox domain delivers only to its authorized recipients.

   ```bash
   supabase secrets set SEND_EMAILS_SECRET=... MAILGUN_URL=... MAILGUN_API_KEY=... \
     MAIL_FROM='Tasuku <no-reply@tasuku.servicework.cloud>' SITE_URL=https://tasuku.servicework.cloud
   ```

3. Tell the database where the function is and which secret to send, in the SQL editor. Until both exist nothing is called and the outbox keeps what is waiting.

   ```sql
   select vault.create_secret('https://nhibizypckyznlzprsnv.supabase.co/functions/v1/send-emails', 'send_emails_url');
   select vault.create_secret('<the value of SEND_EMAILS_SECRET>', 'send_emails_secret');
   ```

To see what is waiting or has failed: `select * from private.email_outbox where sent_at is null;`. The function logs why a send failed (Edge Functions → Logs). The local stack sends to Mailpit instead (`MAILPIT_URL` in `supabase/config.toml`, the Vault secrets in `supabase/seed.sql`).

## Deploying again after a merge

From an up-to-date `main`, in this order:

```bash
supabase functions deploy                # all three, from the repository root
supabase db push                         # only the migrations the cloud project does not have
cd app && npm ci
VITE_SUPABASE_URL=https://nhibizypckyznlzprsnv.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=... npm run build
npx wrangler deploy
```

The functions go first. `send-emails` fails its whole batch when the outbox holds a kind of email it does not know (found in #12), so it must be on the cloud before, or together with, the migration that adds the kind. The app goes last, so it never calls something the database does not have yet. When a merge changed nothing under `supabase/functions/` and adds no kind of email, the first step can be left out, as it was for #41. The test suite is never run against the cloud project: it creates hundreds of accounts and Tasks.

## Sign-up is closed

Decided in [ADR 0003](adr/0003-sign-up-is-closed.md): "Allow new users to sign up" is turned off, and accounts are created only by the invite function (a Supabase Edge Function) when a Task Master registers a Staff member or a Staff member adds a Customer to a Task. The function holds the secret key; the browser never does.

Order matters: deploy the invite function (section 6) first, then turn the setting off. Turned off earlier, nobody new could be added. The first Task Master is created by the seed step, not through the app.

The setting is in the Supabase dashboard of the project, under Authentication → Sign In / Providers. To check it, with only the publishable key:

```bash
curl -s https://nhibizypckyznlzprsnv.supabase.co/auth/v1/settings -H "apikey: <publishable key>"   # "disable_signup":true
```

Checked on 11 Oct 2026: a request for a magic link or a password sign-up for an address with no account answers `422 signup_disabled` and creates nothing. The app always asks with `shouldCreateUser: false`, which answers `422 otp_disabled`, and the sign-in page then says the address is not known.
