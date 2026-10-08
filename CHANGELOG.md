# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

Changes from the first real-world test (eShop, Online Boutique and Spring PetClinic
Microservices modelled from their repositories, with and without the skill).

### Added
- `c4ify draft c4 <model> <dir>`: renders every view even when layout gates fail,
  outlines each problem in red and lists them, with the layout the renderer chose.
- Layout search: top-down and left-to-right, 4/6/8 elements per row, two box widths
  and growing spacing; the first layout that passes every gate and fits 1440×900 wins.
- `[viewport/fit]` (showcase): a view about narrower than 1.7:1 is reported before
  delivery instead of failing only in `visual-check`.
- "Sandwich" layering: services shared by two hubs sit between them; elements of one
  row that talk to each other sit side by side.
- `views[].exclude_relationships` (with `*` wildcards) to hide shared-infrastructure
  arrows; `views[].label` for the navigation bar.

### Changed
- Every layout problem of a view is reported at once (overlaps, text fit, routes,
  crossings, labels, fit), not stage by stage.
- The glossary is printed inside the SVG under the key, only with the terms the view
  uses; glossary keys may contain spaces ("EF Core" also covers "EF").
- Method advisories show their finding in the diagnostic message (e.g. the acronym).
- `placement` cells are visual (row 0 at the top) in both orientations; spacing still
  grows on retries when `gap_x`/`gap_y` are authored; `max_per_row` accepts up to 8.
- Long words without spaces wrap at camelCase, digits or `- _ . /`.
- Navigation tells apart views of the same type and scope (label, else title).

## [0.1.0] - 2026-10-08

First public release. Forked from
[bizify](https://github.com/daniellins/bizify) at commit `7e174b9` (itself a fork of
[Archify](https://github.com/tt-a1i/archify) 2.17.0-dev.1).

### Added
- C4 model input: one `*.c4.json` file (`diagram_type: "c4"`, `schemas/c4.schema.json`) with
  `model.elements` (person, softwareSystem, container, component; `parent`, `external`,
  `technology`, `description`, `shape: database|queue`, `brand`), `model.relationships`
  (`description`, `technology`, `async`) and `views[]`.
- Four view types: `systemLandscape`, `systemContext`, `container`, `component`, with `scope`,
  `include` / `exclude`, `layout` (`direction`, `max_per_row`, `element_width`, `gap_x`, `gap_y`),
  `placement`, `routes` and guided `chapters`.
- View resolver with implied relationships: relationships between low-level elements are lifted to
  the level each view draws and merged with a count.
- Automatic layout: people on top, scope inside a dashed boundary, stores and queues in the last
  boundary row, called systems in a side column, left-to-right for deep views; label placement
  search with automatic spacing growth.
- Orthogonal relationship routing ported from Archify's architecture renderer.
- Drill-down: `deliver` without `--view` writes one linked HTML per view (`<view-key>.html`) and
  returns `{ ok, directory, entry, views }`; a navigation bar links the views and ⊕ elements open
  the next level on double-click or Shift+Enter.
- Rules R-C4-01..05 (HARD) and R-C4-06..13 (SOFT), paraphrased from the c4model.com notation
  guidance and review checklist (CC BY 4.0); generated view titles and key; `meta.glossary` card.
- English and Brazilian Portuguese (`meta.locale: "pt-BR"`) viewer, titles and messages.
- Example models and a `node:test` suite for the resolver, layout and renderer.

### Removed (relative to bizify)
- The six business diagram types (WBS, BPMN, VSM, impact map, story map, SIPOC), their schemas,
  references, examples and gallery.

[Unreleased]: https://github.com/daniellins/c4ify/commits/main
