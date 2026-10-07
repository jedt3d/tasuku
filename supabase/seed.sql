-- Local stack only: run by `supabase start` on an empty database and by `supabase db reset`.
-- Where the database finds the Edge Function `send-emails` and the secret it sends (#10). The
-- secret is the one in `supabase/config.toml`; the cloud project has its own (docs/deploy.md).
select vault.create_secret('http://kong:8000/functions/v1/send-emails', 'send_emails_url');
select vault.create_secret('local-only-not-a-secret', 'send_emails_secret');
