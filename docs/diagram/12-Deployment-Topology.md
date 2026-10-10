# 12-Deployment-Topology

Source: docs/deploy.md (sections 1-5 and 8, status list) and ADR 0001. Colour key: grey = people and machines, blue = Cloudflare, violet = Supabase, yellow = temporary or not in place yet. The dotted lines are open steps or one-off checks.

```mermaid
---
title: 12-Deployment-Topology
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
flowchart TB
  subgraph people["People and machines"]
    direction LR
    user(["Staff or Customer<br/>in a browser"]):::grey
    dev(["Developer machine"]):::grey
    devserver["Dev server<br/>localhost:5173"]:::grey
  end
  subgraph cf["Cloudflare"]
    direction LR
    dns["DNS zone servicework.cloud<br/>record made by the Custom Domain"]:::blue
    worker["Worker tasuku<br/>static assets, SPA fallback<br/>no workers.dev address"]:::blue
  end
  subgraph supa["Supabase cloud, ap-southeast-1"]
    direction LR
    auth["Auth<br/>Site URL and redirect allow list"]:::violet
    db[("Postgres with RLS<br/>12 migrations, sign-up closed")]:::violet
    fn["Edge Function send-emails<br/>deployed, no secrets yet"]:::yellow
  end
  subgraph mail["Email"]
    direction LR
    builtin["Supabase built-in sender<br/>org members only, 2 emails per hour"]:::yellow
    mailgun[["Mailgun<br/>SMTP for Auth, HTTP API for notifications<br/>before real use"]]:::yellow
  end
  user -->|"tasuku.servicework.cloud"| dns
  dns --> worker
  user -->|"magic link, publishable key"| auth
  user -->|"queries, RLS decides"| db
  auth --> builtin
  builtin -.->|"replaced by"| mailgun
  db -.->|"outbox, pg_net and pg_cron"| fn
  fn -.->|"HTTP API, open"| mailgun
  dev -->|"npx wrangler deploy"| worker
  dev -->|"supabase db push"| db
  devserver -.->|"redirect allowed"| auth

  classDef blue    fill:#dce1f8,stroke:#4465e9,stroke-width:2px,color:#1d1d1d
  classDef lblue   fill:#ddeefc,stroke:#4ba1f1,stroke-width:2px,color:#1d1d1d
  classDef violet  fill:#ecdcf2,stroke:#ae3ec9,stroke-width:2px,color:#1d1d1d
  classDef orange  fill:#f8e2d4,stroke:#e16919,stroke-width:2px,color:#1d1d1d
  classDef yellow  fill:#fef4d6,stroke:#f1ac4b,stroke-width:2px,color:#1d1d1d
  classDef green   fill:#d3e9e3,stroke:#099268,stroke-width:2px,color:#1d1d1d
  classDef lred    fill:#f4dadb,stroke:#f87777,stroke-width:2px,color:#1d1d1d
  classDef grey    fill:#eceef0,stroke:#9fa8b2,stroke-width:2px,color:#1d1d1d
```

## Gaps to confirm

- Notification emails (#10, deploy.md section 8) never use the built-in sender: the database calls the Edge Function `send-emails`, which sends through Mailgun's HTTP API because Edge Functions cannot open ports 25 and 587. The function is deployed but has no secrets, and the Vault has none, so nothing is sent and the outbox only fills. The two invite functions (deploy.md section 6) are deployed and still not drawn.
- The build exists since #2 (`app/`): it takes the Supabase URL and the publishable key from environment variables and refuses to run without them. It is deployed to the Worker; the config is `app/wrangler.jsonc`.
- The seed of the first Task Master is a script (`app/scripts/seed.mjs`, deploy.md section 5); it was run once against the cloud project and is not drawn.
- The local Supabase stack from #2 is not drawn; deploy.md says it does not use the cloud redirect list.
- Earlier diagrams named Cloudflare Pages; deploy.md line 12 says the deployed target is a Worker with static assets.
