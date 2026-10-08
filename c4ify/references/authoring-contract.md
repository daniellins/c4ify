# Authoring contract (all views)

Read after the Fast authoring path calls for detail. `schemas/c4.schema.json`
and `authoring-c4.md` stay authoritative for the fields; `theory-c4.md` holds
the notation and the sources behind every rule.

## Schema lookup

Read `schemas/c4.schema.json` and `schemas/common.schema.json` (shared
`$defs`: `locale`, `animation`, `visualPreset`, `qualityProfile`,
`guidedViews`, `waivers`, `viewBox`, `cards`, `legendMode`, `legendEntry`).
Every level uses `additionalProperties: false`: an unknown or misspelled field
fails before any layout work. Do not invent fields; use the examples for
shape, never for facts.

## One model, many views

A `*.c4.json` file holds the model once and asks it several questions:

- `model.elements`: `person`, `softwareSystem`, `container`, `component`.
  `parent` builds the hierarchy (container in a system, component in a
  container); `external`, `description`, `technology`, `shape`
  (`database` / `queue`), `tags` and `brand` describe each element.
- `model.relationships`: `from`, `to`, `description` (the intent, as a verb
  phrase), `technology` (protocol), `async`. Author them between the most
  detailed elements you know; each view lifts them to the level it draws
  (implied relationships), merging duplicates with a count.
- `views[]`: `systemLandscape`, `systemContext`, `container`, `component`, each
  with a unique `key`, a `scope` (none for the landscape; a software system for
  context and container views; a container for component views) and optional
  `include` / `exclude`, `title`, `description`, `layout`, `placement`,
  `routes`, `chapters`.

Titles ("System Context diagram for X") and the key/legend are generated from
the view type and scope; set `title` only on explicit request.

## Semantics, not coordinates

The layout derives geometry from the view: people and callers on top, the
scope in the middle (inside a dashed boundary for container and component
views), stores and queues in the last boundary row, called systems in a side
column; deep views switch to left-to-right. Labels are placed by a small search
and spacing grows automatically when a label has no free spot. The knobs
(`layout.direction|max_per_row|element_width|gap_x|gap_y`, `placement`,
`routes`) are repair tools for a diagnostic, not a starting point.

## Methodology gates (why a model can be rejected)

Rules are paraphrased from the c4model.com notation guidance and review
checklist (CC BY 4.0). Each has an id `R-C4-NN` and a level:

- **HARD** (R-C4-01..05): a violation of the notation: broken hierarchy, a view
  scope that does not match its type, a relationship without a description, a
  relationship between an element and its own parent or child, a container or
  component view of something without children. The renderer refuses the
  model. Repair the facts; never delete content to pass.
- **SOFT** (R-C4-06..13): practice guidance: missing description or
  technology, an inter-container relationship without protocol, an
  unexplained acronym, a crowded view, a vague verb ("uses"), an element no
  view draws, a context view without users or neighbours. Reported as
  `method/<rule>` issues. In `quality_profile: "showcase"` an active SOFT
  finding blocks delivery; in `standard` it is a warning.

When the user has a real reason to keep a SOFT finding, add a waiver instead
of bending the content:

```json
"waivers": [{ "rule": "R-C4-07", "subject": "legacy-batch", "reason": "Technology unknown; the vendor did not disclose it." }]
```

`subject` scopes the waiver to one element id; omit it to waive the rule for
the whole model. Waived findings stay visible in the receipt (`severity:
"waived"`). Two legitimate reasons exist: the user's justification, or a
**pending fact**: a SOFT rule requires data the user did not provide. Write
that reason as `"Pending: <fact> not provided"` (or `"Pendente: <fato> não
informado"`) and ask for the fact in the handoff. Never waive for convenience
and never invent the missing data (technologies, protocols); report every
waiver.

## Acronyms and glossary

Explain acronyms in `meta.glossary` (`{ "ERP": "Enterprise Resource
Planning" }`). The glossary is rendered as a card and satisfies R-C4-09.

## Language and locale

Choose one primary authored language: the user's explicit choice, otherwise
the request's or the conversation's language. Separately set `meta.locale`:

- `"pt-BR"` for Portuguese content: viewer controls, generated titles, type
  names, legend and rule messages become Brazilian Portuguese.
- `"en"` (or omit) for English, the default.

`meta.locale` never translates authored content. Write names, descriptions,
relationship intents and cards in the primary language with full accents. For
any other language, omit the locale, author the content in that language, and
tell the user the fixed viewer UI stays in English. Keep product names,
technologies and protocols (PostgreSQL, JSON/HTTPS, AMQP) as they are.

## Legend

Omit `meta.legend` for the truthful `auto` default (only kinds present, plus
the store, async and drill-down hints when used). Use `mode: "all"` for a
notation reference, `mode: "hidden"` to remove it.
`entries.<kind>.label|visible` changes wording only, never semantics.

## Presentation defaults

- Omit `meta.visual_preset` (opens in `classic`); set `signal-flow`,
  `blueprint` or `editorial` only on explicit request.
- Omit `meta.subtitle` unless the user asks for one; never restate the title.
- `meta.animation: "trace"` only for demos and presentations.
- `views[].chapters`: up to five guided chapters per view, each focusing ids
  that view draws (an order flow, a request path).

## First-screen composition

Each view must fit 1440×900 without scrolling while keeping text ≥ 6 px at the
reader's width. When a view is crowded (R-C4-10, about 20 elements), split it:
one view per subsystem, `exclude` peripheral neighbours, or move detail into a
component view, rather than shrinking text or deleting meaning.

## Relationship labels and routes

Relationship labels are semantic: the intent and, on the last line, the
technology. When one collides, follow the diagnostic: set `labelAt` or
`labelDx` / `labelDy` for that pair in `views[].routes`, raise
`layout.gap_x` / `gap_y`, or move an element with `placement`; then shorten
the wording while preserving meaning. Routes are orthogonal; the checker
rejects diagonal segments, crossings, ambiguous shared corridors, labels
masking another route, and segments that run along the boundary border.

## Brand marks

An element that names a real product (PostgreSQL, RabbitMQ, Stripe) may carry
`brand`; see `brand-marks.md`. The C4 type and technology text stay the
primary encoding; the mark is decoration.

## Hand-placed fallback

Without shell access, hand-place SVG into `assets/template.html` using the
semantic classes (`c-*`, `t-*`, `a-*`) and the attributes in
`renderers/README.md`; say plainly that no validation ran.
