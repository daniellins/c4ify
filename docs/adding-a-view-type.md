# Adding a view type

c4ify ships four C4 views: `systemLandscape`, `systemContext`, `container` and `component`.
Deployment and dynamic views are on the [roadmap](../ROADMAP.md). A new view type is added inside
the existing C4 renderer, in this order.

## 1. Propose it

Open a **New view type** issue: the question the view answers, why the existing views don't
answer it, the c4model.com page that defines it, and what the model must gain (for example
deployment environments and nodes).

## 2. Write the theory first

Extend `c4ify/references/theory-c4.md`: purpose and when to use, the elements and relationships
the view shows, visual conventions, new rules `R-C4-NN` (HARD or SOFT) with source tags,
anti-patterns, and the sources table. See [methodology.md](methodology.md) for grading.

## 3. Extend the schema

`c4ify/schemas/c4.schema.json`: add the value to `views[].type`, and any new model elements or
view fields, keeping `additionalProperties: false`. Prefer semantics over coordinates. Then run
`npm run generate:validators`.

## 4. Teach the renderer

Files in `c4ify/renderers/c4/` (contract: [renderers/README.md](../c4ify/renderers/README.md)):

1. `resolve.mjs`: `VIEW_SCOPE_TYPE`, the in-scope elements, how outside elements are represented,
   and the drill-down level in `LEVEL_OF_VIEW`.
2. `rules.mjs`: scope checks for R-C4-02, which element types the view may include, and any new
   HARD or SOFT rules.
3. `layout.mjs` / `scene.mjs`: row and column assignment and whether the view draws a boundary.
4. `svg.mjs`: any new shapes and legend entries (`LEGEND_KINDS`), and `palette.mjs` for new kinds
   (then `npm run generate:palette`).
5. `messages.mjs`: `c4.view.<type>` title and new strings as `[en, pt-BR]` tuples (full accents).

Routing, labels and composition gates are shared by every view and normally need no change.

## 5. Example, guide and tests

- Add a view of the new type to an example in `c4ify/examples/` that passes
  `validate c4 <model> --quality showcase` with 0 errors and 0 warnings in every view, and
  `visual-check` containment at all viewports. Look at the light and dark PNGs.
- Document the fields, rules and repair recipes in `c4ify/references/authoring-c4.md`.
- Tests with `test/helpers.mjs`: resolution (`test/resolve.test.mjs`), layout
  (`test/layout.test.mjs`), and in `test/c4.test.mjs` one test per new HARD rule, a SOFT advisory
  and a waiver.

## 6. Open the PR

Use the PR template checklist; attach screenshots. Update `CHANGELOG.md` under *Unreleased*.
