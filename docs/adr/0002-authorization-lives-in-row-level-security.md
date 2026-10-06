# Authorization lives in Postgres Row Level Security

Tasuku's frontend is a static SvelteKit app that talks to Supabase directly, with no server of our own in between. Every access rule (a Customer sees only the Timeline of their own Tasks and never a Thread; Staff read everything but write only where they are Owner or Collaborator; a Task Master may act on any Task) is therefore enforced by Row Level Security policies in the database, not in frontend or function code.

## Consequences

Hiding something in the UI is never a security measure: a rule that is not an RLS policy does not exist. Each new table needs its policies written and tested before it is exposed, and the tests must run as a Customer, a non-member Staff, a Collaborator, an Owner and a Task Master.
