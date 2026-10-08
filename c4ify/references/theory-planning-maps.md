# Theory — Planning Maps: Impact Map, User Story Map, SIPOC

Knowledge base for an agent authoring three planning/scoping diagrams in bizify. Source tags `[S#]`
resolve in §5. `[ASSUMPTION]` = not verified against a primary text in this research pass.
Rule severity: **HARD** = linter error, spec must not render as "valid"; **SOFT** = warning shown in
the viewer's lint panel. All three worked examples share one fictional product (Carteira "PagaJá", a
mobile payment wallet built as a tech R&D project) so the maps can be cross-linked.

**How the three fit together.** Impact Map answers *why/who/how* and yields candidate deliverables;
User Story Map turns one chosen deliverable (or product) into a user narrative sliced into releases;
SIPOC scopes an *operational process* (not a product) before BPMN details it and VSM measures it.
Adzic: deliverables break down later into user stories / "spine stories" as 4th–6th levels [S1];
Patton: each release slice names target outcomes and impact tied to the "big why" [S6]. So:
impact-map deliverable → story-map `frame.what`; impact-map goal metric → release `success_metric`.

## 1. Impact Mapping (Mapa de Impacto) — Gojko Adzic, 2012

### 1.1 Purpose, when to use
- "Strategic planning technique" that keeps delivery focused by making assumptions explicit and
  aligning activities with business objectives [S2]. Use at product-milestone / project inception, when
  a backlog is a "shopping list of features, without any context" or stakeholders push pet features
  (scope creep) [S1][S2].
- Two stacked assumptions the map exposes: (1) a deliverable will change an actor's behaviour (impact);
  (2) that impact will contribute to the goal [S2]. After shipping, measure both [S2].
- Success criterion: if a milestone hits the goal with different scope, it succeeded; if it delivers
  the requested scope but misses the goal, it failed [S1]. A deliverable that works technically but
  supports no impact "is a failure" [S2].
- Do NOT use for routine maintenance with no strategic objective [S3].

### 1.2 Canonical concepts (4 levels) [S1][S2]
| Level | Question | Content | Getting it right (Adzic) |
|---|---|---|---|
| **Goal** (Why?) | Why are we doing this? | One business objective, centre of map | SMART (Specific, Measurable, Action-oriented, Realistic, Timely); the problem, not the solution; no design constraints; obvious link to money for commercial products. Ex: "Increasing user conversion by 20% in three months" |
| **Actors** (Who?) | Who can produce the effect? obstruct it? who consumes/is impacted? | People/groups whose behaviour matters | Be specific, never "users"; prefer in order: named individual → persona → role/job title → group/department. Types (after Cockburn): **primary** (goals fulfilled, e.g., players), **secondary** (provide services, e.g., fraud team), **off-stage** (interest but neither benefit nor serve, e.g., regulators, senior decision-makers) |
| **Impacts** (How?) | How should behaviour change? How can they help/obstruct? | Behaviour changes | NOT product features — business activities. Show the *change* vs today ("selling tickets five times faster", not "selling tickets"). Include negative/hindering impacts. List only impacts that move toward the goal |
| **Deliverables** (What?) | What can the org/team do to support the impact? | Software features AND organisational activities | Least important level; options, not commitments; high-level only; refine iteratively; consider non-software options (ads, contracts, call-centre scripts) |

- Measurement model for the goal (Gilb, as used in the book): **scale** (what), **meter** (how
  measured), **benchmark** (current), **constraint** (minimum acceptable / break-even), **target**
  (desired) [S3]. Chris Matts: model business value first, express goals as increments of it [S1].
- **Path**: "Never aim to implement the whole map. Instead, find the shortest path through the map to
  the goal!" [S1]. A path = goal → one actor → one impact → one (or few) deliverables chosen for the next
  iteration; after delivery, measure and decide to continue on that branch or move on [S2].
- Grouped impacts of one actor are alternatives — "we do not necessarily have to support all of
  them" [S1].
- Prioritisation aids cited with the method: Kano (must-have/linear/exciter), Purpose-Alignment
  (differentiating/parity/partner/who cares), dot-voting, virtual cash [S3].

