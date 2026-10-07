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
- [ ] Supabase: schema and Row Level Security applied (migrations come from #2 and #3)
- [ ] App built from the repo and deployed to the Worker
- [ ] First Task Master seeded and signed in with a magic link on the deployed app
- [ ] Mailgun SMTP configured (before real use)
- [ ] Decide whether to disable new sign-ups (see below)

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

This list lives only in the cloud project. If #2 adds redirect URLs to the local `supabase/config.toml`, the two are not kept in sync automatically.

## 3. Email

The built-in Supabase sender is used for testing. Limits that matter:

- It only delivers to addresses that are members of the Supabase organization; any other address fails with "Email address not authorized".
- The project is currently limited to 2 emails per hour (`rate_limit_email_sent`).

So the first Task Master must be an organization member, and magic-link tests should not be repeated quickly. Before Staff and Customers use it, configure Mailgun as custom SMTP in Authentication → SMTP Settings (credentials go in the Supabase dashboard only).

## 4. Schema and Row Level Security (open)

Applied from the repo's migrations once #2 and #3 provide them, with the Supabase CLI: `supabase login`, `supabase link --project-ref nhibizypckyznlzprsnv`, `supabase db push`. All access rules live in Row Level Security (ADR 0002), so confirm the policies are present before exposing the app.

## 5. Deploy the app and seed the first Task Master (open)

1. Build the static app and point `assets.directory` at its output folder.
2. Provide the Supabase project URL and the **publishable** key to the build as environment variables. Never use the secret / service-role key in the frontend or the repo.
3. `npx wrangler deploy`.
4. Seed the first Task Master as a registered user (method to be written when #2 defines the seed), then sign in with a magic link on the deployed app.

## Open decision

Whether to turn off "Allow new users to sign up" once the first Task Master exists. RLS already lets an unregistered signed-in email read nothing; disabling sign-up adds a second layer but changes how Staff and Customers are onboarded, so it is decided with #3 and #7.
