# Bizify documentation

| Document | For |
|---|---|
| [installation.md](installation.md) | Installing the skill in Claude Code (or any agent that reads `SKILL.md`), troubleshooting |
| [architecture.md](architecture.md) | How a spec becomes an HTML artifact; what came from Archify and what is Bizify's |
| [methodology.md](methodology.md) | How rules are researched, graded and enforced (HARD, SOFT, waivers) |
| [adding-a-diagram-type.md](adding-a-diagram-type.md) | Step-by-step guide for contributors adding a new type |

Inside the skill:

| File | For |
|---|---|
| [bizify/SKILL.md](../bizify/SKILL.md) | What the agent reads: type router, fast authoring path, invariants |
| [bizify/references/authoring-contract.md](../bizify/references/authoring-contract.md) | Rules shared by all types (locale, waivers, legend, first screen) |
| `bizify/references/authoring-<type>.md` | Field reference, rules and repair recipes per type |
| `bizify/references/theory-<type>.md` | The method, its rules and graded sources |
| [bizify/references/delivery-contract.md](../bizify/references/delivery-contract.md) | Validate / deliver / visual-check receipts and handoff |
| [bizify/references/viewer-runtime.md](../bizify/references/viewer-runtime.md) | Viewer features: search, focus, guided views, exports |
| [bizify/renderers/README.md](../bizify/renderers/README.md) | Renderer contract (SVG semantics the viewer needs) |
