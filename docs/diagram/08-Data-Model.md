# 08-Data-Model

Source: Spec #1 (GitHub issue) sections Task model, Timeline and Attachments. Colour key: clean lines for technical reference, entities blue, rows alternate. Attribute names are working labels, not final column names.

```mermaid
---
title: 08-Data-Model
config:
  look: classic
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
  flowchart:
    curve: basis
---
erDiagram
  STAFF {
    uuid user_id PK
    string email UK
    string name
    boolean is_task_master
    string language
    datetime removed_at
  }
  CUSTOMER {
    uuid id PK
    string email UK
    string language
    uuid organization_id FK
  }
  ORGANIZATION {
    uuid id PK
    string name
  }
  TASK {
    bigint id PK
    string title
    string description
    string status
    date due_date
    uuid owner_id FK
    uuid customer_id FK
    uuid organization_id FK
    bigint refers_to_id FK
    datetime created_at
  }
  COLLABORATOR {
    bigint task_id FK
    uuid staff_id FK
  }
  TIMELINE_ENTRY {
    uuid id PK
    bigint task_id FK
    string kind
    datetime created_at
  }
  ATTACHMENT {
    uuid id PK
    uuid entry_id FK
    string file_name
    int size_bytes
  }
  STAFF ||--o{ TASK : owns
  CUSTOMER |o--o{ TASK : "is added to"
  ORGANIZATION |o--o{ TASK : labels
  ORGANIZATION |o--o{ CUSTOMER : "belongs to"
  TASK }o--o| TASK : "refers to"
  TASK ||--o{ COLLABORATOR : has
  STAFF ||--o{ COLLABORATOR : is
  TASK ||--o{ TIMELINE_ENTRY : records
  TIMELINE_ENTRY ||--o{ ATTACHMENT : carries
```

## Gaps to confirm

- Request is not drawn: spec #1 has no Request record (see the Request question in 02, 03 and 06).
- Thread is not drawn: the Storybook README says it is planned for a later release.
- TIMELINE_ENTRY.kind is comment, event or tombstone (a comment deleted by a Task Master). How the author is stored (Staff or Customer) is not decided in the spec.
- Closure period (48 h) and reminder lead time (24 h) are stored settings, left out as they do not relate to a Task.
- A Task Master is a flag on STAFF, not a separate entity (spec #1, Identity and roles).
- STAFF (#2, #3) and TASK (#4) are built (`supabase/migrations/`). The key of STAFF is the Auth account id, `user_id`; the key of TASK is a running number, so every `task_id` is drawn as `bigint`. TASK has no `customer_id`, `organization_id` or `refers_to_id` yet. The other entities are still drawn from the spec, and their key and column names may change when they are built.
- A Task's details change only while it is not Done or Cancelled (#4, from story 70). Spec #1 does not say this about details outright.