### 1.3 Methodology steps
1. Prepare a goal/problem statement before the session (skipping this sends sessions "sideways") [S5].
2. Define the goal + measurement (scale, meter, benchmark, constraint, target) [S1][S3].
3. Brainstorm actors (primary, secondary, off-stage; include obstructers) [S1].
4. Per actor, brainstorm impacts (positive and negative); ask "what else could they do?" [S1].
5. Only now, deliverables per impact — high-level, including non-software [S1].
6. Prioritise impacts, then pick the shortest path; mark it [S1][S5].
7. Deliver, measure behaviour change, re-evaluate [S2]. Workshop 60–90 min [S5], 5–6 people [ASSUMPTION].

### 1.4 Visual conventions
- Mind map with the goal at the root/centre, branches Who → How → What [S1][S2]. Renderer default:
  **left→right tree** (goal at left, four columns labelled WHY / WHO / HOW / WHAT); **radial** as
  alternate mode for wide maps [ASSUMPTION — orientation not prescribed by Adzic].
- Each level visually distinct (colour/shape per level) [ASSUMPTION]; goal node shows metric line
  (benchmark → target by deadline). Actor node shows type badge (P/S/O). Impact node shows direction
  (↑ increase / ↓ decrease / ⊘ obstruct). Selected path = highlighted edges; unselected branches muted.
- Deliverables may expand to deeper levels (stories) — render collapsed by default [S1].

### 1.5 Validation rules
| ID | Sev | Rule | Src |
|---|---|---|---|
| R-IMP-01 | HARD | Exactly one goal per map | S1 |
| R-IMP-02 | HARD | Goal has `metric` + `target` (+ `deadline`); no target → "astronaut" error | S1,S4 |
| R-IMP-03 | SOFT | Goal has `baseline` (benchmark); `constraint` recommended | S3 |
| R-IMP-04 | HARD | Strict hierarchy goal→actor→impact→deliverable; deliverable must reference an impact, impact an actor (no level jumping — "jumper") | S1,S4 |
| R-IMP-05 | SOFT | Goal text does not name a solution/feature ("build app", "launch X") | S1 |
| R-IMP-06 | SOFT | Actor label not generic (`user(s)`, `client(s)`, `usuário(s)`, `cliente(s)` alone) | S1 |
| R-IMP-07 | SOFT | Every actor has `type` ∈ primary/secondary/off_stage | S1 |
| R-IMP-08 | SOFT | Impact phrased as behaviour change (has comparative/direction: faster, more, without, less); flag impacts that look like features (nouns such as "screen", "API", "module", "tela") | S1 |
| R-IMP-09 | SOFT | At least one negative/obstruct impact considered in maps with ≥3 actors | S1 |
| R-IMP-10 | SOFT | Actor with no impact, or impact with no deliverable, shown as open branch (allowed, flagged) | S1 |
| R-IMP-11 | SOFT | A `path` is selected; warn if >50% of deliverables are marked in-scope ("implement whole map") | S1 |
| R-IMP-12 | SOFT | Deliverables stay high-level: warn if depth >3 below deliverable or >~8 per impact ("shopper") | S1,S4 |

### 1.6 Anti-patterns
- **Jumper**: skips levels (actor → deliverable with no impact) [S4]. **Astronaut**: maps goals without
  good metrics [S4]. **Shopper**: too much detail too early [S4].
- Vague goals ("acquire more users") [S3]; goals as scope ("deliver the portal") [S1].
- Impacts that are features [S1]; generic actors [S1]; Water-Scrum-Fall — fixed upfront scope with
  iterative mechanics [S3]; metrics used for control instead of reducing uncertainty [S3]; backlogs
  unmapped to actors/impacts ("story card hell") [S3].

### 1.7 Worked mini-example (PagaJá)
```
WHY  Goal: Increase monthly active payers from 40k to 100k by 2027-06 (meter: ≥1 paid txn/30d)
WHO  Merchant owner (primary) · Consumer aged 18-30 (primary) · Acquirer risk team (secondary)
     · Central Bank Pix rules (off-stage)
HOW  Merchant: accepts QR payments without a POS terminal (↑)
     Consumer: pays at small shops without cash (↑) · Consumer: abandons signup at KYC (⊘, reduce)
     Risk team: approves merchants in 1 day instead of 5 (↑ faster)
WHAT QR code in merchant app · Selfie-based KYC · Auto-approval rules · Shop-owner field sales script
PATH Consumer → pays without cash → QR code checkout   (next iteration only)
```
### 1.8 PT-BR terminology
**Mapa de Impacto**; Objetivo/Meta (Por quê?) · Atores (Quem?) · Impactos = mudanças de comportamento
(Como?) · Entregas/Entregáveis (O quê?); ator primário / secundário / fora de cena and caminho (mais
curto) [ASSUMPTION — no PT edition found; ES usage in S17].

