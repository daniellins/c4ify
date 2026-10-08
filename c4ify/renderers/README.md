# c4ify renderer contract (developer guide)

c4ify descends from Archify 2.17.0-dev.1 through bizify. The standalone viewer
(`assets/template.html`: pan/zoom, search, focus, trace, guided views, themes,
presets, exports) is type-agnostic: it only reads SVG semantics. The C4
renderer's job is to turn one model JSON plus one selected view into ONE
`<svg>` that speaks that contract. Delivering a model calls it once per view.

## Files in `renderers/c4/`

| File | Purpose |
|---|---|
| `render-c4.mjs` | Entry point (ESM, top-level await `loadDiagramWithBrandMarks`). Picks the view from `C4IFY_VIEW` (set by `--view`; first view otherwise), runs rules, layout, routing, labels and composition gates, then `writeDiagram` with the view navigation bar and glossary card. |
| `resolve.mjs` | Pure model → view resolution: scope, neighbours, include/exclude, implied relationships lifted to the drawn level (merged with a `count`), boundary, drill-down targets (`drillTarget`). |
| `rules.mjs` | `hardRuleProblems` (R-C4-01..05, thrown as `method/hard-rule`), `modelAdvisories` and `viewAdvisories` (SOFT R-C4-06..13). |
| `layout.mjs` | Pure row/column assignment: people and callers on top, scope in the middle, stores and queues in the last boundary row, called systems in a side column, barycentre ordering; `view.placement` overrides. |
| `scene.mjs` | Boxes, boundary frame, fonts and canvas size from the cells (`minimumReadableSourceTextPx`, `fitAspect`); `layout` knobs and the automatic spacing boost. |
| `routing.mjs` | Orthogonal relationship routing, ported unchanged from Archify's `renderers/architecture/render-architecture.mjs` and wrapped in a per-view factory. |
| `labels.mjs` | Relationship label placement: a small search over route segments, clear of elements, other labels, the boundary title and routes; honours `labelAt` / `labelDx` / `labelDy` / `labelSegment`. |
| `svg.mjs` | SVG emission: element shapes (box, person, database, queue), drill badges (`data-c4-drill`), relationships, labels, legend, view navigation. |
| `messages.mjs` | `C4_MESSAGES = { key: [en, ptBR] }`: titles ("System Context diagram for {name}"), type names, legend entries, rule messages. PT-BR carries full accents. |
| `palette.mjs` | `C4_KIND_PALETTE`: C4 kind → shared slot (one hue per abstraction level, every external element slate). |

Related files: `schemas/c4.schema.json`, `references/theory-c4.md`,
`references/authoring-c4.md`, `examples/*.c4.json`, `test/c4.test.mjs`,
`test/resolve.test.mjs`, `test/layout.test.mjs`. Shared files
(`renderers/shared/*`, `bin/c4ify.mjs`, `scripts/check-render-output.mjs`,
`assets/template.html`) serve every view type; prefer a helper inside
`renderers/c4/` over a change to them.

## SVG semantics the viewer depends on

- Node: `<g ${focusNodeAttrs(id, label, passport, locale)}>` + `focusNodeTitle(...)`,
  a `c-mask` backdrop shape, the visible shape with class `c-<slot>`, and the
  primary text with `data-node-label=""`. `passport = { kind, sublabel, tag, context }`
  feeds the details panel; `kind` MUST be a C4 kind from `palette.mjs`.
- Drill-down: an element with a more detailed view carries
  `data-c4-drill="<view-key>.html"` and a ⊕ badge; the viewer opens it on
  double-click or Shift+Enter.
- Relationship: `<path ${focusEdgeAttrs(from, to, label, index, id)} data-composition-points="x,y x,y" d=... class="a-default|a-dashed" marker-end="url(#arrowhead…)">`.
  Paths with `a-*` + `marker-end` are geometry-checked (orthogonal only, no
  crossings, no shared corridors, rhythm). Async relationships use `a-dashed`.
- Relationship label: `<g data-detail="context" ${focusEdgeAttrs(...)}>` with a
  `c-mask` rect behind the text (label/route clearance is checked). The last
  line carries the technology in brackets.
- Detail levels: `data-detail="context"` (read zoom) / `"fine"` (full zoom).
  Primary labels and context text must stay ≥ 6 px projected at a 930 px
  reader width: use `minimumReadableSourceTextPx(viewW)` as the font floor.
- Frames (the dashed scope boundary): `<rect data-graph-role="structural-frame" data-composition-frame-kind="boundary" data-composition-frame-id="<id>">`.
  Routes may cross a frame perpendicularly but must not run along its border.
- Legend (the C4 key): `resolveLegend` + `renderLegend` from `shared/legend.mjs`,
  placed after the literal comment `<!-- Legend -->` (everything before it is checked).
- Motion: `animateAttr(meta, 'node'|'edge', step)` on shapes; step = reading order.
- Methodology: `createAdvisories(meta)` from `shared/method.mjs`.
  `warn(rule, msg, subjectId)` for SOFT rules; `advisories.render()` inside the
  SVG (`<metadata id="c4ify-advisories">`). In `showcase` an active advisory is a
  composition error; `meta.waivers[{rule, subject?, reason}]` waives it.
  Rule ids come from `references/theory-c4.md` (R-C4-01..13).
- Text: `wrapText` + `renderLines`; reject overflow with a message naming the
  element and the fix. Never truncate meaning.

## Layout philosophy

Authors give semantics, not coordinates. Geometry derives from the view type,
the element types and the relationships. The knobs (`layout`, `placement`,
`routes`) are repair tools for a named diagnostic, and the renderer diagnoses
instead of guessing.

## Loop

```bash
node scripts/generate-validators.mjs && node scripts/generate-kind-palette.mjs
node bin/c4ify.mjs validate c4 examples/online-store.c4.json --quality showcase --json
node bin/c4ify.mjs deliver c4 examples/online-store.c4.json "$TEMP/c4ify-out" --quality showcase
node bin/c4ify.mjs visual-check "$TEMP/c4ify-out/<view-key>.html" --json   # needs containment pass
npm test
```
Look at the PNG screenshots next to the HTML (light and dark) and fix what a
human would see as wrong: overlaps, cramped text, unbalanced whitespace.
