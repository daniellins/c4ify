# Roadmap

Directions, not promises. Open an issue to discuss before starting a large item; items marked
**good first issue** are small and well scoped.

## v0.1.0: C4 from JSON (current)

- [x] One model, many views: system landscape, system context, container and component views
- [x] Implied relationships, automatic layout, routing and label placement
- [x] Drill-down between views, one HTML per view
- [x] Rules R-C4-01..13 with waivers
- [ ] Gallery screenshots in the README
- [ ] More example models, in English and Portuguese (**good first issue**)

## v0.2: import Structurizr JSON (planned)

- [ ] `c4ify import workspace.json`: read the Structurizr CLI JSON export and write a
      `*.c4.json` model with its views; report what cannot be mapped.

## v0.3: import Structurizr DSL (planned)

- [ ] `c4ify import workspace.dsl`: c4ify's own parser for a documented subset of the Structurizr
      DSL (model, elements, relationships, views). Unsupported directives such as `!include`,
      `!script` and `styles` fail with the line number instead of being ignored.

## v0.4: more view types (planned)

- [ ] Deployment views (deployment environments, nodes and container instances)
- [ ] Dynamic views (numbered interactions for one scenario)

## Ideas

- Nested enterprise / group boundaries in landscape views
- Import from PlantUML C4 and Mermaid C4 diagrams
- Additional viewer locales (es, fr, de), **good first issue** per locale

New view types follow [docs/adding-a-view-type.md](docs/adding-a-view-type.md), starting with the
c4model.com page that defines the view.
