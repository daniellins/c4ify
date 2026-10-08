# Notice — origin, attribution and what changed

## Origin

Bizify is a **fork of [Archify](https://github.com/tt-a1i/archify)**, created by
[tt-a1i](https://github.com/tt-a1i) and released under the MIT License. Archify is itself based on
[Cocoon-AI/architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator)
(MIT, v1.0).

- Fork point: **Archify 2.17.0-dev.1** (September 2026).
- Relationship: independent downstream project, focused on **business diagrams**. Bizify is not
  affiliated with, sponsored by or endorsed by the Archify author. Archify remains the right tool for
  software architecture, workflow, sequence, data-flow and lifecycle diagrams.

The MIT License requires that the original copyright notices be kept. They are preserved in
[LICENSE](LICENSE) and [bizify/LICENSE](bizify/LICENSE).

## What Bizify inherits from Archify (largely unchanged)

| Area | Files |
|---|---|
| Standalone viewer: themes, presets, pan/zoom, search, focus, Semantic Lens, guided views, presentation, exports | `bizify/assets/template.html` |
| Delivery pipeline: validate, deliver (atomic write, SHA-256 receipts), preview | `bizify/bin/bizify.mjs`, `bizify/bin/preview.mjs` |
| Browser evidence and containment checks | `bizify/bin/visual-check.mjs` |
| Artifact and composition checks (orthogonal routes, crossings, corridors, label clearance, readability) | `bizify/scripts/check-render-output.mjs`, `bizify/renderers/shared/geometry.mjs` |
| Legend, diagnostics, output-path safety, text fitting, i18n framework, brand marks | `bizify/renderers/shared/*` |

Internal identifiers such as `window.Archify`, `ARCHIFY_*` environment variables and
`<!-- ARCHIFY:… -->` template sentinels were kept on purpose, to make it easier to compare with and
port fixes from upstream.

## What Bizify changed or added

- **Removed** the architecture, workflow, sequence, data-flow and lifecycle renderers, schemas,
  examples, the architecture compare/delta module, the workflow migration and the upstream update
  checker (which pointed at Archify's release channel).
- **Added** six renderers and JSON Schemas — `wbs`, `bpmn`, `vsm`, `impactmap`, `storymap`,
  `sipoc` — each with an authoring guide and a researched theory reference with graded sources.
- **Added** methodology advisories (`method/R-…`), waivers with mandatory reasons, and the rule that
  active advisories block the `showcase` profile.
- **Added** computed business metrics (WBS roll-up, VSM lead time, activity ratio, rolled %C&A,
  takt, inventory days) with cross-checks against authored totals.
- **Added** a Brazilian Portuguese (`pt-BR`) viewer locale, replacing the Simplified Chinese one in
  this fork; English remains the default.
- **Added** first-screen aspect fitting, business kind → palette mapping for the viewer, the
  `bizify guide` business scenario recipes and a new test suite.

## Third-party material

Brand-mark vector data and its licensing are described in
[bizify/THIRD_PARTY_NOTICES.md](bizify/THIRD_PARTY_NOTICES.md). The bundled JetBrains Mono font
subsets are under the SIL Open Font License ([bizify/assets/JetBrainsMono-OFL.txt](bizify/assets/JetBrainsMono-OFL.txt)).

Method content (rules and definitions) is summarized and cited from the published standards and
books listed in each `bizify/references/theory-*.md`. Those works remain the property of their
authors and publishers; Bizify quotes them only briefly, for reference.

## Thanks

To **tt-a1i**, for Archify: the quality of its viewer and of its delivery discipline is what made a
business-diagram fork worth doing. To Cocoon AI, for the original generator.
