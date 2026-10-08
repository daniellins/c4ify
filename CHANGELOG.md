# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
