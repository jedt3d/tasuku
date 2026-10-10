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
    uuid user_id PK
    string email UK
    string language
    bigint organization_id FK
    datetime created_at
  }
  ORGANIZATION {
    bigint id PK
    string name UK
    datetime created_at
  }
  TASK {
    bigint id PK
    string title
    string description
    string status
    date due_date
    uuid owner_id FK
    uuid customer_id FK
    bigint organization_id FK
    bigint earlier_task_id FK
    datetime closes_at
    datetime created_at
  }
  SETTINGS {
    boolean id PK
    int closure_hours
    int reminder_hours
  }
  COLLABORATOR {
    bigint task_id FK
    uuid staff_id FK
    datetime added_at
  }
  TIMELINE_ENTRY {
    bigint id PK
    bigint task_id FK
    string kind
    uuid author_id FK
    uuid subject_id FK
    uuid customer_id FK
    string body
    string status
    datetime created_at
    datetime edited_at
    datetime deleted_at
    uuid deleted_by FK
    boolean has_files
  }
  ATTACHMENT {
    bigint id PK
    bigint entry_id FK
    bigint task_id FK
    string path
    string name
    string mime_type
    bigint size
    datetime deleted_at
    uuid deleted_by FK
  }
  EMAIL_OUTBOX {
    bigint id PK
    bigint entry_id FK
    uuid recipient FK
    string kind
    datetime created_at
    datetime claimed_at
    int attempts
    datetime sent_at
  }
  STAFF ||--o{ TASK : owns
  CUSTOMER |o--o{ TASK : "is added to"
  ORGANIZATION |o--o{ TASK : labels
  ORGANIZATION |o--o{ CUSTOMER : "belongs to"
  TASK }o--o| TASK : "refers to"
  TASK ||--o{ COLLABORATOR : has
  STAFF ||--o{ COLLABORATOR : is
  TASK ||--o{ TIMELINE_ENTRY : records
  STAFF |o--o{ TIMELINE_ENTRY : writes
  STAFF |o--o{ TIMELINE_ENTRY : "is the subject of"
  CUSTOMER |o--o{ TIMELINE_ENTRY : "writes or is the subject of"
  TIMELINE_ENTRY ||--o{ ATTACHMENT : carries
  TASK ||--o{ ATTACHMENT : holds
  STAFF |o--o{ ATTACHMENT : deletes
  TIMELINE_ENTRY ||--o{ EMAIL_OUTBOX : "is announced by"
```

## Gaps to confirm

- EMAIL_OUTBOX (#10) is built (table `private.email_outbox`, not reachable through the API). One row per person to tell about a Timeline entry; `kind` is `added`, `comment`, `resolved` or `cancelled`, since #11 `reminder` or `closed`, and since #12 `assigned` (to the new Owner) or `unassigned` (to the previous one). The two of #12 are queued by `reassign_task` itself, on the `owner_changed` entry; every other kind but the reminder by the trigger on the Timeline. A reminder is not an entry of its own: it hangs on the entry that made the Task Resolved, so an entry holds one email of each kind for a recipient, which keeps a reminder to once per Resolved. `recipient` is an Auth account id, a Staff member or a Customer, so no line is drawn to either. A row is dropped unsent when its comment was deleted or its recipient left the Task or Staff, a `resolved` or `reminder` row when the Task has moved on since, and an `assigned` or `unassigned` row that a later reassignment has made wrong; `sent_at` is set by the Edge Function `send-emails`.
- Request is not drawn: spec #1 has no Request record (see the Request question in 02, 03 and 06).
- Thread is not drawn: the Storybook README says it is planned for a later release.
- TIMELINE_ENTRY (#5) is built. Its kind is `comment`, `opened`, `moved`, `collaborator_added` or `collaborator_removed` (#6), `customer_added` or `customer_removed` (#7), `attachment_deleted` (#9), `owner_changed` (#12); later issues add kinds. `subject_id` is set only on the two Collaborator kinds, where it names the Staff member added or removed, and on `owner_changed`, where it names the new Owner; `author_id` is who did it. No entry names the previous Owner: it is whoever the entries before made the Owner, starting from the author of `opened`. A comment deleted by a Task Master is the same entry with its `body` emptied and `deleted_at` set, not a separate kind. `status` is set only on `moved`. `author_id` and `customer_id` are both empty when Tasuku itself made the entry.
- `author_id` names a Staff member only. `customer_id` (#7) names the Customer an entry is by or about: the author of a comment a Customer wrote, and the Customer a `customer_added` or `customer_removed` entry concerns (`author_id` is then the Staff member who did it). A comment has exactly one of the two. A `moved` entry (#8) names who moved the Task in the same way: a Staff member in `author_id`, a Customer in `customer_id`, neither when Tasuku did it.
- A Staff member's email can be the Customer of a Task (decided by the user in #7); what they write there is stored with `author_id`, as Staff, and so is a status change they make as the Customer (#8).
- SETTINGS (#11) is built (table `settings`, one row): the closure period (48 h) and the reminder lead time (24 h), in whole hours, the lead time at least 1 and shorter than the period, the period 720 at most. Staff read it, a Task Master changes it. No line is drawn: it relates to no Task. `TASK.closes_at` is set from it when a Task becomes Resolved and is empty in every other status.
- A Task Master is a flag on STAFF, not a separate entity (spec #1, Identity and roles).
- STAFF (#2, #3), TASK (#4), TIMELINE_ENTRY (#5), COLLABORATOR (#6, table `task_collaborators`, keyed by `task_id` and `staff_id`), ORGANIZATION and CUSTOMER (#7) are built (`supabase/migrations/`). The key of STAFF is the Auth account id, `user_id`; the key of TASK is a running number, so every `task_id` is drawn as `bigint`. The key of TIMELINE_ENTRY is a running number too, so ATTACHMENT.entry_id is drawn as `bigint`. The key of CUSTOMER is the Auth account id, `user_id`, like STAFF; the key of ORGANIZATION is a running number, and its name is unique whatever its capitals. The reference of a TASK to an earlier one is `earlier_task_id` (#8): it must be lower than the Task's own number, and it is a detail whoever writes on the Task may change.
- ATTACHMENT (#9) is built (table `attachments`). A file is part of a comment: `entry_id` is that comment, and `has_files` on the entry lets a comment have files and no text. `path` names the object in the private Storage bucket `attachments` (`<task>/<uuid>`); the bytes are not in the database. `mime_type` and `size` are what Storage recorded. A deleted file is the same row with `name` emptied and `deleted_at`, `deleted_by` set, and an `attachment_deleted` entry on the Timeline; deleting a comment deletes its files without that entry. The object itself is erased through Storage afterwards.
- A Task's details change only while it is not Done or Cancelled (#4, from story 70). Spec #1 does not say this about details outright.
- The Owner of a Task is never also its COLLABORATOR. Reassigning the Owner (#12, `reassign_task`, a Task Master only) keeps it true: the previous Owner gets a COLLABORATOR row, also when removed from Staff, and the new Owner's row is deleted. Neither writes a Collaborator entry on the Timeline; the one entry is `owner_changed`. A trigger on COLLABORATOR reads the Owner again once it holds the Task, so adding someone at the moment the Task is given to them is refused.
