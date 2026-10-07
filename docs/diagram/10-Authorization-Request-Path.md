# 10-Authorization-Request-Path

Source: ADR 0002, ADR 0003, spec #1 section Task model (status changes). Colour key: blue = the app, violet = Supabase API and database function, green = Postgres with RLS, light red = refused. Hiding something in the UI is never a security measure.

```mermaid
---
title: 10-Authorization-Request-Path
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
  participant App as Tasuku app
  participant API as Supabase API
  participant DB as Postgres with RLS
  participant Fn as Status function
  Note over App,DB: No server of our own in between (ADR 0002), except the invite function that creates accounts (ADR 0003)
  rect rgb(220, 225, 248)
    App->>API: read the Timeline of a Task
    API->>DB: query as the signed-in user
    alt Customer on the Task
      DB-->>App: comments and events, never a Thread
    else Staff
      DB-->>App: the whole Task
    else Anyone else
      DB-->>App: no rows
    end
  end
  rect rgb(244, 218, 219)
    App->>API: update the status column directly
    API->>DB: write as the signed-in user
    DB-->>App: refused, the column cannot be written
  end
  rect rgb(211, 233, 227)
    App->>API: ask for a status change
    API->>Fn: call the database function
    Fn->>DB: check role and current status
    alt Allowed
      DB-->>App: status changed, Timeline event added
    else Not allowed
      DB-->>App: error, nothing changes
    end
  end
```

## Gaps to confirm

- The policies on STAFF (#2, #3) and TASK (#4) exist in `supabase/migrations/`: Staff read every Task, anyone else gets no rows, and the status column is granted to nobody, so the first two blocks are built for Staff. The Timeline is built for Staff too (#5): Staff read every entry and anyone else gets no rows. The Customer branch waits for #7.
- The only status change built so far is automatic: the first Staff comment on an Open Task moves it to In progress and adds the Timeline event (#5), with no function for the app to call. The status functions of the third block come with #8, so no name is shown.
- Attachment files are protected by storage rules and signed URLs (spec #1), not by this path; a separate diagram would cover them.
- ADR 0002 requires the policies to be tested as a Customer, a non-member Staff, a Collaborator, an Owner and a Task Master; 11 shows what each of them may do.
