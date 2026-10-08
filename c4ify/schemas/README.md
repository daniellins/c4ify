# c4ify JSON schemas

The C4 renderer consumes one JSON model validated against the schemas in this
folder before any rule, layout or rendering work happens.

## Files

| Schema | Governs | Top-level fields |
|--------|---------|------------------|
| `c4.schema.json` | `diagram_type: "c4"` | `schema_version`, `diagram_type`, `meta`, `model` (`enterprise?`, `elements`, `relationships`), `views`, `cards?` |
| `common.schema.json` | shared `$defs` only (no top-level document) | — |

Every level sets `additionalProperties: false`, so unknown or misspelled fields
are rejected rather than silently ignored.

## The model and its views

- `model.elements[]`: `id`, `type` (`person`, `softwareSystem`, `container`,
  `component`), `name`, optional `description`, `technology`, `parent`,
  `external`, `shape` (`box`, `database`, `queue`), `tags`, `brand`. Up to 200.
- `model.relationships[]`: `from`, `to`, optional `id`, `description`,
  `technology`, `async`, `tags`. Up to 400.
- `views[]` (1 to 24): `key` (unique; also the delivered file name
  `<key>.html`), `type` (`systemLandscape`, `systemContext`, `container`,
  `component`), `scope`, optional `title`, `description`, `include`, `exclude`,
  `layout` (`direction` `TB`/`LR`, `max_per_row` 2–6, `element_width`,
  `gap_x`, `gap_y`), `placement` (`{ id: { row, col } }`), `routes`
  (`from`, `to`, `fromSide`, `toSide`, `route`, `via`, `labelAt`, `labelDx`,
  `labelDy`, `labelSegment`), `chapters` (guided views), `viewBox`.

The schema checks shape only. The hierarchy, scope/type agreement and the other
notation rules (R-C4-01..13) are checked by `renderers/c4/rules.mjs`; see
`references/theory-c4.md`.

## meta

`title` (required), `subtitle`, `output`, `locale` (`en` or `pt-BR`; selects
the fixed viewer UI, generated titles, legend and rule messages, never
authored strings), `animation` (`none` or `trace`), `visual_preset`
(`classic`, `signal-flow`, `blueprint`, `editorial`; styling only),
`quality_profile` (`standard` or `showcase`), `waivers`
(`[{ rule: "R-C4-NN", subject?, reason }]`, reason at least 8 characters),
`glossary` (acronym → meaning, up to 40, rendered as a card), and `legend`.

### Legend presentation contract

```json
"legend": {
  "mode": "auto",
  "entries": {
    "external-system": { "label": "Third-party system", "visible": true }
  }
}
```

`mode` is `auto` (the default; only kinds present), `all`, or `hidden`.
Entry keys are the C4 kinds: `person`, `software-system`, `container`,
`component`, `external-person`, `external-system`, `external-container`,
`external-component`. An entry may set a bounded `label`, boolean `visible`,
or both; unknown keys fail strict validation.

## schema_version policy

`schema_version` is pinned to `1`. A model that validates today must keep
validating and rendering within its declared version throughout the 0.x line
unless the CHANGELOG announces a breaking change. Additive, backwards-compatible
fields do not need a new version.

## Shared definitions (common.schema.json)

`id` (pattern `^[a-zA-Z][a-zA-Z0-9_-]*$`), `point` (`[x, y]`), `side`,
`locale`, `animation`, `visualPreset`, `qualityProfile`, `brandMark` (built-in
brand id or digest-pinned site icon), `variant`, `legendMode`, `legendEntry`,
`guidedViews`, `cards`, `waivers`, `viewBox`, `shortText`, `note`. Some
definitions inherited from Archify (`componentType`, `relationshipWidth`) are
kept for the shared engine and are not used by `c4.schema.json`.

## Runtime validation

`scripts/generate-validators.mjs` compiles the schemas with ajv's draft 2020-12
standalone generator (`strict: true`, `allErrors: true`). The generated
`renderers/shared/generated-validators.mjs` is committed and shipped with the
skill, so runtime validation has no npm or network dependency.
`renderers/shared/validator.mjs` applies it before the renderer's own checks.
`npm test` runs the generator in check mode and fails when the committed
validators drift from the schemas: run `npm run generate:validators` after any
schema edit.

## Error format

Schema violations exit non-zero. Each ajv error is reported on its own line as
the instance path, annotated with the nearest enclosing element's `id` or
`name`, followed by the message and parameters:

```text
c4 schema validation failed:
  /model/elements/3 (id/label: "api") must NOT have additional properties {"additionalProperty":"colour"}
```

Schemas catch shape errors (types, enums, ranges, unknown fields); notation
rules and geometry problems (overlaps, label collisions) are the renderer's job.
