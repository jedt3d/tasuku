# Sign-up is closed; accounts are created by one server-side function

Supabase signs up any email that asks for a magic link unless sign-up is turned off. Left open, anyone could make Tasuku send email to any address and use up the sending quota; Row Level Security only stops them reading data. So "Allow new users to sign up" is off, and an account comes to exist only through a Supabase Edge Function, the invite function, when a Task Master registers a Staff member or a Staff member adds a Customer to a Task. Creating an account needs the secret key, which must never reach the browser, so this cannot be done from the frontend.

## Consequences

- This is the one exception to "no server of our own" in ADR 0002. The invite function checks the caller's role itself, creates the account, registers it (as Staff, or as the Customer of a Task), and does nothing else. Every data rule still lives in Row Level Security.
- The first Task Master is created by a seed step, not through the app.
- The invite function must be deployed before sign-up is turned off, or nobody new can be added.
- The public Request page planned for a later release lets a stranger verify an email and submit. It will need its own account-creating path through a function, with rate limits.
