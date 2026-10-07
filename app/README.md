# Tasuku app

The static SvelteKit application for [spec #1](https://github.com/jedt3d/tasuku/issues/1). It runs
entirely in the browser and talks to Supabase; every access rule is a Row Level Security policy
(`docs/adr/0002`). The schema lives in `../supabase/migrations/`.

Needs Docker, the [Supabase CLI](https://supabase.com/docs/guides/local-development) and Node 22.17 or later.

## Run

```bash
npm install
npm run stack:up   # starts local Supabase and registers the first Task Master
npm run dev        # http://localhost:5173
npm test           # the tests; the local stack must be running
```

To sign in locally, enter `task.master@example.test` and open the magic link in Mailpit at
<http://127.0.0.1:54324>. Nothing is really sent. Name a different first Task Master with
`TASK_MASTER_EMAIL=you@example.test npm run stack:up`.

| Command | What it does |
|---|---|
| `npm run stack:up` | `supabase start`, then the seed step |
| `npm run stack:reset` | Rebuilds the local database from the migrations, then seeds. Use after pulling a new migration |
| `npm test` | Runs `tests/` against the local stack |
| `npm run check-i18n` | Fails when the three languages do not have the same keys and placeholders |
| `npm run build` | Static site in `build/`. Needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |

`supabase stop` stops the stack. Port 5173 is fixed because the Supabase Auth redirect list names it
(`../docs/deploy.md`); tell the team before changing it.

## Layout

- `src/routes/`: the pages. The top bar with the language switcher is in the layout, so it is on every page.
- `src/lib/`: the Supabase client and the signed-in state.
- `src/lib/Overview.svelte`: the Staff landing page: the Task list by status, My Tasks, and the New
  Task panel. Its By Organization and Activity views and the search box are placeholders until
  Organizations and the Timeline exist.
- `src/routes/tasks/[id]/`: one Task. Its Owner and a Task Master edit the title, description and due
  date there; the status and the Owner are never written directly (`../supabase/migrations/`).
- `src/routes/staff/`: the Staff list. A Task Master adds, removes, promotes and demotes there, and
  each Staff member sets the name shown on their Tasks.
- `../supabase/functions/invite-staff/`: the invite function, the only place an account is created
  (`docs/adr/0003`). `supabase start` serves it; restart the stack after adding a function.
- `scripts/seed.mjs`: the installation step that registers the first Task Master. Sign-up is closed
  (`docs/adr/0003`), so the app never creates an account.
- `tests/`: see below.

Components, design tokens and message catalogues are **imported from `../storybook/src`** through the
`@ui` alias; they are not copied. A text change is made once, in `storybook/src/i18n/`.

## Tests

There is one test seam: the Supabase API of the local stack, called as a particular user. A test signs
in with `signInAs()` from `tests/helpers.mjs` and asserts what that user can read or change. Tests never
assert on policy text or table layout, and the interface has no browser tests (spec #1, Testing Decisions).

```js
const me = await signInAs(uniqueEmail('staff'), { staff: {} });      // a Staff member
const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });
const stranger = await signInAs(uniqueEmail('stranger'));            // signed in, not registered
const again = await signIn(email);                                   // an account that exists already
```

Test files run one at a time (`--test-concurrency=1`): the test of the last remaining Task Master
stands the other Task Masters down while it runs, and puts them back.

The secret key is read from `supabase status` at run time and is only used to arrange users. It is
never written to a file.
