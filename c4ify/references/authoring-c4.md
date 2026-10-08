# Authoring a C4 model

Read with `schemas/c4.schema.json` and one example in `examples/`. Theory and
sources: `theory-c4.md` (open it for a rule's rationale, not by default).

## When to use which view

| The reader asks | View `type` | `scope` |
|---|---|---|
| Which systems do we run and who uses them? | `systemLandscape` | none (`model.enterprise` names it) |
| What is this system, who uses it, what does it depend on? | `systemContext` | a software system |
| What is it made of, and how do the parts talk? | `container` | a software system |
| How is one container organised inside? | `component` | a container |

Start with `systemContext` + `container`; add `component` only where it adds
value; add `systemLandscape` when there are several systems of your own.

## One model, many views

Write every element and relationship **once** in `model`; views only select.

| Field | Meaning |
|---|---|
| `model.elements[].type` | `person`, `softwareSystem`, `container`, `component` |
| `parent` | container → its software system; component → its container (R-C4-01) |
| `name` | ≤ 60 chars, wraps to 2 lines |
| `description` | one responsibility sentence, ≤ 4 lines in the box (R-C4-06) |
| `technology` | containers and components: framework, runtime or product (R-C4-07) |
| `external` | owned by someone else (grey); people too (`External Person`) |
| `shape` | `database` draws a cylinder; stores and queues are also detected from `technology` |
| `brand` | optional simple-icons id/alias for a small logo (`references/brand-marks.md`) |
| `model.relationships[]` | `from`, `to`, `description` (intent, R-C4-03), `technology` (protocol, R-C4-08), `async` (dashed) |
| `views[].key` | file name of the view (`<key>.html`); ASCII id |
| `include` / `exclude` | add or remove elements from the default selection |
| `exclude_relationships` | hide arrows as drawn: `[{ "from": "*", "to": "config" }]` (`*` matches any element) |
| `label` | short name of the view in the navigation bar (needed when two views share type and scope) |
| `layout` | pins the search: `direction` (`TB`/`LR`), `max_per_row` (2-8), `element_width`, `gap_x`, `gap_y` (spacing still grows on retries) |
| `placement` | `{ "<id>": { "row": n, "col": n } }`: visual cell, row 0 at the top, col 0 at the left, `.5` between columns, same meaning in both orientations |
| `routes` | per visible pair `{ from, to, fromSide, toSide, route, via, labelAt, labelDx, labelDy, labelSegment }` |
| `chapters` | guided views (≤ 5) focusing elements this view draws |
| `meta.glossary` | `{ "ERP": "…", "EF Core": "…" }`: explains acronyms (a key with spaces also covers its first word); each view prints the terms it uses under the key (R-C4-09) |

**Author relationships at the lowest level you model.** `component → container`
also appears as `container → container` in the container view and as
`system → system` in the context view (implied relationships, merged with a
count). A relationship authored only at system level does not appear in a
container view: no container is known to make it.

## Default selection per view

- `systemLandscape`: every person and software system.
- `systemContext`: the scope plus every person/system it talks to (through any
  of its containers or components).
- `container`: the scope's containers (inside a dashed boundary) plus the
  people and systems they talk to.
- `component`: the scope container's components plus the sibling containers
  and outside systems they talk to.

## Layout model (semantic, not coordinates)

- Reading order: initiators (people, upstream systems) on top, the scope in the
  middle, what it calls below.
- Inside the boundary, rows follow the longest path of relationships; stores
  and queues share the last boundary row; a worker nobody calls sits beside the
  service it feeds; services shared by two hubs (a frontend and a checkout)
  sit between them, the second hub below; elements of one row that talk to
  each other sit side by side.
- In container/component views, systems called from upper boundary rows stand
  in a side column at their callers' height; those called from the last row
  go below.
- The renderer searches layouts (top-down or left-to-right, 4/6/8 per row,
  220/260 px boxes, spacing +0 to +84 px) and keeps the first that passes every
  gate and fits a 1440×900 screen (about 1.7:1 or wider). `layout` pins any
  of these; `draft` shows which one won and why the others failed.
- Real systems with 12+ containers or infrastructure every service calls
  rarely fit one picture: hide shared arrows (`exclude_relationships`) or split
  the view per flow, then use `placement`/`routes` for the last details.

## Rules

HARD (refuse): R-C4-01 hierarchy · R-C4-02 scope matches view type ·
R-C4-03 relationship description · R-C4-04 distinct, non-nested endpoints ·
R-C4-05 zoom into something with children.

SOFT (block `showcase` unless waived): R-C4-06 description · R-C4-07
technology · R-C4-08 protocol between containers · R-C4-09 acronyms ·
R-C4-10 ≤ ~20 elements · R-C4-11 vague verb · R-C4-12 element in no view ·
R-C4-13 context without users or neighbours.

Waivers need a reason: the user's, or `"Pendente: <fato> não informado"` when a
fact is missing (e.g. the protocol between two services). A pending waiver is a
question for the user; list it in the handoff.

## Repair recipes

| Diagnostic | Fix |
|---|---|
| `[R-C4-01] container … needs a parent` | add `parent` = the software system it runs in |
| `[R-C4-02] … scope must be a softwareSystem` | point `scope` at the system, or change the view `type` |
| `[R-C4-03] … has no description` | write the intent from the source's point of view ("Reads orders from") |
| `[R-C4-04] … with its own parent` | delete it: the boundary already shows containment |
| `[R-C4-05] … has no containers` | model the containers, or drop the view |
| `method/R-C4-07` / `R-C4-08` | ask for the technology or protocol; waive as pending if unknown |
| `method/R-C4-09` | add the acronym to `meta.glossary`, or spell it out |
| `method/R-C4-10` | split: one container view per system, one component view per container |
| `[viewport/fit] … needs scrolling` | split the view, hide shared arrows with `exclude_relationships`, or exclude elements |
| many layout problems at once | run `draft`, look at the red outlines, start with the element named most often |
| `label … has no free spot` | `routes[{from,to,labelDx/labelDy}]` for that pair, or raise `layout.gap_x`/`gap_y` |
| `clean-flow/edge-through-node` | `placement` to move the blocking element, or `routes` with `fromSide`/`toSide` |
| `composition/proper-crossing` (showcase) | swap two elements with `placement`, or route one arrow around with `via` |
| `… overlaps the boundary` | move the outside element to a row above or below the boundary rows |
| `The description of … needs more than 4 lines` | shorten it, or raise `layout.element_width` (≤ 300) |

## Minimal model

```json
{
  "schema_version": 1,
  "diagram_type": "c4",
  "meta": { "title": "Payments", "locale": "en" },
  "model": {
    "elements": [
      { "id": "buyer", "type": "person", "name": "Buyer", "description": "Pays for orders online." },
      { "id": "pay", "type": "softwareSystem", "name": "Payments", "description": "Takes card payments for the shop." },
      { "id": "api", "type": "container", "parent": "pay", "name": "Payments API", "technology": "Go", "description": "Authorises and captures payments." },
      { "id": "db", "type": "container", "parent": "pay", "name": "Ledger", "technology": "PostgreSQL", "shape": "database", "description": "Records every payment." },
      { "id": "psp", "type": "softwareSystem", "external": true, "name": "Card Processor", "description": "Clears card transactions." }
    ],
    "relationships": [
      { "from": "buyer", "to": "api", "description": "Pays using", "technology": "HTTPS" },
      { "from": "api", "to": "db", "description": "Records payments in", "technology": "SQL/TCP" },
      { "from": "api", "to": "psp", "description": "Authorises cards with", "technology": "JSON/HTTPS" }
    ]
  },
  "views": [
    { "key": "context", "type": "systemContext", "scope": "pay" },
    { "key": "containers", "type": "container", "scope": "pay" }
  ]
}
```
