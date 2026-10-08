# Authoring BPMN diagrams (`diagram_type: "bpmn"`)

Theory, element catalogue and rule sources: `references/theory-bpmn.md`.
Doctor example: `examples/support-ticket.bpmn.json`.

## When to use

Use BPMN for **order of work, who does it, what interrupts it and what is
exchanged with outside parties** — AS-IS / TO-BE process maps, automation
specs, handoff analysis. Use VSM for lead time and waste, SIPOC for scope
before modelling, a WBS for deliverables. One level per diagram (strategic
or operational); push detail into collapsed sub-processes.

## IR

Top level: `schema_version: 1`, `diagram_type: "bpmn"`, `meta`, `pools`,
`nodes`, `flows`, optional `happy_path`, optional `cards`.

| Field | Values | Notes |
|---|---|---|
| `meta.conformance` | `descriptive` · `descriptive+` · `analytic` | Declared palette (R-31). `descriptive+` = Descriptive + default flow, send/receive tasks, timer/message/error boundary events, catching message/timer intermediate events, inclusive gateway |
| `meta.variant` / `meta.level` | `as-is`·`to-be` / `strategic`·`operational` | Shown in the summary card |
| `meta.task_width` | 100–200 | Optional floor; activities already auto-size to their longest label (three lines max) |
| `meta.summary` | boolean | `false` hides the "Processo em números" card |
| `pools[]` | `{id, label, black_box?, lanes?[{id,label}]}` | Order = top to bottom. Put external parties in black-box pools (no lanes, no nodes) |
| `nodes[].kind` | `event` `task` `subprocess` `call-activity` `gateway` `data-object` `data-store` `annotation` | |
| `nodes[].lane` / `pool` | ids | `lane` implies its pool. A pool without lanes gets one implicit lane |
| `nodes[].event` | `start` `intermediate` `end` | Required for events unless `attached_to` is set |
| `nodes[].trigger` | `none` `message` `timer` `error` `signal` `escalation` `conditional` `terminate` `link` | `terminate` only on end events |
| `nodes[].throwing` | boolean | Filled marker (intermediate). End events with a trigger are throwing |
| `nodes[].attached_to` | activity id | Boundary event on the activity's bottom border; no `col`/`row` |
| `nodes[].interrupting` | boolean (default true) | `false` = dashed rings |
| `nodes[].task_type` | `none` `user` `service` `manual` `send` `receive` `script` `business-rule` | Marker at top-left |
| `nodes[].gateway` | `exclusive` `parallel` `inclusive` `event-based` | Default `exclusive` |
| `nodes[].marker` | `loop` `mi-parallel` `mi-sequential` | Activities only (analytic palette) |
| `nodes[].col` / `row` | 1–30 / 0–5 | Optional grid overrides (see layout) |
| `nodes[].owner` / `sla` / `note` | text | Details panel only |
| `flows[].type` | `sequence` (default) `message` `association` | |
| `flows[].from` / `to` | node id, or a pool id (message flows only) | |
| `flows[].label` | text | Gate answer ("Sim"), message name ("Pedido de compra") |
| `flows[].default` / `conditional` | boolean | Slash / mini-diamond at the source |
| `flows[].route` | `auto` `horizontal-first` `vertical-first` | Elbow order for flows that change row |
| `happy_path` | node ids | Must follow sequence flows; drawn emphasised, placed on row 0 first |

## Layout model

- Pools and lanes stack **in authored order** — draw them the way a person
  would (requester on top, back office below). The layout never asks you to
  reorder lanes; the pool gap holds the message-flow labels.
- **Columns** default to the longest sequence path from the start events
  (back edges are ignored), so authors normally give no coordinates. A
  decision branch into the adjacent lane (single-entry target, XOR/OR split)
  shares the gateway's column and drops straight down or up. Empty columns
  collapse, so an explicit `col` only fixes relative order. A boundary event
  shares its activity's column; data and annotations take their association
  partner's column and the row below it.
- **Rows** inside a lane default to 0; the happy path claims row 0 first and
  other nodes in the same lane and column drop to the next free row.
- **Sizes come from content**: activity width fits the longest label in
  three lines, a column is as wide as its widest node (side labels may spill
  into half of each gap), a gap widens only where a flow label needs room,
  and a lane is as tall as its rows. The black-box band is one text line.
- **Routes** are orthogonal with at most two bends. Each flow has ranked
  candidates (straight, elbow vertical-first / horizontal-first, a
  mid-gap step, a channel above or below the row) and the layout keeps the
  one with the fewest defects: shape or label collisions, proper crossings,
  shared corridors, cramped turns, border runs, shared ports. Backward flows
  (rework loops) leave sideways and turn into the target, or run in a
  dedicated channel above the upper row / below the lower row. Message flows
  are vertical (offset a quarter box when the side also carries a sequence
  flow) and meet a black-box pool at its border.
- The font is chosen so the smallest label stays ≥ 8 px on a 1440×900
  screen; very narrow processes are widened to ~1.9:1 so the page never
  scrolls.

## Rules (details and sources in `theory-bpmn.md` §5)

