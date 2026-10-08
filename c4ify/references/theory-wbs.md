# Theory — WBS / EAP (Work Breakdown Structure / Estrutura Analítica do Projeto)

Knowledge base for authoring and validating WBS diagrams in bizify. Written for the agent:
follow the rules, cite the tags, and never present a heuristic as a standard.
Source tags resolve in section 8. `[ASSUMPTION]` = not verified against a primary source.

---

## 1. Purpose & when to use

- A WBS is a **deliverable-oriented hierarchical decomposition of 100% of the project scope**
  [PMI-WBS3][PMBOK6 §5.4]. It answers **WHAT** is produced, not **WHEN** or **HOW**.
- It is the backbone that schedule, cost estimate, EVM, risk and responsibility attach to
  [GAO-20-195G ch.7][MIL-881F §1.4][NASA-WBS ch.4]. Schedule, cost and EVM must use the *same* WBS [GAO].
- Use a WBS diagram when the reader must see **scope completeness and ownership**: proposals,
  project plans (PT de P&D), kick-offs, scope baseline sign-off, cost roll-up review.
- **Not a Gantt**: no time axis, no dependencies, no durations. Activities live in the schedule,
  *below* work packages [PMBOK6 §6.2]. If the user asks for sequence/dates → Gantt/roadmap, not WBS.
- **Not a mind map**: a mind map is free association (radial, overlapping, any relation). A WBS is a
  strict tree obeying the 100% rule and mutual exclusivity. A radial layout may *render* a WBS,
  but the content rules still apply.
- **Not an org chart**: boxes are deliverables, not departments or people [MIL-881F §3.1.3][NASA-WBS §3.5.2].
  People attach as `owner` (OBS/RAM), never as nodes.

## 2. Canonical concepts & definitions

| Term (EN / PT-BR) | Definition | Tag |
|---|---|---|
| WBS / EAP | "Hierarchical decomposition of the total scope of work to be carried out by the project team to accomplish the project objectives and create the required deliverables." | [PMBOK6 glossary][PMBOK8 via Bronze] |
| WBS (defense/space) | "A product-oriented family tree composed of hardware, software, services, data, and facilities." | [MIL-881F §1.5.3][NASA-WBS §2.1] |
| 100% rule / regra dos 100% | WBS includes 100% of the work defined by scope, incl. project management; at every level, children sum to 100% of parent; nothing outside scope. Also applies to activities inside a work package. | [Haugan 2002 p.17][PMI-WBS3] |
| Mutual exclusivity | No overlap between elements; no single element of work allocated to two or more WBS elements. | [NASA-WBS §2.2][GAO] |
| Work package / pacote de trabalho | "Work defined at the lowest level of the WBS for which cost and duration can be estimated and managed." Point where work is planned, progress measured, EV computed. | [PMBOK6/7 glossary][NASA-WBS gloss.] |
| Planning package / pacote de planejamento | "WBS component below the control account with known work content but without detailed schedule activities"; far-term work, evolves into WPs (rolling wave). | [PMBOK6 glossary][NASA-WBS §3.4] |
| Control account / conta de controle | Management control point where scope, budget, actual cost and schedule are integrated and compared to EV. Intersection of WBS × OBS, assigned to **one** organizational unit. Contains ≥1 WP and may contain PPs. | [PMBOK6][NASA-WBS gloss.][MIL-881F §3.1.4] |
| WBS dictionary / dicionário da EAP | Document describing each element's content, relating it to higher levels; eliminates duplication/overlap; lower level ⇒ more detail. | [NASA-WBS §3.4.4][MIL-881F §2.2.4][GAO] |
| Scope baseline / linha de base do escopo | Approved scope statement + WBS + WBS dictionary; changed only via formal change control. | [PMBOK6 §5.4.3.1][NASA-WBS §3.1] |
| Decomposition | Subdividing deliverables and work into smaller, more manageable components. | [PMBOK6 §5.4.2.2] |
| Rolling wave planning | Near-term work planned in detail, far-term at a higher level (planning packages). | [PMBOK7 glossary] |
| Program WBS vs Contract WBS | Program WBS covers entire program; Contract WBS = contracted elements + contractor extensions, traceable to program codes. | [MIL-881F §1.5.7–1.5.8][NASA-WBS §2.2.2] |
| Common elements | Non-product "enabling" elements every WBS carries: Program Management, Systems Engineering, IATC, System T&E, Training, Data, Support Equipment, Site Activation, Facilities, Spares. | [MIL-881F §1.5.4, App.K][GAO table 6] |
| OBS / RAM (RACI) | Organizational breakdown; RAM crosses WBS × OBS. The CA sits at that intersection. | [PMBOK6 §9.1][NASA-WBS §4] |
| CBS | Cost breakdown; a product WBS lets costs roll up by summing lower elements. Cost *types* (labor, material) are NOT WBS elements. | [GAO][MIL-881F §2.2.5.1] |

