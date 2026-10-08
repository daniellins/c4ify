# Architecture

Bizify is a pipeline from a **typed JSON spec** to **one standalone HTML file**. Most of the
pipeline is inherited from [Archify](https://github.com/tt-a1i/archify); the business knowledge
lives in the renderers, schemas and references.

```
            ┌──────────────── Bizify ────────────────┐   ┌──────────── inherited from Archify ────────────┐
spec.json ─▶ schema ─▶ method rules ─▶ layout ─▶ SVG ─▶ viewer template ─▶ artifact checks ─▶ deliver ─▶ visual-check
            (AJV)     (HARD/SOFT)   (structure)  (semantic      (template.html)   (9 checks +        (atomic,     (Chrome:
                                                 attributes)                      composition)       SHA-256)     containment, PNGs)
```

## 1. Spec and schema

Each type has a JSON Schema 2020-12 (`bizify/schemas/<type>.schema.json`) with
`additionalProperties: false` at every level, sharing `$defs` from `common.schema.json` (locale,
presets, guided views, waivers, legend, cards). Schemas are precompiled into
`renderers/shared/generated-validators.mjs`, so users need no npm install.

## 2. Method rules

The renderer applies the rules of its method (see [methodology.md](methodology.md)) through
`createAdvisories(meta)` from `renderers/shared/business.mjs`:

- `fail(rule, message)` — HARD: collected, then thrown as `method/hard-rule` diagnostics.
- `warn(rule, message, subjectId)` — SOFT: serialized into `<metadata id="bizify-advisories">`
  inside the SVG; waivers from `meta.waivers` mark entries as waived.

`scripts/check-render-output.mjs` reads that metadata: in `showcase` active advisories are
composition **errors**, in `standard` they are warnings, waived ones are reported but never block.

## 3. Layout from structure

Authors describe semantics; renderers derive geometry:

| Type | Layout model |
|---|---|
| `wbs` | hybrid (L1 on top, L2 row, L3+ stacked with spine connectors) or tidy tree |
| `bpmn` | pools × lanes × columns; columns from longest path; ranked orthogonal route options |
| `vsm` | bands: supplier/control/customer, process chain with queues and data boxes, timeline ladder, totals |
| `impactmap` | left-to-right tree in four columns (why, who, how, what) |
| `storymap` | backbone (activities, steps) × horizontal release bands |
| `sipoc` | five column frames, process steps vertical, optional links |

Shared helpers: text wrapping and fitting, first-screen aspect fitting (`fitAspect`, ~2:1 with a
legibility cap), orthogonal connectors, locale-aware numbers.

## 4. SVG semantics → viewer

The viewer (`assets/template.html`) is type-agnostic. It works because every renderer emits the
same attribute contract ([renderers/README.md](../bizify/renderers/README.md)):
`data-node-id`, `data-node-kind` (the business kind), `data-edge-from/to`, `data-detail`
levels, `data-graph-role="structural-frame"`, semantic classes `c-*`, `t-*`, `a-*`. Business
kinds map to the seven palette slots through `renderers/<type>/palette.mjs`;
`scripts/generate-kind-palette.mjs` writes the matching CSS into the template, so every preset
and theme colors them without new variables.

## 5. Delivery and evidence

- `validate` — renders into a temp dir and runs the artifact checker.
- `deliver` — freezes the spec bytes, renders, checks and atomically replaces the output; prints
  SHA-256 receipts.
- `visual-check` — opens the exact artifact in a headless browser at 1440×900 … 2048×1320,
  measures containment and projected text size, and writes PNG screenshots.

## 6. Localization

`renderers/shared/i18n.mjs` holds `[en, pt-BR]` tuples for the viewer; each renderer contributes
its own tuples via `renderers/<type>/messages.mjs`, merged by `type-messages.mjs` (duplicate keys
throw). Adding a locale means adding one column everywhere and a value to `SUPPORTED_LOCALES`.

## 7. What changed from Archify

See [NOTICE.md](../NOTICE.md). Internal identifiers (`window.Archify`, `ARCHIFY_*`) were kept to
keep upstream diffs readable.
