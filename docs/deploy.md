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
- [ ] Supabase: schema and Row Level Security applied (migrations are in `supabase/migrations/`, from #2 on)
- [ ] App built from the repo and deployed to the Worker
- [ ] First Task Master seeded and signed in with a magic link on the deployed app
- [ ] Mailgun SMTP configured (before real use)
- [x] Decided: new sign-ups are closed (ADR 0003)
- [ ] Supabase: "Allow new users to sign up" turned off, once the invite function from #3 is deployed

## 1. Cloudflare Worker and domain

Prerequisites: the zone `servicework.cloud` is on Cloudflare, and `tasuku.servicework.cloud` has no existing CNAME (a Custom Domain cannot be created over one).

1. `npx wrangler login` and approve in the browser. Check with `npx wrangler whoami`.
2. Wrangler config for the Worker (serves a folder of static files, SPA fallback, one hostname only):

   ```jsonc
   {
     "name": "tasuku",
     "compatibility_date": "<today's date>",
     "workers_dev": false,
     "assets": { "directory": "<build output folder>", "not_found_handling": "single-page-application" },
     "routes": [{ "pattern": "tasuku.servicework.cloud", "custom_domain": true }]
   }
   ```

   `workers_dev: false` removes the `*.workers.dev` address so the only URL to allow in Supabase is the real one.
3. `npx wrangler deploy`. Cloudflare creates the DNS record and the certificate itself; allow a minute or two.
4. Verify: `curl -I https://tasuku.servicework.cloud` returns `200`.

Redeploying later is the same `npx wrangler deploy` with the same Worker name. Wrangler stores its login outside the repo.

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

## 4. Schema and Row Level Security (open)

Applied from the repo's migrations once #2 and #3 provide them, with the Supabase CLI: `supabase login`, `supabase link --project-ref nhibizypckyznlzprsnv`, `supabase db push`. All access rules live in Row Level Security (ADR 0002), so confirm the policies are present before exposing the app.

## 5. Deploy the app and seed the first Task Master (open)

1. Build the static app in `app/` with the Supabase project URL and the **publishable** key in the environment. The build refuses to run without them. Never use the secret / service-role key in the frontend or the repo.

   ```bash
   cd app && npm ci
   VITE_SUPABASE_URL=https://nhibizypckyznlzprsnv.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=... npm run build
   ```

2. Point `assets.directory` at `app/build`. The build writes `index.html` as the shell that `not_found_handling: single-page-application` serves for every path.
3. `npx wrangler deploy`.
4. Seed the first Task Master. This is the one step that needs the secret key: keep it in your shell, and unset it afterwards.

   ```bash
   cd app
   SUPABASE_URL=https://nhibizypckyznlzprsnv.supabase.co SUPABASE_SECRET_KEY=... TASK_MASTER_EMAIL=... node scripts/seed.mjs
   ```

   It creates the account and registers it as Staff with the Task Master flag; running it again changes nothing. Then sign in with a magic link on the deployed app. While the built-in sender is in use the address must be a member of the Supabase organization (section 3).

## Sign-up is closed

Decided in [ADR 0003](adr/0003-sign-up-is-closed.md): "Allow new users to sign up" is turned off, and accounts are created only by the invite function (a Supabase Edge Function) when a Task Master registers a Staff member or a Staff member adds a Customer to a Task. The function holds the secret key; the browser never does.

Order matters: deploy the invite function with #3 first, then turn the setting off. Turned off earlier, nobody new could be added. The first Task Master is created by the seed step, not through the app.
