# Adding a diagram type

This is how the six current types were built; follow the same order.

## 1. Propose it

Open a **New diagram type** issue: the business question it answers, why existing types don't
answer it, and the primary sources (standard or original author) you will use.

## 2. Write the theory first

Create `bizify/references/theory-<type>.md` (≤ 330 lines): purpose and when to use (vs. the other
types), concepts, methodology steps, visual conventions, rules `R-<TYPE>-NN` each HARD or SOFT with
source tags, anti-patterns, a worked mini-example, sources table with grades, and an IR suggestion.
See [methodology.md](methodology.md) for grading.

## 3. Design the IR (schema)

`bizify/schemas/<type>.schema.json`: JSON Schema 2020-12, `schema_version: 1`,
`diagram_type: "<type>"`, `additionalProperties: false` everywhere, meta reusing
`common.schema.json#/$defs/*`. Prefer semantics (parents, order, lanes, kinds, metrics) over
coordinates. Keep ids unique across all semantic collections of the type.

## 4. Build the renderer

Copy the structure of `bizify/renderers/wbs/render-wbs.mjs` (the reference implementation) and
follow the contract in [renderers/README.md](../bizify/renderers/README.md):

1. `loadDiagramWithBrandMarks` → schema-validated spec.
2. HARD rules with `advisories.fail`, then `throwIfHard`; SOFT rules with `advisories.warn`.
3. Compute numbers; reject authored totals that disagree.
4. Fit text (floor from `minimumReadableSourceTextPx`), place from structure, route orthogonally.
5. `fitAspect` for the first screen.
6. Emit SVG with `focusNodeAttrs` / `focusEdgeAttrs`, semantic classes, legend after
   `<!-- Legend -->`, `advisories.render()`, and `writeDiagram`.

Also add `messages.mjs` (`[en, pt-BR]` tuples, full accents) and `palette.mjs` (kind → slot).

## 5. Register the type

`bin/bizify.mjs` (TYPES, THEORY, doctor example), `renderers/shared/cli.mjs` (START_TYPES,
SEMANTIC_COLLECTIONS, RELATIONSHIP_COLLECTIONS), `renderers/shared/type-messages.mjs`,
`scripts/generate-validators.mjs`, `scripts/generate-kind-palette.mjs` (TYPES),
`scripts/render-examples.mjs`, `recipes/scenarios.mjs`, and the router in `SKILL.md`. Then:

```bash
npm run generate:validators && npm run generate:palette
```

## 6. Example, guide and tests

- `bizify/examples/<name>.<type>.json` passing `validate --quality showcase` with 0 errors and
  0 warnings, and `visual-check` containment at all viewports. Look at the light and dark PNGs.
- `bizify/references/authoring-<type>.md` (≤ 200 lines): when to use, field table, rules (ids and
  one line each), repair recipes per diagnostic, a minimal spec that validates.
- `bizify/test/<type>.test.mjs` with `test/helpers.mjs`: the example passes; one test per HARD rule
  family; a SOFT advisory; a waiver.

## 7. Open the PR

Use the PR template checklist; attach screenshots. Update `CHANGELOG.md` under *Unreleased*.