HARD (the render fails):
- R-BPMN-01 sequence flow never leaves its pool (or touches a pool).
- R-BPMN-03 message flow only between two different pools.
- R-BPMN-04 message flow never on a gateway or a non-message event.
- R-BPMN-05 no incoming sequence flow on a start event.
- R-BPMN-06 no outgoing message flow on a start event.
- R-BPMN-07 no outgoing sequence flow on an end event; terminate is end-only.
- R-BPMN-08 a pool with a start event has an end event and vice versa.
- R-BPMN-11 boundary event: attached to an activity in the same lane, no incoming, at least one outgoing (SOFT: exactly one).
- R-BPMN-12 a gateway must split or join (not 1-in/1-out, not 0-out).
- R-BPMN-13 no condition/label/default on parallel or event-based gates.
- R-BPMN-14 default flow only from XOR/OR gateways or activities, one per source.
- R-BPMN-15 conditional flow only from an activity that has another outgoing flow.
- R-BPMN-18 event-based gateway: ≥ 2 branches, each to a catching event or receive task.
- R-BPMN-21 every flow node reachable from a start event (dead ends are SOFT).
- R-BPMN-23 annotations never on sequence/message flows.
- R-BPMN-24 data only through associations; associations need a data/annotation end.
- R-BPMN-25 black-box pools hold no lanes and no nodes.
- R-BPMN-28 more than 20 activities in one pool (SOFT above 10).
- R-BPMN-30 every node resolves to an existing pool and lane.

SOFT (advisories; blocking in `showcase` unless waived):
- R-BPMN-09 explicit start and end per pool · R-BPMN-10 one start per pool.
- R-BPMN-16 label every non-default XOR/OR gate and the split question.
- R-BPMN-17 no labels on AND, event-based or merge gateways.
- R-BPMN-19 split/join type mismatch (deadlock / multiple triggering).
- R-BPMN-20 a gateway that both joins and splits.
- R-BPMN-21 dead end (no path to an end event).
- R-BPMN-22 activity without incoming or outgoing flow.
- R-BPMN-26 tasks are verb + object (PT-BR: infinitive first); no generic verbs; unique end-state names; intermediate events labelled.
- R-BPMN-27 message flows named with a noun.
- R-BPMN-29 implicit merge (activity with several incoming flows).
- R-BPMN-30 empty lane.
- R-BPMN-31 conformance undeclared, or an element outside the declared palette.

Not modelled (v1): expanded sub-processes (R-02 does not apply), groups,
event/transaction sub-processes, complex gateways, compensation.

Waiver: `meta.waivers: [{ "rule": "R-BPMN-16", "subject": "G1", "reason": "…" }]`.
The subject is the node id (gateway rules use the gateway id, message rules
the flow id, pool rules the pool id, R-31 on meta uses `"meta"`).

## Repair recipes (layout diagnostics)

| Diagnostic | Fix |
|---|---|
| `"X" and "Y" both sit in lane …, column …, row …` | Give one an explicit `row` (0–5) or `col` |
| `Flow "A" -> "B" runs through "N"` | Move `N` to another row/column, or set the flow's `route` to the other elbow order |
| `Flow … crosses the label of "N"` | Move `N` or the flow's endpoint one row down |
| `"N" has flows on its top and bottom, leaving no room for its label` | Move one neighbour to the same row as `N` so the flow enters from the side |
| `Label … does not fit three lines` | Shorten the label or raise `meta.task_width` |
| `Boundary label … does not fit two lines` | Short state phrase ("4 h sem solução") |
| `Flow label … has no segment long enough` | Shorten the gate label or add a column between the nodes |
| `Pool label … does not fit its band` | Shorten the pool name |
| `happy_path has no sequence flow` | Fix the order or the flow list |
| `Flow … crosses flow … and no route candidate avoids it` | Keep the lanes as they are: give the named endpoint another `row` (0–5) or `col` so the flow has a clear channel |
| `Message flow … runs through "N" on its way to pool …` | Give the message's activity a `col` with nothing between it and that pool (or move `N`) |
| `composition/*` crossing or corridor | Move a branch to another row; loops cross fewer flows when their target is on the happy path row |

## Minimal example

```json
{
  "schema_version": 1,
  "diagram_type": "bpmn",
  "meta": { "title": "Aprovação de fatura", "locale": "pt-BR", "conformance": "descriptive" },
  "pools": [
    { "id": "F", "label": "Fornecedor", "black_box": true },
    { "id": "P", "label": "Financeiro", "lanes": [{ "id": "A", "label": "Analista" }] }
  ],
  "nodes": [
    { "id": "S", "lane": "A", "kind": "event", "event": "start", "trigger": "message", "label": "Fatura recebida" },
    { "id": "T", "lane": "A", "kind": "task", "task_type": "user", "label": "Validar fatura" },
    { "id": "E", "lane": "A", "kind": "event", "event": "end", "label": "Fatura validada" }
  ],
  "flows": [
    { "type": "message", "from": "F", "to": "S", "label": "Fatura" },
    { "from": "S", "to": "T" },
    { "from": "T", "to": "E" }
  ]
}
```
