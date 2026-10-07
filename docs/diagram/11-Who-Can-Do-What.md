# 11-Who-Can-Do-What

Source: Spec #1 (GitHub issue), ADR 0002, TaskScreen and CustomerTaskScreen in the Storybook. Colour key: grey = start, orange = question, blue = what that viewer may do, light red = no access. The five outcomes are the five roles ADR 0002 says to test.

```mermaid
---
title: 11-Who-Can-Do-What
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
flowchart TD
  start(["Signed-in person<br/>opens a Task"]):::grey --> isStaff{"Registered<br/>as Staff?"}:::orange
  isStaff -->|"no"| isCust{"Customer<br/>on this Task?"}:::orange
  isCust -->|"no"| none(["Sees nothing"]):::lred
  isCust -->|"yes"| cust["Customer<br/>Reads the Timeline, never a Thread<br/>Comments and attaches files<br/>Marks Done, Reopens a Resolved Task<br/>Cancels until it is Resolved"]:::blue
  isStaff -->|"yes"| isMaster{"Task Master?"}:::orange
  isMaster -->|"yes"| master["Task Master<br/>Reads every Task, acts on any Task<br/>Adds Collaborators, reassigns the Owner<br/>Resolve, Done, Reopen, Cancel<br/>Deletes a comment, leaving a marker"]:::blue
  isMaster -->|"no"| isOwner{"Owner of<br/>this Task?"}:::orange
  isOwner -->|"yes"| owner["Owner<br/>Comments and attaches files<br/>Mark Resolved, Cancel<br/>Adds and removes Collaborators<br/>Deletes an attachment<br/>Done alone if no Customer"]:::blue
  isOwner -->|"no"| isCollab{"Collaborator<br/>on this Task?"}:::orange
  isCollab -->|"yes"| collab["Collaborator<br/>Reads every Task<br/>Comments, attaches files, edits details<br/>Cannot change the Owner, close or cancel<br/>Does not manage who is on the Task"]:::blue
  isCollab -->|"no"| reader["Other Staff<br/>Reads every Task, read-only"]:::blue

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

- Whether one email can be both Staff and Customer is not described.
- A Task Master who is also the Owner is drawn as Task Master, who can do everything an Owner can.
- The Customer can add attachments through the Timeline (stories 47-48); only an Owner or Task Master can delete one (story 54).
- Whether a Collaborator may remove themselves is not covered by the spec. As built in #6 they cannot: only the Owner and a Task Master remove a Collaborator (confirmed by the user, 7 Oct 2026).
- As built in #6, nobody adds or removes a Collaborator once the Task is Done or Cancelled, and a person removed from Staff cannot be added until a Task Master adds them back to Staff (both confirmed by the user, 7 Oct 2026). The spec does not say this outright.
- The Collaborator box follows CONTEXT.md as changed in #3. Spec #1 (story 30) still describes a Collaborator as commenting and attaching only.