## 2. User Story Mapping (Mapeamento da História do Usuário) — Jeff Patton, 2014

### 2.1 Purpose, when to use
- Replaces the "flat backlog": a flat list loses the big picture ("Gary and the tragedy of the flat
  backlog") [S7][S8]. A map "tells a story about a type of person doing something to reach a goal" [S6].
- Use to build shared understanding, find holes in the story, and slice releases (MVP), learning and
  development strategies [S6][S8]. Not a precise workflow: "If you're looking for the precision of a
  workflow model, flow chart, or UML model, then a story map isn't your best choice" → use BPMN [S6].
- Mindset: minimise output, maximise outcome and impact; MVP = "the smallest product release that
  successfully achieves its desired outcomes" [S8][S9]. "Don't prioritise features — prioritise
  outcomes" (PT: "Não Priorize os Recursos — Priorize os Resultados") [S8].

### 2.2 Canonical concepts [S6][S7]
| Concept | Definition | Convention |
|---|---|---|
| **Users / personas** | Type of person whose story is told; lightweight persona sketches; also the "chooser" who buys | Included on the map with a little info [S6] |
| **User tasks** (steps) | Short verb phrases, basic building block ("Read an email message") | Make great story titles; task fits after "I want to", activity after "so that" [S6] |
| **Activities** | Organise tasks done by similar people at similar times toward a goal ("Going through my inbox") | Top row; often emerge after mapping tasks [S6] |
| **Goal level** | Summary (many tasks for a bigger goal) / Functional ("complete before taking a break") / Sub-functional | Backbone tasks must be of similar goal level [S6] |
| **Backbone** | Activities + high-level tasks in narrative flow | Not prioritised against each other — all essential [S7] |
| **Body / ribs** | Sub-tasks, alternatives, exceptions, details (UI, business rules, data) hanging below | Vertical position = priority; higher = more essential [S6][S7] |
| **Narrative flow** | Left→right = order you'd tell the user's story to someone else | Variations handled by conversation [S6] |
| **Release slice** | Tape line grouping tasks; smallest set letting target users reach their goal = viable release | Target outcomes on a card **left of the slice**; each slice = MVP-type release [S6] |
| **Walking skeleton** | Simplest end-to-end functional version: all backbone + top ribs | First slice / Opening Game [S6][S7] |
| **Opening / Mid / End Game** | Dev strategy for the first release (chess metaphor): skeleton + risky items → complete & enrich major functionality → refine, polish, absorb unforeseen work | Slice release 1 into ≥3 delivery phases [S6] |
| **Now vs later map** | Map today's world (pains, joys, observations) then evolve to future behaviour | Mark map `mode` [S6] |

### 2.3 Methodology steps (Story Map Concepts process) [S6][S8]
1. **Frame**: short brief — *What* (product/feature/problem), *Who* (user types + choosers, benefit for
   each), *Why* (benefit to org: how use leads to more revenue or less cost).
2. **Map the big picture**: "mile-wide, inch deep"; start with the most critical user type; a typical day
   left→right; add other users as they enter the story; identify activities.
3. **Explore**: break tasks down; "wouldn't it be cool if…"; variations, exceptions/recovery, other
   users; add UI, business rules, data; "blue sky" — don't police scope yet; tell the story to others
   and to developers (they flag risky/expensive areas).
4. **Slice out viable releases**: each release names target outcomes, impact and **product success
   metrics** (ideally specific changes in user behaviour).
5. **Slice out a development strategy**: Opening/Mid/End Game for the first release. (The book also
   slices a *learning* strategy — experiments before viable release [S8][S9].)
6. Walk the map with users, stakeholders and developers to verify completeness [S7].
- Book's hands-on drill: write story step by step → organise → explore alternatives → distill backbone → slice to an outcome [S8].

### 2.4 Visual conventions
- Grid: row 0 personas/users (or a lane label per user type); row 1 activities (wide cards spanning
  their tasks); row 2 backbone tasks; below: story cards stacked by priority [S6][S7].
- Horizontal slice lines across the whole width; slice label + outcome card at the **left** margin;
  releases top→bottom (walking skeleton / MVP first); a viable slice spans every backbone activity [S6].
- Card colour by level (activity / task / story) is a common physical convention [ASSUMPTION — Patton
  photos vary]; risky stories flagged [S9]. Multiple user types continue left→right in the same flow
  ("map the whole system… crosses through a number of types of users") [S6].

### 2.5 Validation rules
| ID | Sev | Rule | Src |
|---|---|---|---|
| R-USM-01 | HARD | ≥1 activity; every step belongs to exactly one activity; every story to exactly one step | S6 |
| R-USM-02 | HARD | Activities and steps have explicit `order` (narrative left→right); no ties within a parent | S6 |
| R-USM-03 | HARD | Every story referencing a release uses an existing release id; releases have `order` | S6 |
| R-USM-04 | SOFT | Frame present: `frame.why`, `frame.who`, `frame.what` | S6 |
| R-USM-05 | SOFT | Each release has `goal`/outcome text; SOFT warn if no `success_metric` | S6 |
| R-USM-06 | SOFT | First release (walking skeleton/MVP) has ≥1 story under **every** backbone activity (end-to-end) | S6,S7 |
| R-USM-07 | SOFT | Step and activity labels start with a verb (short verb phrase); activity may be gerund ("Going through…") | S6 |
| R-USM-08 | SOFT | Backbone steps of similar goal level — warn when one activity has >3× the steps of the median [ASSUMPTION heuristic] | S6 |
| R-USM-09 | SOFT | ≥1 persona/user type; stories may carry `persona` that must exist | S6 |
| R-USM-10 | SOFT | Within a step, story `priority` unique & dense (1..n) → vertical position; ties flagged | S7 |
| R-USM-11 | SOFT | Backbone items carry no priority (don't prioritise backbone against itself) | S7 |
| R-USM-12 | SOFT | Unsliced stories allowed ("backlog/later") but shown below last slice | [ASSUMPTION] |

### 2.6 Anti-patterns
- Flat, context-free backlog; missing the big picture and critical functionality [S7][S8].
- Prioritising backbone activities against each other [S7]; deep before wide (violates "mile-wide,
  inch deep") [S6][S9]; mixing goal levels in the backbone [S6].
- Using the map as a precise workflow/flowchart [S6]; treating the map as the spec — stories are
  conversation starters [S9].
- Slices that are not viable end-to-end (a release that is "all of activity 1, none of activity 4")
  [S6]; releases without outcomes/metrics [S6]; prioritising features instead of outcomes [S8].

### 2.7 Worked mini-example (PagaJá merchant onboarding — SaaS-like flow)
```
Frame  What: merchant self-onboarding | Who: shop owner (user), acquirer (chooser) | Why: cut onboarding cost
Persona: "Dona Ana, bakery owner, Android, no POS"
Activities →  Sign up            | Verify business        | Get paid                  | Manage money
Steps      →  Create account     | Send CNPJ · Take selfie| Show QR · Confirm payment | See balance · Withdraw
------ R1 Walking skeleton (outcome: first paid txn in 24h; metric: % merchants paid ≤24h) ------
              phone+OTP          | manual CNPJ review     | static QR · push notice   | balance screen
------ R2 (outcome: approval ≤1 day) ------
              Google sign-in     | auto CNPJ check · liveness | dynamic QR w/ amount  | Pix withdrawal
------ R3 (outcome: repeat use) ------
              invite staff       | —                      | receipts · refunds        | sales report
Dev strategy R1: Opening = QR + manual review end-to-end; Mid = notifications/errors; End = polish, perf
```
### 2.8 PT-BR terminology
PT edition *Mapeamento da História do Usuário* (Alta Books, 2023) keeps **backbone**; Opening/Mid/End
Game = **Abertura, Meio Jogo e Final**; MVP = **Produto Mínimo Viável**; outcomes = **resultados** [S8].
Usage: "mapeamento de histórias de usuário"; atividades, passos/tarefas; "espinha dorsal", "esqueleto
funcional/andante", "fatia de entrega/lançamento" [ASSUMPTION — practitioner blogs, not PT edition].

## 3. SIPOC (Suppliers–Inputs–Process–Outputs–Customers)

### 3.1 Purpose, when to use
- High-level ("35,000-foot") map of suppliers, inputs, key steps, outputs, customers and CTQs, to bound
  scope, create common language and surface inputs nobody controls [S11][S14]. Used at the outset of
  improvement / **Define** phase of DMAIC; in use since late-1980s TQM [S12][S13].
- Position in the toolchain: ASQ — build a high-level **SIPOC+CM** first, it "sets the context for
  detailed mapping", then translate into a flowchart with decisions, actors, timing [S10]. In bizify:
  **SIPOC scopes → BPMN details (decisions, lanes) → VSM measures (lead/process time, waste)** [S10][S14].

### 3.2 Canonical concepts
| Column | Content | Src |
|---|---|---|
| **S** Suppliers | Who/what (internal or external: vendor, department, system) provides inputs | S11,S14 |
| **I** Inputs | Materials, information, technology, approvals needed; per iSixSigma also people, equipment, procedures, data, environment | S11,S12 |
| **P** Process | 5–7 core high-level steps ("35,000-foot"); practitioners accept 4–7, phrased as verbs | S11,S12,S14 |
| **O** Outputs | Products, services, information (incl. byproducts/defects) — measurable ("Approved invoice") | S12,S14 |
| **C** Customers | Main users/receivers of outputs, internal and external, named roles | S11,S14 |
| Boundaries | Definable **start** (trigger) and **stop** (end event) | S12,S14 |
| Requirements / CTQ | Critical-to-Quality metrics on inputs, process and outputs; optional but recommended | S12 |
| **+CM** (ASQ) | **C**onstraints (budget, time, regulation…) + **M**easures (quality, cost, efficiency…) | S10 |
| **COPIS** | Same elements, built customer-first (C→O→P→I→S) to force requirements-first thinking; suits (re)design | S13,S14 |

### 3.3 Methodology steps
1. Name the process; set start trigger and stop event (scope) [S12][S14].
2. Draft the Process column in 4–7 verb-phrased steps [S12][S14].
3. Outputs and customers, with requirements/CTQs per output [S12][S14].
4. Inputs and suppliers, each input traceable to a step [S12][S14].
5. Optional: constraints and measures (SIPOC+CM) [S10].
6. Validate with stakeholders/front-line workers; hand off to detailed mapping [S13][S14].
- Fill order varies: iSixSigma goes S→I→P→O→C [S12]; MSI does S/I → P → O/C [S14]; COPIS C-first [S13].
  Pocket Toolbook order not accessed [ASSUMPTION]. Agent default = order above (steps first so I/S and
  O/C can link to them); offer COPIS when designing a new process.

### 3.4 Visual conventions
- Five columns S | I | P | O | C left→right (table form [S13]); P = numbered steps 1..n (vertical or
  chevrons); start/stop chips above/below P; optional input→step→output→customer connectors or tags;
  CTQ badges beside outputs; +CM footer band (Constraints | Measures) [S10][S12]; COPIS mirrors column
  order [layout details ASSUMPTION].

### 3.5 Validation rules
| ID | Sev | Rule | Src |
|---|---|---|---|
| R-SIPOC-01 | HARD | All five columns non-empty | S11 |
| R-SIPOC-02 | HARD | `boundaries.start` and `boundaries.end` present | S12,S14 |
| R-SIPOC-03 | HARD | Process steps ≤ 10 (hard ceiling); SOFT outside 4–7 | S11,S14 |
| R-SIPOC-04 | HARD | Every input references an existing supplier; every output ≥1 existing customer (referential integrity) | S14 |
| R-SIPOC-05 | SOFT | Every input links to ≥1 step ("inputs unlinked to process steps" is a mistake) | S14 |
| R-SIPOC-06 | SOFT | Step labels start with a verb | S14 |
| R-SIPOC-07 | SOFT | Each output has ≥1 requirement/CTQ | S12 |
| R-SIPOC-08 | SOFT | Supplier ≠ input: flag supplier labels that look like artefacts/data and input labels that look like roles/orgs | S14 |
| R-SIPOC-09 | SOFT | No decision/gateway wording in steps ("if", "approve?", "se") — that belongs in BPMN | S10,S14 |
| R-SIPOC-10 | SOFT | Customers are named roles, not "everyone"/"the company"; confirmed not assumed (`confirmed: true`) | S14 |

### 3.6 Anti-patterns
- "P" turned into a 15–30-step flowchart ("flowchart disguised as SIPOC") — altitude or boundaries
  wrong [S14]. Assuming customer identity instead of confirming it [S14]. Inputs unlinked to steps; no
  validation with front-line workers [S14]. Mixing suppliers and inputs [S14]. Missing start/stop [S12].

### 3.7 Worked mini-example (PagaJá — "monthly firmware/app release to production")
```
Start: release branch cut        End: version live for 100% of users
S: Product team · Dev squads · QA lab · App stores (Apple/Google) · Security office
I: Approved backlog · Code on release branch · Test plan · Store credentials/policies · Pen-test report
P: 1 Freeze scope  2 Run regression  3 Fix blockers  4 Security sign-off  5 Submit to stores  6 Staged rollout
O: Signed app build (CTQ: 0 critical bugs) · Release notes (CTQ: PT-BR+EN) · Rollout report (CTQ: crash-free ≥99.5%)
C: Consumers · Merchants · Customer support · Compliance
+C: Store review ≤48h, Pix regulation  +M: lead time cut→live, crash-free rate
NEXT: BPMN of steps 2–4 (loops, decisions); VSM for lead time
```

### 3.8 PT-BR terminology
SIPOC kept as acronym: **Fornecedores, Entradas, Processo, Saídas, Clientes**; "diagrama/matriz SIPOC";
DMAIC phase Define = **Definir**; CTQ = "crítico para a qualidade"; COPIS kept [S16].

## 4. IR suggestion (JSON spec fields)
```jsonc
// kind: "impact_map"
{ "kind": "impact_map", "title": "", "layout": "tree_lr | radial", "path": ["g", "a1", "i1", "d1"],
  "goal": { "id": "g", "text": "", "metric": "", "meter": "", "baseline": 40000, "constraint": null, "target": 100000, "unit": "payers/month", "deadline": "2027-06" },
  "actors": [{ "id": "a1", "label": "", "type": "primary | secondary | off_stage", "note": "" }],
  "impacts": [{ "id": "i1", "actor": "a1", "behaviour": "", "direction": "increase | decrease | obstruct", "priority": 1 }],
  "deliverables": [{ "id": "d1", "impact": "i1", "label": "", "kind": "software | organisational", "priority": "must | should | could",
                     "status": "option | in_scope | done", "children": [] }],   // children = stories, 4th+ level, collapsed
  "links": { "story_map": "<spec id for d1>" } }
// kind: "story_map"
{ "kind": "story_map", "title": "", "mode": "now | future", "frame": { "what": "", "who": "", "why": "" },
  "personas": [{ "id": "p1", "name": "", "sketch": "", "role": "user | chooser" }],
  "activities": [{ "id": "act1", "label": "", "order": 1, "persona": "p1" }],
  "steps": [{ "id": "s1", "activity": "act1", "label": "", "order": 1 }],
  "stories": [{ "id": "st1", "step": "s1", "label": "", "release": "r1", "priority": 1, "persona": "p1",
                "kind": "subtask | alternative | exception | detail", "risky": false }],
  "releases": [{ "id": "r1", "name": "Walking skeleton", "order": 1, "goal": "", "success_metric": "",
                 "dev_strategy": { "opening": ["st1"], "mid": [], "end": [] } }] }
// kind: "sipoc"
{ "kind": "sipoc", "title": "", "variant": "sipoc | copis", "with_cm": true, "boundaries": { "start": "", "end": "" },
  "suppliers": [{ "id": "su1", "label": "", "scope": "internal | external" }],
  "inputs": [{ "id": "in1", "label": "", "supplier": "su1", "steps": ["p1"], "requirements": [] }],
  "steps": [{ "id": "p1", "label": "", "order": 1 }],
  "outputs": [{ "id": "o1", "label": "", "from_steps": ["p6"], "customers": ["c1"], "requirements": [{ "ctq": "", "target": "" }] }],
  "customers": [{ "id": "c1", "label": "", "scope": "internal | external", "confirmed": true }],
  "constraints": [""], "measures": [""] }
```
Renderer derives: impact-map level columns and path highlight; story-map grid (columns from steps,
rows from release × priority) and slice lines; SIPOC link lines and CTQ badges. Linter runs §1.5, §2.5,
§3.5 rules.

## 5. Sources
| id | Citation | URL | Grade |
|---|---|---|---|
| S1 | Adzic, G. *Impact Mapping* (Provoking Thoughts, 2012), free sample incl. Goal/Actors/Impacts/Deliverables chapters and examples | https://www.impactmapping.org/assets/impact_mapping_20121001_sample.pdf | Gold |
| S2 | impactmapping.org — "About" and "Drawing" pages (Adzic) | https://www.impactmapping.org/about.html ; https://www.impactmapping.org/drawing.html | Gold |
| S3 | Buteau, A. "Impact Mapping: Book Summary" (Gilb measures, mistakes, prioritisation) | https://www.antoinebuteau.com/impact-mapping-book-summary/ | Bronze |
| S4 | Abraham, M. "Book review: Impact Mapping" (2014) — jumper/astronaut/shopper | https://marcabraham.com/2014/01/14/book-review-impact-mapping/ | Bronze |
| S5 | Open Practice Library — Impact Mapping | https://openpracticelibrary.com/practice/impact-mapping/ | Silver |
| S6 | Patton, J. "Story Map Concepts" (Comakers/JPA, 2013) | https://www.jpattonassociates.com/wp-content/uploads/2015/03/story_mapping.pdf | Gold |
| S7 | Patton, J. "The New User Story Backlog is a Map" (2008) | https://www.jpattonassociates.com/the-new-backlog/ | Gold |
| S8 | Patton, J. *User Story Mapping* (O'Reilly, 2014); PT: *Mapeamento da História do Usuário* (Alta Books, 2023), sample TOC | https://altabooks.com.br/wp-content/uploads/2023/12/AMOSTRA_MapeamentodaHistoriadoUsuario.pdf | Gold |
| S9 | Clark, A. "User Story Mapping — book summary" | https://andrewclark.co.uk/product-book-summaries/user-story-mapping | Bronze |
| S10 | ASQ. "Documentation & Process Mapping" (2025) and "SIPOC+CM Diagram" | https://asq.org/-/media/public/wqm/ASQ-WQM25_Document-ProcessMapping.pdf ; https://asq.org/quality-resources/sipoc | Gold |
| S11 | TechTarget. "What is a SIPOC diagram?" (5–7 steps, 35,000-ft) | https://www.techtarget.com/searchcio/definition/SIPOC-diagram-suppliers-inputs-process-outputs-customers | Bronze |
| S12 | iSixSigma. "SIPOC" dictionary entry | https://www.isixsigma.com/dictionary/suppliers-inputs-process-output-customers-sipoc/ | Silver |
| S13 | Wikipedia. "SIPOC" (TQM origin, COPIS, DMAIC Define) | https://en.wikipedia.org/wiki/SIPOC | Bronze |
| S14 | MSI Certified. "Scope your project in 1–2 hours with a SIPOC workshop" (mistakes, SIPOC vs flowchart/VSM) | https://www.msicertified.com/blog/sipoc-diagram/ | Bronze |
| S15 | George, M. L. et al. *The Lean Six Sigma Pocket Toolbook* (McGraw-Hill, 2005) — SIPOC p.38; not accessed | https://archive.org/details/leansixsigmapock00mich | Gold (unread) |
| S16 | PT-BR SIPOC usage (Siteware; Euax) | https://www.siteware.com.br/blog/gestao-estrategica/matriz-sipoc/ ; https://euax.com.br/2024/08/sipoc/ | Bronze |
| S17 | Scrum Manager BoK. "Mapa de impacto" (ES) | https://www.scrummanager.com/bok/index.php/Mapa_de_impacto | Bronze |
