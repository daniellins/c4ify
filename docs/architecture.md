# Architecture

c4ify is a pipeline from **one JSON model** to **one standalone HTML file per view**. The viewer,
routing and delivery gates are inherited from [Archify](https://github.com/tt-a1i/archify), the
rule engine from [bizify](https://github.com/daniellins/bizify); the C4 knowledge lives in
`c4ify/renderers/c4/`, the schema and the references.

```
model.c4.json
  ─▶ schema (AJV, strict)               schemas/c4.schema.json
  ─▶ HARD rules                         rules.mjs  hardRuleProblems → method/hard-rule
  ─▶ resolve view                       resolve.mjs  scope, neighbours, implied relationships
  ─▶ SOFT advisories                    rules.mjs  model + view advisories, waivers
  ─▶ layout                             layout.mjs rows/columns, scene.mjs boxes and canvas
  ─▶ routing                            routing.mjs (ported from Archify)
  ─▶ labels                             labels.mjs  placement search
  ─▶ composition gates                  shared/geometry.mjs  (spacing retry when a label has no spot)
  ─▶ SVG                                svg.mjs  shapes, drill badges, legend, view navigation
  ─▶ viewer                             assets/template.html (Archify)
  ─▶ deliver, once per view             bin/c4ify.mjs  <view-key>.html, atomic, SHA-256 receipts
```

## 1. Model and schema

`c4ify/schemas/c4.schema.json` (JSON Schema 2020-12, `additionalProperties: false` at every level)
describes `meta`, `model.elements`, `model.relationships` and `views[]`, sharing `$defs` from
`common.schema.json`. Schemas are precompiled into `renderers/shared/generated-validators.mjs`, so
users need no npm install.

## 2. HARD rules

`hardRuleProblems` checks the model before any view is drawn: unique ids, the C4 hierarchy
(R-C4-01), view scope vs. type (R-C4-02), relationship descriptions (R-C4-03), distinct,
non-nested endpoints (R-C4-04) and zoom targets with children (R-C4-05). Any problem throws a
`method/hard-rule` diagnostic and nothing is written.

## 3. Resolve the view

`resolveView` (pure, unit-tested) picks the elements of the view: every person and system for a
landscape; the scope system for a context view; the scope's children for container and component
views; then every outside element that talks to them, drawn at the right level (a sibling
container in a component view, the top-level system otherwise). `include` / `exclude` adjust the
set. Relationships are then **lifted**: each endpoint is replaced by its nearest visible ancestor,
self-loops and parent/child pairs are dropped, and duplicates merge with a `count` (implied
relationships that disagree on technology keep none).

## 4. SOFT advisories

`modelAdvisories` and `viewAdvisories` add R-C4-06..13 through `createAdvisories(meta)` from
`renderers/shared/method.mjs`. Advisories are serialized into `<metadata id="c4ify-advisories">`
inside the SVG; `scripts/check-render-output.mjs` reads it: in `showcase` active advisories are
composition **errors**, in `standard` warnings; waived ones are reported but never block.

## 5. Layout, routing and labels

- `assignRows` (pure): people and callers on top, the scope in the middle, stores and queues in the
  last boundary row, called systems in a side column; rows ordered by barycentre; `placement`
  overrides any element.
- `buildScene`: boxes, dashed boundary, fonts (floor from `minimumReadableSourceTextPx`), direction
  (`TB`, or `LR` for deep views unless `layout.direction` is set) and first-screen aspect
  (`fitAspect`).
- `createRouter`: Archify's orthogonal router, with the view's element boxes as obstacles.
- `createLabeler`: tries positions along each route segment and keeps the first clear of elements,
  other labels, the boundary title and routes. When a label has no spot, the whole view is
  recomposed with more spacing (up to three times, unless `gap_x` / `gap_y` are authored).

## 6. Composition gates

The same contracts as Archify's architecture renderer: endpoint sides, routes clear of unrelated
elements, no crossings, no ambiguous shared corridors, no runs along the boundary border, route
rhythm, label/element and label/route clearance. Each problem names the pair and the repair
(`routes`, `placement`, `layout`).

## 7. SVG semantics → viewer

The viewer is type-agnostic. It works because the renderer emits the attribute contract in
[renderers/README.md](../c4ify/renderers/README.md): `data-node-id`, `data-node-kind` (the C4
kind), `data-edge-from/to`, `data-detail` levels, `data-graph-role="structural-frame"`, semantic
classes `c-*`, `t-*`, `a-*`, plus `data-c4-drill` for drill-down. C4 kinds map to the shared
palette slots through `renderers/c4/palette.mjs`; `scripts/generate-kind-palette.mjs` writes the
matching CSS into the template.

## 8. Delivery per view

`validate` and `deliver` without `--view` run the single-view pipeline once per view (the CLI sets
`C4IFY_VIEW`). `deliver` freezes the model bytes, renders, checks and atomically replaces
`<directory>/<view-key>.html`, then returns `{ ok, directory, entry, views: [...] }`. The navigation
bar and drill targets reference sibling files, so the folder is the deliverable. `visual-check`
opens one exact artifact in a headless browser at 1440×900 … 2048×1320 and writes PNG screenshots.

## 9. Localization

`renderers/shared/i18n.mjs` holds `[en, pt-BR]` tuples for the viewer; `renderers/c4/messages.mjs`
adds titles, type names, legend entries and rule messages, merged by `type-messages.mjs`
(duplicate keys throw).

## 10. What changed from Archify and bizify

See [NOTICE.md](../NOTICE.md). Internal identifiers (`window.Archify`, `ARCHIFY_*`) were kept to
keep upstream diffs readable.
