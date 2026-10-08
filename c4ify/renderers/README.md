# Bizify renderer contract (developer guide)

Bizify is a fork of Archify 2.17.0-dev.1. The standalone viewer
(`assets/template.html`: pan/zoom, search, focus, trace, guided views, themes,
presets, exports) is type-agnostic: it only reads SVG semantics. A renderer's
whole job is to turn one typed JSON spec into ONE `<svg>` that speaks that
contract. `renderers/wbs/render-wbs.mjs` is the reference implementation — copy
its structure.

## Files per type `<t>` (you own these; nothing else)

| File | Purpose |
|---|---|
| `schemas/<t>.schema.json` | JSON Schema 2020-12, `additionalProperties: false` everywhere, `schema_version: 1`, `diagram_type: "<t>"`, meta reusing `common.schema.json#/$defs/*` (locale, animation, visualPreset, qualityProfile, guidedViews, waivers, viewBox, legendMode, legendEntry, cards). |
| `renderers/<t>/render-<t>.mjs` | Renderer (ESM, top-level await `loadDiagramWithBrandMarks`). |
| `renderers/<t>/messages.mjs` | `export const <T>_MESSAGES = { key: [en, ptBR] }`. Required keys: `diagram.description.<t>`, `node.context.<t>`, `legend.<t>.<kind>` per legend entry, `viewer.kind.<kind>` per node kind (check i18n.mjs + other messages files for collisions; the merge throws on duplicates). Prefix every other key with `<t>.`. PT-BR must carry full accents. |
| `renderers/<t>/palette.mjs` | `export const <T>_KIND_PALETTE = { kind: slot }`, slot ∈ frontend(cyan) backend(emerald) database(violet) cloud(amber) security(rose) messagebus(orange) external(slate). Kinds must be CSS-safe (`[a-z][a-z0-9-]*`). |
| `examples/<name>.<t>.json` | The doctor example (name fixed in `bin/bizify.mjs` doctor map). `quality_profile: "showcase"`, `locale: "pt-BR"`, realistic tech-project content. Must pass showcase with 0 errors, 0 warnings AND visual-check containment pass. |
| `references/authoring-<t>.md` | Authoring guide for the agent using the skill (≤ 200 lines): when to use, IR field table, layout model, HARD/SOFT rule list (ids only + one line each, pointing to `theory-*.md`), repair recipes for each layout diagnostic, 1 minimal JSON. |
| `test/<t>.test.mjs` | node:test using `test/helpers.mjs` (see `test/wbs.test.mjs`): example passes showcase with 0 warnings; ≥1 test per HARD rule family; SOFT → advisory; waiver works. |

Shared files (`cli.mjs`, `bin/bizify.mjs`, `type-messages.mjs`, `i18n.mjs`,
`business.mjs`, `check-render-output.mjs`, `template.html`) are owned by the
coordinator. If you need a shared helper, put it in your renderer folder.

## SVG semantics the viewer depends on

- Node: `<g ${focusNodeAttrs(id, label, passport, locale)}>` + `focusNodeTitle(...)`,
  a `c-mask` backdrop shape, the visible shape with class `c-<slot>`, and the
  primary text with `data-node-label=""`. `passport = { kind, sublabel, tag, context }`
  feeds the details panel; `kind` MUST be the business kind in your palette.
- Relationship: `<path ${focusEdgeAttrs(from, to, label, index, id)} data-composition-points="x,y x,y" d=... class="a-default|a-emphasis|a-security|a-dashed" marker-end="url(#arrowhead…)">`.
  Paths with `a-*` + `marker-end` are geometry-checked (orthogonal only, no
  crossings, no shared corridors, rhythm). Decorative connectors without an
  arrowhead (tree links) omit `marker-end`.
- Relationship label: `<g data-detail="context" ${focusEdgeAttrs(...)}>` with a
  `c-mask` rect behind the text (label/route clearance is checked).
- Detail levels: `data-detail="context"` (read zoom) / `"fine"` (full zoom).
  Primary labels and context text must stay ≥ 6 px projected at a 930 px
  reader width: use `minimumReadableSourceTextPx(viewW)` as the font floor.
- Frames (lanes, columns, bands): `<rect data-graph-role="structural-frame" data-composition-frame-kind="<k>" data-composition-frame-id="<id>" class="c-lane">` — routes must not run along frame borders.
- Legend: `resolveLegend` + `renderLegend` from `shared/legend.mjs`, placed after
  the literal comment `<!-- Legend -->` (everything before it is checked).
- Motion: `animateAttr(meta, 'node'|'edge', step)` on shapes; step = reading order.
- Methodology: `createAdvisories(meta)` from `shared/business.mjs`.
  `fail(rule, msg)` for HARD rules then `throwIfHard(...)`; `warn(rule, msg, subjectId)`
  for SOFT rules; `advisories.render()` inside the SVG. In `showcase` an active
  advisory is a composition error; `meta.waivers[{rule, subject?, reason}]` waives it.
  Rule ids come from the matching `references/theory-*.md` (R-BPMN-xx, R-VSM-xx…).
- First screen: call `fitAspect(...)` after placement so the canvas is ~2:1
  (a narrow, tall SVG overflows 1440×900). Keep node counts inside the theory's
  legibility guidance and fail with a clear message beyond it.
- Numbers: `formatNumber/formatPercent(value, locale)`; compute totals, never
  trust authored totals (reject mismatches as HARD).
- Text: `wrapText` + `renderLines`; reject overflow with a message naming the
  node and the fix (shorten label or widen). Never truncate meaning.

## Layout philosophy

Authors give semantics, not coordinates. Derive geometry from structure
(tree depth, lane × column, stage order, release band). Offer at most a few
explicit knobs (`col`, `row`, `node_width`) and diagnose instead of guessing.

## Loop

```bash
node scripts/generate-validators.mjs && node scripts/generate-kind-palette.mjs
node bin/bizify.mjs validate <t> examples/<x>.<t>.json --quality showcase --json
node bin/bizify.mjs deliver <t> examples/<x>.<t>.json "$TEMP/bizify-out/<t>.html" --quality showcase
node bin/bizify.mjs visual-check "$TEMP/bizify-out/<t>.html" --json   # needs containment pass
node --test test/<t>.test.mjs
```
Look at the PNG screenshots next to the HTML (light and dark) and fix what a
human would see as wrong: overlaps, cramped text, unbalanced whitespace.
