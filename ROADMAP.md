# Roadmap

Directions, not promises. Open an issue to discuss before starting a large item; items marked
**good first issue** are small and well scoped.

## Known limitations (0.1.0)

- **BPMN:** no expanded sub-processes, groups, complex gateways, compensation or event
  sub-processes; the verb+object check is a word-pattern heuristic.
- **VSM:** a single linear chain (parallel branches are rejected); at most 10 blocks per row.
- **Impact map:** left-to-right tree only (no radial layout).
- **SIPOC:** when no crossing-free routing exists for authored links, the render fails with a
  diagnostic instead of reordering items.
- **Linters** (verbs, generic names, "feature disguised as impact") can misfire; waivers exist for that.

## Next

- [ ] More examples per type, in English and Portuguese — **good first issue**
- [ ] BPMN expanded sub-processes and groups
- [ ] VSM parallel branches (merge into the critical path)
- [ ] WBS outline/table layout for very large EAPs; column wrapping for > 10 branches
- [ ] Export of the WBS dictionary as Markdown/CSV alongside the HTML
- [ ] Additional viewer locales (es, fr, de) — **good first issue** per locale

## New diagram types (proposals welcome)

- Kanban board / flow metrics (cumulative flow)
- RACI / responsibility assignment matrix
- Gantt / milestone roadmap
- OKR tree
- Business Model Canvas / Lean Canvas
- Customer journey map / service blueprint
- Risk matrix (probability × impact)

Each new type follows [docs/adding-a-diagram-type.md](docs/adding-a-diagram-type.md), starting with
a sourced theory file.