**Levels.** L1 = the whole project/program, exactly one element [GAO][NASA-WBS §2.2]. L2 = major
products + common/enabling elements (incl. project management) [NASA-WBS §2.2][GAO]. L3+ = subdivisions
(subsystem, component, module, document, functionality) [NASA-WBS §2.2]. Branches need not reach the
same depth; decompose further where risk/cost/complexity is higher [NASA-WBS §2.3 j][MIL-881F §1.5.3 c].
GAO: every WBS should have **at least 3 levels** [GAO ch.7]. NASA financial systems cap at **7 levels** [NASA-WBS §2.2].

**Types (orientation).**
- *Deliverable/product-oriented* — the Gold-standard default [MIL-881F][NASA-WBS][GAO][PMI-WBS3].
- *Phase-oriented* (L2 = life-cycle phases) — **accepted by PMI** (PMBOK6 §5.4.2.2 shows phases at
  L2) but **explicitly rejected** by NASA ("not recommended", Fig. 3-15) and MIL-881F ("program
  acquisition phases … are not WBS elements"). Conflict: allow it only when declared; warn.
- *Organization/function-oriented* (L2 = Engineering, Fabrication, Test) — rejected by all Gold
  sources [NASA-WBS Fig. 3-16][MIL-881F §2.2.5.1][GAO]. Never author it.
- *Agile variants* — PMI-WBS3 applies WBS to agile/iterative life cycles (e.g., releases/features
  as deliverables) [PMI-WBS3 overview]. Details of its agile decomposition types not verified [ASSUMPTION].

**Coding.** Decimal scheme that (a) identifies the element's level and (b) identifies its parent
[NASA-WBS §2.2, §3.4.2]: `1`, `1.1`, `1.1.1`. NASA prefixes a project number (`123456.02.07.05`);
L2 codes are two-digit (`01` = Project Management in NASA templates) [NASA-WBS App.C].
Lower-level/contractor codes must be traceable to upper-level codes [NASA-WBS §2.2][MIL-881F].

**Dictionary fields.** PMBOK6 §5.4.3.1 list (verified via secondary Silver/Bronze): code of account
identifier, description of work, assumptions and constraints, responsible organization, schedule
milestones, associated schedule activities, resources required, cost estimates, quality requirements,
acceptance criteria, technical references, agreement information. NASA-WBS §3.4.4 adds: title, code,
content description (quantities, end items), index, SOW paragraph, specification, date/revision,
charge code; contract dictionaries add CLIN and contract number.

**Brazilian usage.** EAP = WBS; "pacote de trabalho" = work package; "dicionário da EAP"; "conta de
controle"; "linha de base do escopo"; "entrega" = deliverable; "decomposição". In PD&I work plans
(Lei de Informática / SUFRAMA-CAPDA), reviewers expect an EAP whose deliverables trace to the plan's
stages (etapas) and to the RH/cost tables. That expectation comes from consultancy reviews and the
user's practice (see pdi-workplan-master), **not** from a verified regulation text [ASSUMPTION].

## 3. Decomposition methodology (step by step)

1. **Anchor L1**: one node = the project, named by its end product (e.g., "Plataforma X v1"), not a verb.
2. **Collect scope inputs**: scope statement, requirements, SOW, proposal deliverables [PMBOK6 §5.4.1].
3. **Choose orientation**: product/deliverable (default). If user insists on phases at L2, set
   `orientation: "phase"` and still make L3 deliverables; emit the SOFT warning.
4. **Lay L2**: major products + common elements. Always include **Project Management** at L2
   [GAO][MIL-881F][NASA-WBS App.C]; for R&D also consider Systems Engineering/Integration, Test &
   Validation, Documentation/Data, Dissemination (only if real deliverables).
5. **Decompose each branch** into sub-deliverables until each leaf can be estimated, assigned to one
   owner, scheduled, and verified complete [PMBOK6][NASA-WBS §2.1]. Stop when further splitting only
   produces activities (verbs) — those go to the schedule.
6. **Check 100% at every parent**: "If all children are delivered, is the parent delivered — and
   nothing more?" Add missing children (interim/internal deliverables, PM, integration) [Haugan].
7. **Check exclusivity**: each piece of work appears in exactly one element; fold rework, tests of a
   component, meetings, travel, tooling into the element they serve [MIL-881F §2.2.5.1][GAO].
8. **Far-term fog → planning package**: keep as a leaf `planning-package`; elaborate later (rolling wave).
9. **Code** the tree (decimal) and **assign owners**; mark control accounts if EVM/cost control is needed.
10. **Attach numbers**: effort/cost only on leaves; parents are computed roll-ups (or declared and checked).
11. **Write the dictionary** for every leaf at minimum (description, acceptance criteria, owner).
12. **Baseline**: once approved, change only via change control [NASA-WBS §3.1][PMBOK6].

## 4. Notation & visual conventions

- **Canonical presentation: top-down tree (org-chart style)**; equally standard: **indented outline**
  and **tabular** form [PMI-WBS3 "graphical, textual or tabular"][Wikipedia]. Mind-map/radial is a
  tool-driven variant, not a standard format. Default renderer mode = top-down tree; provide
  `layout: "tree" | "outline" | "table"`.
- **Level styling** (bizify convention, not a standard): L1 = full-width dark header box; L2 = colored
  band per branch (color identifies branch, carried down to descendants); L3+ = lighter tint of branch
  color; leaves rendered as work-package cards.
- **Kind encoding** (bizify convention): work-package = solid border; planning-package = **dashed**
  border + "PP" tag (far-term, not yet detailed); control-account = bracket/outline around its subtree
  or a "CA" badge on the node; project-management element = neutral/grey branch so it doesn't compete
  with product branches.
- **Code first, then label**: "1.2.3 Data connectors". Codes are always shown (they are the join key
  to schedule and cost).
- **Numbers**: show effort/cost bottom-right of card; parents show roll-up in the same unit; optionally
  a thin bar proportional to share of parent.
- **Owner**: small avatar/initials chip; never a separate node.
- **Legibility** [ASSUMPTION — practitioner guidance, no Gold source found]: ≤ 3–4 levels per slide,
  ≤ ~7 L2 branches, ≤ ~30–40 visible nodes. Beyond that: (a) show L1–L2(–L3) overview + one detail
  diagram per L2 branch, (b) switch L3+ to vertical stacks under each L2 box (hybrid tree/outline),
  or (c) render outline/table. Wikipedia notes 3–4 levels typically suffice for most projects (Bronze).
- Connectors are orthogonal parent→child lines; **no cross-links** (a WBS has none).

## 5. Validation rules

HARD = renderer rejects the spec. SOFT = render with a warning listing element codes.

| ID | Level | Rule | Source |
|---|---|---|---|
| R-WBS-01 | HARD | Exactly one root (L1); `parent` null only for it. | [GAO ch.7][NASA-WBS §2.2] |
| R-WBS-02 | HARD | Strict tree: every non-root has exactly one existing parent; no cycles; no cross-links. | [NASA-WBS §2.2 "without allocation … to two or more"] |
| R-WBS-03 | HARD | `id` unique; `code` unique (when present). | [NASA-WBS §3.4.2] |
| R-WBS-04 | HARD | If a coding scheme is used, `code(child) = code(parent) + sep + n` and number of segments = level (root may be `1` or a project prefix). | [NASA-WBS §2.2, §3.4.2] |
| R-WBS-05 | SOFT | Sibling indices contiguous (1,2,3…) and sorted. | [ASSUMPTION — convention] |
| R-WBS-06 | HARD | `level`, if given, equals depth from root (root = 1). | [NASA-WBS §2.2][GAO] |
| R-WBS-07 | HARD | Every leaf is `work-package` or `planning-package`; every non-leaf is not. | [PMBOK6/7 glossary][GAO "lowest level … work package"] |
| R-WBS-08 | HARD | Roll-up: when a parent declares `effort`/`cost` and all children carry values, Σchildren = parent (tolerance ±0.5% or ±1 unit). Missing parent value → computed, not invented. | [GAO checklist "sum of the children elements equal their parent"][Haugan 100%] |
| R-WBS-09 | HARD | Numeric fields ≥ 0; one unit per field across the tree (`h` or `person-month`; one currency). | [ASSUMPTION — data integrity] |
| R-WBS-10 | HARD | If any `control-account` exists: each WP/PP has exactly one CA among self/ancestors; CAs do not nest. | [NASA-WBS §3.4; "WP natural subdivision of CA"][PMBOK6]; non-nesting [ASSUMPTION — EVM practice] |
| R-WBS-11 | SOFT | A non-leaf with a single child (child = 100% of parent ⇒ redundant level). | [Bronze practitioner sources; logical corollary of 100% rule] |
| R-WBS-12 | SOFT | A Project Management element exists at L2. | [GAO "every WBS includes program management as a level 2 element"][MIL-881F §1.5.4][NASA-WBS App.C] |
| R-WBS-13 | SOFT | Depth ≥ 3 levels. | [GAO ch.7] |
| R-WBS-14 | SOFT | Depth ≤ 4 in one diagram (split/outline suggested); > 7 always warn. | legibility [ASSUMPTION]; 7 = [NASA-WBS §2.2] |
| R-WBS-15 | SOFT | Labels are noun phrases (deliverables); warn on verb-initial labels (EN: Develop/Create/Test/Implement…; PT: Desenvolver/Criar/Implementar/Testar/Elaborar…). | [PMI-WBS "nouns"][NASA-WBS product-oriented] |
| R-WBS-16 | SOFT | Lint non-product terms: phases (Phase A, Fase 1, Sprint 3), functions/orgs (Engineering, Design, QA dept.), labor types, rework/retest/refurbish, meetings, travel, warranty, recurring/non-recurring, cost savings, generic "Other/Outros/Misc". | [MIL-881F §2.2.5.1][GAO ch.7][NASA-WBS §3.5.2] |
| R-WBS-17 | SOFT | L2 phase-named while `orientation` ≠ `phase` → warn; if `orientation: phase`, warn once (PMI allows, NASA/MIL reject). | [PMBOK6 §5.4.2.2] vs [NASA-WBS Fig 3-15][MIL-881F] |
| R-WBS-18 | SOFT | Duplicate labels (siblings: always warn; tree-wide: warn) — proxy for overlap. | [NASA-WBS §3.4.4 "eliminate duplication and overlap"] |
| R-WBS-19 | SOFT | Every WP/CA has an `owner`; a CA has exactly one owning org unit. | [NASA-WBS gloss. CA "one organizational unit"][PMBOK6 dict. "responsible organization"] |
| R-WBS-20 | SOFT | Every leaf has `dictionary.description` and `dictionary.acceptanceCriteria`. | [NASA-WBS §3.4.4][GAO][PMBOK6 §5.4.3.1] |
| R-WBS-21 | SOFT, opt-in | WP effort outside 8–80 h. **Folklore heuristic, not in PMI/MIL/NASA/GAO**; off by default; do not enable for R&D with month-scale packages. | [Bronze only — see §6] |
| R-WBS-22 | SOFT | Planning packages carry no detailed dates/activities and should have `effort` estimate (budgeted at summary level). | [NASA-WBS gloss. PP][PMBOK6] |
| R-WBS-23 | SOFT | Leaf with no effort/cost while siblings have values → incomplete roll-up. | [GAO "neither omitted nor double-counted"] |

## 6. Anti-patterns

1. **Org-chart WBS** — L2 = departments/teams/Centers. Rejected [NASA-WBS Fig 3-16, §3.5.3][MIL-881F §3.1.3].
2. **Phase WBS disguised as scope** — L2 = "Fase 1 / Fase 2 / Fase 3" with no products underneath;
   "no clarity on scope definition or products" [NASA-WBS Fig 3-15]. For PD&I plans stages matter:
   keep stages in the schedule and map WPs → etapa in the dictionary, or use `orientation: phase` with
   deliverable L3.
3. **Activity list as WBS** — verb labels ("Desenvolver API", "Fazer testes"); the WBS becomes a to-do
   list and the 100% check becomes impossible [PMI-WBS][PMBOK6: activities are schedule components].
4. **Missing project management / integration / test** — violates 100% rule [Haugan][GAO].
5. **Functional/cost-type elements** — "Design Engineering", "QA", "Direct Labor", "Materials",
   "Travel", "Meetings", "Rework" as nodes [MIL-881F §2.2.5.1][GAO].
6. **Overlap** — "Testes" as a separate branch *and* testing inside each component; double counting.
7. **Single-child chains** — "1.3 → 1.3.1" identical scope; wasted levels [Bronze; NASA §3.5.3 on wasted levels].
8. **Uniform depth obsession** — forcing all branches to same depth; depth should follow risk [NASA-WBS §2.3 j].
9. **Recycled WBS** — copying a prior project's WBS with its mistakes [NASA-WBS §3.5.1].
10. **Generic names** — "Module A", "Other", "Misc"; use actual product names [MIL-881F §2.2.5.1].
11. **Parent numbers typed by hand** that don't match the sum of children.
12. **WBS without dictionary** — boxes without boundaries/acceptance criteria [GAO][NASA-WBS].
13. **8/80 treated as law** — the "8/80 rule" (WP 8–80 labor hours) appears only in exam-prep and vendor
    blogs; it is not in the PMI Practice Standard, PMBOK, MIL-881F, NASA or GAO texts reviewed. Wikipedia
    lists the "80-hour rule", "reporting-period rule" and "if it makes sense rule" as practitioner heuristics.
    Treat as folklore; valid WP size depends on reporting period and management needs [MIL-881F §1.5.3 c].

## 7. Worked mini-example (software R&D, 3 levels, 15 elements, hours roll-up)

Project: "SmartDoc AI Platform v1" (PD&I, 12 months). Orientation: deliverable. Unit: hours.

```
1      SmartDoc AI Platform v1 ................................. 1,840 h  (L1, project)
1.1    Project Management ....................................... 200 h  (L2, CA, owner: GP)
1.1.1    Monitoring Plans & Progress Reports ...................... 120 h  (WP)
1.1.2    Final Technical Report & Accountability Package ........... 80 h  (WP)
1.2    Data Ingestion Module .................................... 520 h  (L2, CA, owner: Tech Lead)
1.2.1    Ingestion Requirements Specification ..................... 80 h  (WP)
1.2.2    Source Connectors (PDF, DOCX, e-mail) ................... 320 h  (WP)
1.2.3    Ingestion Test Suite ..................................... 120 h  (WP)
1.3    Document Classification Model ............................ 840 h  (L2, CA, owner: ML Lead)
1.3.1    Annotated Training Dataset ............................... 240 h  (WP)
1.3.2    Trained Model v1 + Experiment Report ..................... 400 h  (WP)
1.3.3    Model Optimization Package (months 9–12) ................. 200 h  (PP — rolling wave)
1.4    Integrated System ........................................ 280 h  (L2, CA, owner: Tech Lead)
1.4.1    Integrated Release Build ................................. 160 h  (WP)
1.4.2    System Validation Report ................................. 120 h  (WP)
```

Checks: 120+80 = 200; 80+320+120 = 520; 240+400+200 = 840; 160+120 = 280; 200+520+840+280 = 1,840 ✔.
PM at L2 ✔ (R-WBS-12). 3 levels ✔ (R-WBS-13). Every leaf WP/PP ✔ (R-WBS-07). Labels are nouns ✔.
Testing lives inside the product it verifies (1.2.3, 1.4.2), not as a functional "QA" branch ✔.
Note: 1.2.2 (320 h) and 1.3.2 (400 h) break 8/80 — acceptable; R-WBS-21 is off by default.

## 8. Sources

| ID | Citation | URL | Grade |
|---|---|---|---|
| PMI-WBS3 | PMI. *Practice Standard for Work Breakdown Structures*, 3rd ed., 2019 (ISBN 9781628256192). Content taken from PMI product page and secondary summaries; full text not read. | https://www.pmi.org/standards/work-breakdown-structures-third-edition | Gold (indirect) |
| PMI-WBS | PMI. *Practice Standard for WBS*, 2nd ed., 2006 — "core characteristics", deliverables as nouns (via PMI Learning Library summaries). | https://www.pmi.org/learning/library/practice-standard-work-breakdown-structures-8063 | Gold (indirect) |
| PMBOK6 | PMI. *PMBOK® Guide*, 6th ed., 2017, §5.4 Create WBS, glossary. Dictionary field list verified via secondary sources. | https://www.pmi.org/standards/pmbok | Gold (indirect) |
| PMBOK7 | PMI. *PMBOK® Guide*, 7th ed., 2021, glossary (work package, rolling wave). | https://www.pmi.org/standards/pmbok | Gold (indirect) |
| PMBOK8 | PMI. *PMBOK® Guide*, 8th ed., 2025 — reports that Create WBS returns within the Scope domain and baseline = scope statement + WBS + dictionary; not verified in primary text. | https://escritoriodeprojetos.com.br/eap/ | Bronze [ASSUMPTION] |
| MIL-881F | U.S. DoD. *MIL-STD-881F, Work Breakdown Structures for Defense Materiel Items*, 13 May 2022 (§1.5.3–1.5.8, §2.2.4, §2.2.5.1, §3.1.3–3.1.4, §3.2.6, App. K). Read in full text. | https://tensix.com/wp-content/uploads/2025/02/MIL-STD-881F.pdf | Gold |
| NASA-WBS | NASA. *NASA WBS Handbook*, NASA/SP-20210023927, Nov 2021 (§2.1–2.4, §3.4.2, §3.4.4, §3.5, App. C, glossary). Read in full text. A June 2025 revision (NASA/SP-20250006071) exists; not reviewed. The 2018 edition is NASA/SP-2016-3404/REV1. | https://soma.larc.nasa.gov/stp/dynamic/pdf_files/NASA%20SP%2020210023927%20WBS_Handbook.pdf | Gold |
| GAO | U.S. GAO. *Cost Estimating and Assessment Guide*, GAO-20-195G, March 2020, ch. 7 "Step 4: Determine the Estimating Structure – WBS" + best-practice checklist. Read in full text. | https://www.gao.gov/products/gao-20-195g | Gold |
| Haugan | Haugan, G.T. *Effective Work Breakdown Structures*. Management Concepts, 2002 (100% rule, p.17 per citing sources). Book not read. | https://books.google.com/books/about/Effective_Work_Breakdown_Structures.html?id=VhhFDwAAQBAJ | Silver (indirect) |
| Wikipedia | "Work breakdown structure" (history, 80-hour/"if it makes sense" heuristics, representations). | https://en.wikipedia.org/wiki/Work_breakdown_structure | Bronze |
| PE-12 | projectengineer.net, "12 Things to Include in a WBS Dictionary" (mirrors PMBOK6 list). | https://www.projectengineer.net/12-things-to-include-in-a-wbs-dictionary/ | Bronze |
| BrainBOK | PMBOK6 glossary quotes for control account / planning package. | https://www.brainbok.com/guide/pm-fundamentals/glossary/planning-package | Bronze |
| 8/80 | Exam-prep/vendor pages (rock.so, brainscape) — only sources for 8/80. | https://www.rock.so/blog/work-breakdown-structure | Bronze (folklore) |

Not verified: PMI-WBS3 full text (agile decomposition types, representation list); PMBOK6 §5.4 figure
text; any SUFRAMA/CAPDA rule mandating an EAP; slide legibility limits (practitioner experience only).
Conflict to keep visible: phase-oriented L2 (PMI allows; NASA and MIL-881F reject). Also
"a CA contains two or more WPs" (Bronze PT-BR source) vs "one or more WPs" (NASA, Gold) → use NASA.

## 9. IR suggestion (JSON spec fields)

```jsonc
{
  "type": "wbs",
  "meta": { "title": "…", "orientation": "deliverable|phase", "units": { "effort": "h|person-month", "currency": "BRL" },
            "codeScheme": { "enabled": true, "separator": ".", "rootCode": "1" },
            "layout": "tree|outline|table", "maxVisibleDepth": 3, "baselineVersion": "v1", "date": "2026-09-24" },
  "elements": [
    { "id": "e-1-2-2",                      // stable key (required, unique)
      "code": "1.2.2",                     // derived from tree if omitted; validated by R-WBS-04
      "label": "Source Connectors",        // noun phrase (R-WBS-15)
      "parent": "e-1-2",                   // null only for root
      "order": 2,                          // sibling order
      "kind": "project|deliverable|phase|control-account|work-package|planning-package|common-element",
      "commonElement": "project-management|systems-engineering|integration-test|data|training|null",
      "controlAccount": false,             // or use kind=control-account on a deliverable node
      "owner": { "name": "…", "org": "…", "role": "…" },     // OBS link / RAM "A"
      "raci": { "R": ["…"], "A": "…", "C": [], "I": [] },  // optional RAM
      "effort": 320, "cost": 48000,        // leaves: input; parents: optional (checked) or computed
      "stage": "Etapa 2",                  // PD&I stage mapping (etapa) without making it a node
      "status": "planned|in-progress|done",
      "dictionary": {
        "description": "…", "acceptanceCriteria": ["…"], "assumptions": ["…"], "constraints": ["…"],
        "milestones": [{ "name": "…", "date": "…" }], "scheduleActivities": ["…"],
        "resources": ["…"], "qualityRequirements": ["…"], "technicalReferences": ["…"],
        "agreementInfo": "…", "sowRef": "…", "chargeCode": "…", "interfaces": ["e-1-3-2"] },
      "style": { "branchColor": null, "collapsed": false } }
  ],
  "validation": { "rules": { "R-WBS-21": { "enabled": false, "min": 8, "max": 80 } }, "rollupTolerance": 0.005 }
}
```

Renderer behavior: compute `level` and missing parent roll-ups; never invent leaf numbers; show
declared-vs-computed mismatches as R-WBS-08 errors with both values; emit warnings as a list keyed by code.
