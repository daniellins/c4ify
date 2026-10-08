# Authoring a WBS / EAP (`diagram_type: "wbs"`)

Method and sources: `theory-wbs.md`. Schema: `schemas/wbs.schema.json`.
Example: `examples/rd-project.wbs.json`.

## When

The reader must see **what** the project delivers and that 100% of the scope
is covered: proposals, PD&I work plans, kick-off, scope sign-off, cost review.
Not for sequence/dates (schedule), process logic (BPMN) or free ideation
(mind map). People attach as `owner`, never as boxes.

## Authoring steps

1. One root = the project, named by its end product.
2. Level 2 = major deliverables **plus project management**
   (`common: "project-management"`). Deliverable orientation is the default;
   `meta.orientation: "phase"` is allowed only when the user insists (PMI
   accepts it, NASA/MIL reject it) and still needs deliverables at level 3.
3. Decompose until each leaf is estimable, has one owner and a verifiable
   result. Leaves are work packages; far-term fog is `kind: "planning-package"`.
4. Put `effort`/`cost` on leaves only; parents roll up automatically (shown
   with Σ). Declare a parent value only to check it — it must equal the sum.
5. Mark `control_account: true` on the element where cost/schedule are
   controlled (usually level 2); every leaf must sit under exactly one.
6. For PD&I plans, map each package to its `stage` (etapa) instead of turning
   stages into boxes; add `dictionary` (description + acceptance) per leaf.

## Fields

| Field | Notes |
|---|---|
| `elements[].id` / `parent` | Strict tree; only the root has no parent. Order in the array = sibling order. |
| `label` | Noun phrase (deliverable). ≤ 80 chars; wraps to 2–3 lines. |
| `sublabel` | Optional complement (≤ 48 chars, up to 2 lines) under the label, e.g. "TLS 1.3 · AES-256". |
| `group` | With `meta.color_by: "group"`: the branch's group (set on level 2; descendants inherit). `meta.groups` maps group → palette slot (frontend, backend, database, cloud, security, messagebus, external); ≤ 7 groups; legend lists the groups. |
| `code` | Optional; computed as `1`, `1.1`, `1.1.1`. If authored it must be parent code + one segment. `meta.root_code` sets the root (e.g. a project number). |
| `kind` | Derived: root `project`, parents `deliverable` (or `phase`), leaves `work-package`. Author only `planning-package` (or `phase`). |
| `common` | `project-management`, `systems-engineering`, `integration-test`, `documentation`, `training`, `dissemination`. |
| `control_account`, `owner`, `stage`, `status` | `status`: planned, in-progress, done, at-risk (colored dot). |
| `effort`, `cost` | Numbers ≥ 0; units in `meta.units.effort` (default `h`) and `meta.units.cost` (e.g. `R$`). |
| `dictionary` | `description`, `acceptance[]`, `assumptions[]`, `milestones[]` — shown in the details passport; `meta.dictionary_card: true` adds a dictionary card. |
| `meta.layout` | `hybrid` (default: L1 top, L2 row, L3+ stacked under each L2; up to 7 branches in `showcase`, 10 in `standard` — slide-shaped EAPs with one column per epic) or `tree` (tidy top-down; small WBS only). |
| `meta.root_unnumbered` | Root without code; level 2 numbered 1, 2, 3…, level 3 1.1 (proposal convention). |
| `meta.node_width` | 130–240 (default 168) when labels are long. |
| `meta.reference_total` | `{effort?, cost?, source?}` — a total stated elsewhere (manager, proposal). Never replaces the roll-up; the summary card shows it with the difference. Use it whenever the user quotes a total. |
| `meta.summary` | `false` removes the automatic scope-baseline card. |
| `meta.effort_band` | Opt-in `{min, max}` check (e.g. the 8/80 heuristic). Folklore, not a standard: off by default; never for month-scale R&D packages. |

## Rules

HARD (refused): R-WBS-01 one root · 02 strict tree, no cycles · 03 unique
ids/codes · 04 codes follow the hierarchy · 07 leaves are packages, parents are
not · 08 declared parent numbers equal the children's sum · 10 exactly one
control account per leaf path, never nested.

SOFT (advisory; blocks showcase unless waived): 11 single-child parent ·
12 project management at level 2 · 13 depth ≥ 3 · 14 depth ≤ 4 per diagram /
more than 7 level-2 branches · 15 verb-initial labels · 16 non-product items
(meetings, travel, rework, "other") · 17 phases in a deliverable WBS ·
18 duplicated names · 19 missing owner once owners are used · 20 missing
dictionary once dictionaries are used · 21 opt-in effort band · 22 planning
package without estimate · 23 missing number once numbers are used.

## Repairs

- *Label does not fit* → shorten the noun phrase, or raise `meta.node_width`.
- *More than 7 level-2 branches* → group related deliverables under a new
  level-2 parent, or render an overview plus one diagram per branch.
- *Too deep / narrow node* → split the deep branch into its own WBS whose root
  is that branch (keep its code with `meta.root_code`).
- *R-WBS-08 mismatch* → fix the leaf numbers, or delete the parent value.
- *R-WBS-15 false positive* (a noun that looks like a verb) → waive with the
  reason, don't rename to something less precise.

## Minimal spec

```json
{
  "schema_version": 1,
  "diagram_type": "wbs",
  "meta": { "title": "EAP — Portal do Cliente", "locale": "pt-BR", "quality_profile": "showcase" },
  "elements": [
    { "id": "raiz", "label": "Portal do Cliente v1" },
    { "id": "gp", "parent": "raiz", "label": "Gestão do Projeto", "common": "project-management" },
    { "id": "gp-plano", "parent": "gp", "label": "Plano e relatórios", "effort": 80 },
    { "id": "gp-enc", "parent": "gp", "label": "Relatório de encerramento", "effort": 24 },
    { "id": "app", "parent": "raiz", "label": "Aplicação Web" },
    { "id": "app-login", "parent": "app", "label": "Módulo de autenticação", "effort": 120 },
    { "id": "app-painel", "parent": "app", "label": "Painel do cliente", "effort": 200 }
  ]
}
```
