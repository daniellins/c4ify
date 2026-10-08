# Notice: origin, attribution and what changed

## Provenance

```
Cocoon-AI/architecture-diagram-generator (Cocoon AI, MIT, v1.0)
  └─ Archify (tt-a1i, MIT), fork point 2.17.0-dev.1
       └─ bizify (Daniel Lins, MIT), business diagrams, fork point commit 7e174b9
            └─ c4ify (Daniel Lins, MIT), C4 model diagrams
```

- [Archify](https://github.com/tt-a1i/archify) is created by [tt-a1i](https://github.com/tt-a1i)
  and based on [Cocoon-AI/architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator).
- [bizify](https://github.com/daniellins/bizify) forked Archify 2.17.0-dev.1 (September 2026) for
  business diagrams (WBS, BPMN, VSM, impact map, story map, SIPOC).
- c4ify forked bizify at commit `7e174b9` (October 2026) and replaced the business renderers with
  a C4 model renderer.

c4ify is an independent downstream project. It is not affiliated with, sponsored by or endorsed by
the Archify author, Cocoon AI, Simon Brown or c4model.com. Archify remains the right tool for
free-form architecture, workflow, sequence, data-flow and lifecycle diagrams; bizify for business
diagrams.

The MIT License requires that the original copyright notices be kept. They are preserved in
[LICENSE](LICENSE) and [c4ify/LICENSE](c4ify/LICENSE).

## What c4ify inherits from Archify (largely unchanged)

| Area | Files |
|---|---|
| Standalone viewer: themes, presets, pan/zoom, search, focus, Semantic Lens, guided views, presentation, exports | `c4ify/assets/template.html` |
| Delivery pipeline: validate, deliver (atomic write, SHA-256 receipts), preview | `c4ify/bin/c4ify.mjs`, `c4ify/bin/preview.mjs` |
| Browser evidence and containment checks | `c4ify/bin/visual-check.mjs` |
| Artifact and composition gates (orthogonal routes, crossings, corridors, border runs, label clearance, readability) | `c4ify/scripts/check-render-output.mjs`, `c4ify/renderers/shared/geometry.mjs` |
| Orthogonal relationship routing, ported from `renderers/architecture/render-architecture.mjs` (algorithm unchanged, wrapped in a per-view factory) | `c4ify/renderers/c4/routing.mjs` |
| Legend, diagnostics, output-path safety, text fitting, i18n framework, brand marks | `c4ify/renderers/shared/*` |

Internal identifiers such as `window.Archify`, `ARCHIFY_*` environment variables and
`<!-- ARCHIFY:… -->` template sentinels were kept on purpose, to make it easier to compare with and
port fixes from upstream.

## What c4ify inherits from bizify

- The method-rule engine: rule ids, HARD rules that refuse the input, SOFT advisories serialized
  into the SVG, the rule that active advisories block the `showcase` profile, and waivers with a
  mandatory reason (`meta.waivers`) (`c4ify/renderers/shared/method.mjs`).
- The Brazilian Portuguese (`pt-BR`) viewer locale.
- First-screen aspect fitting, the kind → palette generator and the repository scaffolding (CI,
  issue templates, contribution flow, documentation layout).

## What is new in c4ify

- **C4 model and views:** one `*.c4.json` model (people, software systems, containers, components,
  relationships) with many views (`systemLandscape`, `systemContext`, `container`, `component`),
  schema `c4ify/schemas/c4.schema.json`.
- **Resolver** (`renderers/c4/resolve.mjs`): view scope, neighbours, include/exclude, and implied
  relationships lifted to the level each view draws, merged with a count.
- **Layout** (`layout.mjs`, `scene.mjs`): people on top, scope inside a dashed boundary, stores and
  queues in the last boundary row, called systems in a side column, automatic left-to-right for
  deep views, automatic spacing growth.
- **Label placement** (`labels.mjs`): a small search for a free spot on each route.
- **Drill-down and navigation:** one HTML per view, a navigation bar, ⊕ elements that open the
  next level on double-click or Shift+Enter.
- **Rules R-C4-01..13** (`rules.mjs`), generated titles and key, glossary card.

## Third-party material

The C4 model was created by Simon Brown. The notation guidance and review checklist at
[c4model.com](https://c4model.com) are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); c4ify paraphrases them, with
attribution, in `c4ify/references/theory-c4.md` and in its rule messages. The "one model, many
views" organization follows [Structurizr](https://structurizr.com) (referenced only; nothing is
bundled).

Brand-mark vector data and its licensing are described in
[c4ify/THIRD_PARTY_NOTICES.md](c4ify/THIRD_PARTY_NOTICES.md). The bundled JetBrains Mono font
subsets are under the SIL Open Font License ([c4ify/assets/JetBrainsMono-OFL.txt](c4ify/assets/JetBrainsMono-OFL.txt)).

## Thanks

To **tt-a1i**, for Archify: its viewer, routing and delivery discipline are the foundation. To
**Simon Brown**, for the C4 model and for publishing its guidance openly. To Cocoon AI, for the
original generator.
