# 06-End-to-End-Flow

Source: CONTEXT.md. Colour key: grey = Customer, green = Staff side (Staff, Task Master, Owner), orange = decision, blue = the Task being worked, light red = cancelled.

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
  start(["Customer needs support"]):::grey --> report["Customer<br/>reports a Request"]:::grey
  report --> assess["Staff member<br/>assesses the Request"]:::green
  assess --> accept{"Accept as work?"}:::orange
  accept -->|"no"| cancel(["Request cancelled"]):::lred
  accept -->|"yes"| open["Staff opens<br/>a Task"]:::green
  open --> track["Task is tracked<br/>Owner is responsible"]:::blue
  track -.->|"as needed"| tm["Task Master adds Customers<br/>or reassigns the Owner"]:::green
  tm -.-> track
  track --> propose["Owner proposes<br/>closing the Task"]:::green
  propose --> agree["Both sides agree<br/>it is finished"]:::blue
  agree --> done(["Task finished"]):::grey

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

- How the Customer who reported gets added to the Task (CONTEXT.md says only a Task Master adds Customers).
- Who becomes the first Owner when a Task is opened.
- What happens if the other side does not agree to close; the flow only shows the agreed path.
- How a Customer sends a Request (channel).
