# 09-Sign-In-And-Session

Source: Spec #1 (GitHub issue) stories 1-8 and 25, ADR 0003, SignInScreen in the Storybook. Colour key: blue = people and the app, violet = Supabase Auth, notes = rules. The alt block shows that what a person sees is decided after sign-in.

```mermaid
---
title: 09-Sign-In-And-Session
config:
  look: handDrawn
  handDrawnSeed: 3
  theme: base
  themeVariables:
    fontFamily: "Shantell Sans, Comic Sans MS, cursive"
    fontSize: 16px
    background: "#f9fafb"
    lineColor: "#1d1d1d"
    textColor: "#1d1d1d"
    primaryTextColor: "#1d1d1d"
    primaryColor: "#dce1f8"
    primaryBorderColor: "#4465e9"
    secondaryColor: "#ecdcf2"
    secondaryBorderColor: "#ae3ec9"
    tertiaryColor: "#d3e9e3"
    tertiaryBorderColor: "#099268"
    clusterBkg: "transparent"
    clusterBorder: "#4ba1f1"
    edgeLabelBackground: "#f9fafb"
    noteBkgColor: "#fef4d6"
    noteBorderColor: "#f1ac4b"
    noteTextColor: "#1d1d1d"
    actorBkg: "#dce1f8"
    actorBorder: "#4465e9"
    actorTextColor: "#1d1d1d"
    actorLineColor: "#9fa8b2"
    signalColor: "#1d1d1d"
    signalTextColor: "#1d1d1d"
    activationBkgColor: "#ecdcf2"
    activationBorderColor: "#ae3ec9"
    labelBoxBkgColor: "#f8e2d4"
    labelBoxBorderColor: "#e16919"
    loopTextColor: "#1d1d1d"
    attributeBackgroundColorOdd: "#ffffff"
    attributeBackgroundColorEven: "#f3f5fc"
    taskBkgColor: "#dce1f8"
    taskBorderColor: "#4465e9"
    taskTextColor: "#1d1d1d"
    activeTaskBkgColor: "#d3e9e3"
    activeTaskBorderColor: "#099268"
    doneTaskBkgColor: "#eceef0"
    doneTaskBorderColor: "#9fa8b2"
    critBkgColor: "#f4dadb"
    critBorderColor: "#e03131"
    sectionBkgColor: "#f3f5fc"
    sectionBkgColor2: "#ffffff"
    gridColor: "#d6dae0"
    todayLineColor: "#e16919"
    pie1: "#4465e9"
    pie2: "#ae3ec9"
    pie3: "#099268"
    pie4: "#e16919"
    pie5: "#f1ac4b"
    pie6: "#9fa8b2"
    pieStrokeColor: "#1d1d1d"
    pieOuterStrokeColor: "#1d1d1d"
    cScale0: "#dce1f8"
    cScale1: "#ecdcf2"
    cScale2: "#d3e9e3"
    cScale3: "#f8e2d4"
    cScale4: "#fef4d6"
    cScale5: "#f4dadb"
    cScale6: "#dbf0e0"
    cScale7: "#eceef0"
    git0: "#4465e9"
    git1: "#ae3ec9"
    git2: "#099268"
    git3: "#e16919"
  themeCSS: ".rough-node path[stroke-width='4'] { stroke-width: 6.4px !important; } .cluster path { stroke: #4ba1f1 !important; stroke-width: 2px !important; } .cluster[id$=-outside] path, .cluster[id$=-dev] path { stroke: #9fa8b2 !important; }"
  flowchart:
    curve: basis
---
sequenceDiagram
  participant Staff as Staff member
  participant P as Person signing in
  participant App as Tasuku app
  participant Fn as Invite function
  participant Auth as Supabase Auth
  participant DB as Postgres with RLS
  participant Mail as Email sender
  Note over Fn,Auth: Sign-up is closed. Only the invite function creates an account (ADR 0003)
  opt First time a Customer is added to a Task
    Staff->>App: add Customer email to a Task
    App->>Fn: add this Customer
    Fn->>DB: add to the Task, as the caller
    DB-->>Fn: refused, done, or no account yet
    Fn->>Auth: create the account if there is none, then add again
    DB->>Mail: added to a Task, link to the Task
    Mail-->>P: email with the Task link
  end
  P->>App: enter email on the sign-in page
  App->>Auth: request a magic link
  alt Email has an account
    Auth->>Mail: send the magic link
    Mail-->>P: email with the magic link
  else No account
    Auth-->>App: nothing is sent
  end
  P->>Auth: click the link
  Auth-->>App: session
  Note over Auth,App: Session ends 7 days after sign-in, for everyone
  App->>DB: what may this email see
  alt Email is registered as Staff
    DB-->>App: every Task, write only on own Tasks
  else Email is a Customer on a Task
    DB-->>App: only their Tasks, Timeline only
  else Neither, for example Staff who were removed
    DB-->>App: nothing
  end
  Note over P,App: Session expired: ask for a new magic link
```

## Gaps to confirm

- Session length is one setting for the whole project, so Staff and Customers both get 7 days from sign-in (decided in #3; spec #1 still says 30 days for Staff). On the cloud project it needs the Pro plan and is not set yet (deploy.md section 7).
- A signed-in person with no access sees a message that the email has no access to any Task yet (#2).
- The sign-in page tells a person that their email is not registered, instead of always saying "check your email" (decided in PR #17). It is not drawn.
- At sign-in the language stored for the person always wins over the one the browser remembered (decided in PR #17). It is not drawn.
- Magic link lifetime and rate limits are not described.
- Adding a Customer is built (#7, `invite-customer`): the database decides whether the caller may, and the function creates an account only for an Owner or Task Master and only when the email has none. The email to the Customer is not sent yet (#10); the Task page asks Staff to tell them.
- Installation seeding of the first Task Master (story 7) is a script run with the secret key (`app/scripts/seed.mjs`), not the invite function. The Task Master registering Staff emails (story 9) uses the invite function from #3. Both are separate flows, not drawn.
