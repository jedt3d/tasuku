# Managed infrastructure is acceptable; per-seat helpdesk SaaS is not

Tasuku exists because PSP does not want a helpdesk vendor such as Zendesk: pricing per Staff seat or per Customer email, and a workflow owned by someone else. That objection is about the helpdesk layer, not about third-party hosting, so Tasuku runs on Supabase (cloud) for database, auth and file storage, with the frontend on Cloudflare, rather than being self-hosted on a company VPS.

## Consequences

Task data, including attachments that may accidentally contain patient information from hospital Customers, is held by Supabase and Cloudflare. If a Customer contract or PDPA review later forbids that, the fallback is self-hosted Supabase, which keeps the same schema and client code.
