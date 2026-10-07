# 06-End-to-End-Flow

Source: CONTEXT.md and spec #1 (GitHub issue). Colour key: grey = Customer, green = Staff side (Staff, Task Master, Owner), orange = decision, blue = the Task being worked, light red = cancelled, light blue frame = later release, not in v1.

```mermaid
---
title: 06-End-to-End-Flow
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
  subgraph later["Later release: Request (not in v1)"]
    start(["Customer needs support"]):::grey --> report["Customer<br/>reports a Request"]:::grey
    report --> assess["Staff member from the rotation<br/>assesses the Request"]:::green
    assess --> accept{"Accept as work?"}:::orange
    accept -->|"no"| cancel(["Request cancelled"]):::lred
  end
  direct(["Staff member has<br/>work to record"]):::green --> open["Staff member opens a Task<br/>and becomes its Owner"]:::green
  accept -->|"yes, the reporter becomes<br/>the Task's Customer"| open
  open --> track["Task is tracked<br/>Owner is responsible"]:::blue
  track -.->|"as needed"| tm["Staff add a Customer or Collaborators<br/>Task Master can reassign the Owner"]:::green
  tm -.-> track
  track --> propose["Owner proposes closing<br/>Task becomes Resolved"]:::green
  propose --> answer{"Customer's answer"}:::orange
  answer -->|"Reopen"| track
  answer -->|"Done, or no answer<br/>for 48 hours"| done(["Task Done"]):::grey
  track -.->|"no Customer:<br/>Owner closes alone"| done
  style later fill:none,stroke:#4ba1f1,stroke-width:2px,color:#4ba1f1


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

- None open. Who becomes Owner, how the reporter becomes the Customer and what happens when the Customer does not agree are settled in spec #1.
