# Authoring contract (all types)

Read after the Fast authoring path calls for detail. Each type's schema and
`authoring-<type>.md` stay authoritative for its fields; `theory-<type>.md`
holds the methodology and the sources behind every rule.

## Schema lookup

Read the type schema and `schemas/common.schema.json` (shared `$defs`: `locale`,
`animation`, `visualPreset`, `qualityProfile`, `guidedViews`, `waivers`,
`viewBox`, `cards`, `legendMode`, `legendEntry`). Every level uses
`additionalProperties: false`: an unknown or misspelled field fails before any
layout work. Do not invent fields; use the example for shape, never for facts.

## Semantics, not coordinates

Business renderers derive geometry from structure: tree depth (WBS, impact
map), lane × column (BPMN), chain order and bands (VSM), backbone × release
band (story map), the five columns (SIPOC). Author meaning — parents, lanes,
order, kinds, metrics — and let the renderer place it. The few explicit knobs
each type exposes (`col`, `row`, `node_width`, `layout`) are repair tools for a
diagnostic, not a starting point.

## Methodology gates (why a diagram can be rejected)

Rules come from the researched standards (PMI/NASA/GAO/MIL-STD-881F for WBS,
OMG BPMN 2.0.2 + Silver + Camunda for BPMN, Rother & Shook + Martin & Osterling
for VSM, Adzic, Patton and ASQ for the planning maps). Each has an id such as
`R-WBS-08` and a level:

- **HARD** — a violation of the notation or of arithmetic (two WBS roots,
  children not summing to their parent, a sequence flow crossing pools, an
  authored VSM total that disagrees with the computed one). The renderer
  refuses the spec. Repair the facts; never delete content to pass.
- **SOFT** — practice guidance (verb-named WBS elements, missing project
  management, unlabelled gateway branches, a slice without an outcome).
  Reported as `method/<rule>` issues. In `quality_profile: "showcase"` an
  active SOFT finding blocks delivery; in `standard` it is a warning.

When the user has a real reason to keep a SOFT finding (a name imposed by a
contract, a deliberately phase-oriented EAP), add a waiver instead of bending
the content:

```json
"waivers": [{ "rule": "R-WBS-15", "subject": "ing-test", "reason": "Nome exigido pelo edital." }]
```

`subject` scopes the waiver to one node id; omit it to waive the rule for the
whole diagram. Waived findings stay visible in the receipt (`severity:
"waived"`). Two legitimate reasons exist: the user's justification, or a
**pending fact** — a SOFT rule requires data the user did not provide. Write
that reason as `"Pendente: <fato> não informado"` (or `"Pending: <fact> not
provided"`) and ask for the fact in the handoff. Never waive for convenience
and never invent the missing data; report every waiver.

## Numbers are computed

Roll-ups (WBS effort/cost), lead time, process time, activity ratio, rolled
%C&A, takt and inventory days are computed by the renderer. Author leaf or
per-step values only. If you also author a total, it must match; a mismatch is
HARD because the diagram would otherwise show two truths. Units live in `meta`
(`units`, `work_hours_per_day`, demand) and are shown on the diagram.

## Language and locale

Choose one primary authored language: the user's explicit choice, otherwise
the request's or the conversation's language. Separately set `meta.locale`:

- `"pt-BR"` for Portuguese content — viewer controls, legend defaults, summary
  cards, number format (1.840 h) and `<html lang>` become Brazilian Portuguese.
- `"en"` (or omit) for English — the default.

`meta.locale` never translates authored content. Write titles, labels, lanes,
views, cards and legend overrides in the primary language with full accents.
For any other language, omit the locale, author the content in that language,
and tell the user the fixed viewer UI stays in English.

Keep product names, system names, codes and metric acronyms (PT, LT, %C&A,
CTQ, SLA) as they are inside localized copy.

## Legend

Omit `meta.legend` for the truthful `auto` default (only kinds present). Use
`mode: "all"` for a notation reference, `mode: "hidden"` to remove it.
`entries.<kind>.label|visible` changes wording only, never semantics. Valid
kinds are listed per type schema.

## Presentation defaults

- Omit `meta.visual_preset` (opens in `classic`); set `signal-flow`,
  `blueprint` or `editorial` only on explicit request.
- Omit `meta.subtitle` unless the user asks for one; never restate the title.
- `meta.animation: "trace"` only for demos and presentations.
- `meta.views`: up to five guided chapters, each focusing ids that exist; use
  them to walk a reader through a path (the selected impact path, the happy
  path, the first release slice, the biggest queue).

## First-screen composition

The artifact must fit 1440×900 without scrolling while keeping text ≥ 6 px at
the reader's width. Renderers widen tall diagrams toward ~2:1 automatically.
When a diagnostic says a diagram is too wide, too deep or too long, split it
along the method's natural seams — an overview plus one diagram per WBS branch,
one BPMN per process level, one value stream per product family — rather than
shrinking text or deleting meaning.

## Relationship labels and routes

Relationship labels are semantic (gateway conditions, message names, flow
types). When one collides, follow the diagnostic: move the label, adjust the
route or row, then shorten the wording while preserving meaning. Never delete
a meaningful label to pass geometry. Routes are orthogonal; the checker rejects
diagonal segments, crossings, ambiguous shared corridors, labels masking
another route, and segments that run along a lane or column border.

## Brand marks

Rarely needed in business diagrams. A system that appears as a BPMN pool or a
VSM information source may carry `brand` only when the node names that real
product; see `brand-marks.md`.

## Hand-placed fallback

Without shell access, hand-place SVG into `assets/template.html` using the
semantic classes (`c-*`, `t-*`, `a-*`) and the attributes in
`renderers/README.md`; say plainly that no validation ran.
