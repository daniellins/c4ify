# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- CI actions updated to `actions/checkout@v7` and `actions/setup-node@v7` (Node 20 runtime deprecation).
- Brand marks regenerated from Simple Icons 16.32.0 (no icon changed; version label and notices only).

### Removed
- Unused dev dependencies `parse5` and `saxes`, inherited from Archify's browser tests.

## [0.1.0] — 2026-09-24

First public release. Forked from [Archify](https://github.com/tt-a1i/archify) 2.17.0-dev.1.

### Added
- Six business diagram types with schemas, renderers, examples, authoring guides and theory
  references: `wbs` (WBS / EAP), `bpmn` (BPMN 2.0, descriptive+ palette), `vsm` (office/software and
  manufacturing), `impactmap`, `storymap`, `sipoc`.
- ~100 method rules (`R-WBS-*`, `R-BPMN-*`, `R-VSM-*`, `R-IMP-*`, `R-USM-*`, `R-SIPOC-*`), HARD or
  SOFT, each traced to graded sources.
- Methodology advisories in the artifact checker; SOFT findings block the `showcase` profile unless
  waived with a reason (`meta.waivers`).
- Computed metrics: WBS roll-up with reference-total variance; VSM lead time, process time,
  activity ratio, rolled %C&A, takt and inventory days.
- WBS: hybrid and tree layouts, codes, control accounts, planning packages, dictionary, sublabels,
  group coloring, unnumbered root, up to 10 level-2 columns in `standard`.
- BPMN: pools and lanes, black-box pools, events with triggers, boundary events, gateways, message
  flows, data objects/stores, compact auto-layout that preserves authored lane order.
- Brazilian Portuguese (`pt-BR`) viewer locale.
- `bizify guide` business scenario recipes (EN/PT), `doctor` checks per type, first-screen aspect
  fitting and a 70-test `node:test` suite.

### Removed (relative to Archify)
- Architecture, workflow, sequence, data-flow and lifecycle renderers; architecture compare/delta;
  workflow migration; upstream update checker; Simplified Chinese viewer locale.

[Unreleased]: https://github.com/daniellins/bizify/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/daniellins/bizify/releases/tag/v0.1.0
