# Theory — VSM (Value Stream Mapping / Mapeamento do Fluxo de Valor — MFV)

Knowledge base for an agent authoring VSM specs in bizify. Two variants:
**manufacturing** (Rother & Shook material + information flow) and **office** (Martin & Osterling
knowledge-work VSM, which also covers software delivery). Source tags `[S#]` resolve in §9.
`[ASSUMPTION]` = not verified against a primary text in this research pass.

## 1. Purpose, when to use, scope

- A value stream is "all the actions (both value-creating and non value-creating) required to bring
  a product from raw material to the arms of the customer" [S3]. VSM diagrams material/work flow **and**
  information flow for one product family, from order to delivery, to expose waste [S3].
- VSM is the **macro** view for leadership to set strategic direction; process-level maps are the
  micro view for the people doing the work. Jumping into micro improvements before the macro picture is
  understood causes suboptimization [S2]. VSM reflects flow **as the customer experiences it**, across
  functional silos [S2].
- **VSM vs BPMN:** BPMN = executable/control-flow detail (gateways, events, lanes) of one process. VSM =
  few coarse blocks, with time/quality metrics and a timeline. Need decisions/exceptions → BPMN.
  Need lead time, waiting, and where to improve → VSM.
- **VSM vs SIPOC:** SIPOC = scoping table (Suppliers-Inputs-Process-Outputs-Customers), no metrics, no
  flow timing. Use SIPOC first to bound scope; then VSM to measure it.
- **Scope rule:** map one **product family** (products sharing similar downstream processing steps and
  equipment) door-to-door inside one facility first; extend to multi-plant later [S1][S4].
  Office: one value stream = one type of customer request from trigger to fulfilment, with a named
  value stream champion and a demand rate (e.g., "XX / year") in the title block [S2].
- The map is a means, not the goal: "Having a perfectly drawn current state map is not the point" [S3].
  Output = current state → future state → implementation (work) plan [S1][S2].

## 2. Icon catalogue

### 2a. Manufacturing (Learning to See) [S1]
| Icon (spec kind) | Meaning | Visual convention | PT-BR |
|---|---|---|---|
| `customer` / `supplier` | Outside source (customer or supplier) | Factory outline with saw-tooth roof; customer top-right, supplier top-left | Cliente / Fornecedor |
| `process` | One area of continuous flow; ends where flow stops (inventory) | Rectangle with process name; one box per flow area, not per step | Processo (caixa de processo) |
| `data_box` | Process attributes | Box under the process box, one attribute per line | Caixa de dados |
| `inventory` | Accumulation between processes | Warning triangle with "I", qty (and days) beneath | Estoque |
| `truck` | External shipment | Truck, frequency label ("2x/week") | Expedição / caminhão |
| `push_arrow` | Material pushed to next process by schedule | Thick striped (hatched) arrow | Seta empurrada (fluxo empurrado) |
| `supermarket` | Controlled inventory from which downstream withdraws | Open-sided box (shelves), open side faces supplying process | Supermercado |
| `withdrawal` | Downstream pulls from supermarket | Curved arrow into supermarket | Retirada (puxada) |
| `fifo_lane` | Sequenced flow with max quantity | Two parallel lines labelled "FIFO → max N pcs" | Pista FIFO |
| `safety_stock` / buffer | Protection stock | Closed-sided box | Estoque de segurança / pulmão |
| `manual_info` | Paper/verbal info flow | Narrow straight line with arrow | Fluxo de informação manual |
| `electronic_info` | Electronic info flow (EDI, MRP) | Zig-zag ("wiggly"/lightning) line with arrow | Fluxo de informação eletrônico |
| `info_label` | What the information is | Small box on the info line ("Weekly schedule") | Rótulo de informação |
| `production_control` | Central scheduling (MRP) | Process-style box at top centre | Controle da produção (PCP) |
| `production_kanban` | Signal to produce | Kanban card icon | Kanban de produção |
| `withdrawal_kanban` | Signal to move/withdraw | Kanban card with hollow/marked variant | Kanban de retirada |
| `signal_kanban` | Batch production trigger (reorder point) | Triangular kanban on its side | Kanban de sinalização |
| `kanban_post` | Where kanbans are collected | Post/mailbox icon | Posto de kanban |
| `load_leveling` | Heijunka box levelling kanban | Box with "OXOX" | Nivelamento (heijunka) |
| `go_see` | Adjusting schedules by walking the floor | Eyeglasses | "Vá e veja" |
| `kaizen_burst` | Improvement needed to reach future state | Starburst/lightning burst on process or flow | Kaizen (explosão kaizen) |
| `operator` | Person (count) | Circle-head figure; count in data box | Operador |
| `timeline` | Lead time vs value-added time | Square-wave ladder along bottom | Linha do tempo |

Exact visual forms of kanban variants follow LEI's icon sheet [S1][S4]; verify shapes against it before
finalizing renderer glyphs [ASSUMPTION on fine detail].

### 2b. Office / service / software (Martin & Osterling) [S2]
| Icon | Meaning | Visual convention | PT-BR |
|---|---|---|---|
| `customer` | Requester / customer of the value stream | Customer at top-right (M&O start numbering at request) | Cliente |
| `process_block` | One macro step done by a function | Box: process name + function/role; below: LT, PT, %C&A | Bloco de processo |
| `staff` | People count in block | Number in block | Pessoas |
| `queue` / `inventory` | Work waiting (items, tickets, files) | Triangle "I" with item count ("45 items") | Fila / trabalho em espera |
| `info_system` | IT system used (IT-1, IT-2) | Labelled box above blocks, linked to blocks that use it | Sistema de informação |
| `push` / `pull` / `fifo` | How work moves | Same arrows as manufacturing | Empurrado / Puxado / FIFO |
| `kaizen_burst` | Improvement needed | Burst on block or flow | Kaizen |
| `timeline` | Per-block LT (upper) and PT (lower) + summary box | Ladder along bottom; summary: Total LT, Total PT, Activity Ratio, Rolled %C&A | Linha do tempo |
Software extension: blocks are pipeline stages (intake, analysis, build, review, test, deploy); queues are
backlogs/PR queues/release trains; info systems are tracker, repo, CI/CD [S5][S6].

## 3. Metrics & formulas

| Metric | Formula / definition | Units | Variant | Src |
|---|---|---|---|---|
| Takt time | available working time per period ÷ customer demand per period | s/unit | both | [S3][S1] |
| Available time | shift time − planned breaks (− meetings, if applicable) | s or min/day | both | [S1] |
| C/T cycle time | how often one part is completed by the process (observed, stopwatch) | s | mfg | [S1] |
| C/O changeover | time to switch from last good part A to first good part B | min | mfg | [S1] |
| Uptime | on-demand machine uptime | % | mfg | [S1] |
| EPE | "every part every ___" — batch/interval at which each variant is made | time | mfg | [S1] |
| Other data box fields | # operators, # product variations, pack size, working time, scrap rate, shifts | — | mfg | [S1] |
| Inventory days | inventory qty ÷ daily customer requirement | days | mfg | [S1] |
| Production lead time | Σ inventory days (+ Σ C/T, negligible) along the critical path | days | mfg | [S1] |
| Value-added / processing time | Σ C/T of processes on the timeline | s | mfg | [S1] |
| PT process time | hands-on touch time to do the work on one item, if uninterrupted | min/h | office | [S2][S6] |
| LT lead time | elapsed time from work available to a block until it is passed downstream (includes waiting) | h/days | office | [S2][S6] |
| %C&A | % of times downstream can use the output as-is, without correcting, adding or clarifying; measured by the **downstream** consumer | % | office | [S2][S6] |
| Total LT / Total PT | Σ LT_i ; Σ PT_i (critical path) | days / min | office | [S2] |
| Activity ratio | Total PT ÷ Total LT × 100 (both in the same unit: convert days with declared work-hours/day) | % | office | [S2] |
| Rolled %C&A | Π (%C&A_i) — share of items passing all blocks with no rework | % | office | [S2] |
| Flow time | work start → work complete, incl. active + wait | days | software | [S7] |
| Flow efficiency | active time ÷ flow time | % | software | [S7] |
| Flow velocity | # flow items completed per period | items/period | software | [S7] |
| Flow load | # flow items in progress (WIP) | items | software | [S7] |
| Flow distribution | ratio of completed features : defects : debt : risks | % | software | [S7] |
| Deployment lead time | code committed → running in production | h/days | software | [S5] |
| Pitch | takt × pack-out quantity (increment released at pacemaker) | min | mfg future | [S1] |

Worked check from M&O Fig. 1.2 [S2]: PT = 10+5+120+30+15 = 180 min; LT = 1+0.5+5+2+1 = 9.5 days;
Activity ratio 3.9% (= 180 ÷ (9.5 × 480 min), i.e. 8-h day); Rolled %C&A = .50×.75×.85×.99×.95 = 30.0%.
**Lesson:** the working-day length is an explicit input; activity ratio is meaningless without it.

## 4. Methodology

### 4a. Manufacturing [S1]
1. **Select product family** (from product × process-step matrix); appoint a value stream manager.
2. **Current state**: walk the door-to-door flow quickly first; then collect data **starting at shipping
   and working upstream**; use a stopwatch and do not rely on standard times; map the whole stream
   yourself; draw by hand in pencil on the floor [S1]. Draw customer + demand → processes + data boxes →
   inventories → supplier + trucks → information flow (production control, schedules) → push/pull arrows
   → timeline and totals.
3. **Future state — the 8 questions** [S1]:
   1. What is the takt time (based on available working time of the downstream processes closest to the customer)?
   2. Build to a finished-goods supermarket from which the customer pulls, or directly to shipping?
   3. Where can you use continuous flow processing?
   4. Where will you need supermarket pull systems to control production of upstream processes?
   5. At what single point (the pacemaker process) will you schedule production?
   6. How will you level the production mix at the pacemaker process?
   7. What increment of work (pitch) will you consistently release and take away at the pacemaker?
   8. What process improvements are necessary for the stream to flow as designed? (→ kaizen bursts)
   Also: develop EPE capability upstream of the pacemaker ("every part every day", then shift, hour…) [S1].
4. **Implementation / work plan**: split future state into loops (pacemaker loop first, then upstream
   loops); per loop list objectives, goals, measurable targets, owners, dates; review the plan
   periodically (value stream plan / review) [S1] [ASSUMPTION on exact plan-form fields].
   Pacemaker ≠ bottleneck; it is usually near the customer end (often final assembly), or upstream when
   everything after it flows FIFO [S3].

### 4b. Office / software delivery [S2][S5]
1. **Prepare**: charter — scope (trigger and end point), demand rate, value stream champion, a
   cross-functional team with authority over the whole stream (higher-level team than usually expected) [S2].
2. **Walk the stream** (gemba), interview the doers, collect PT, LT, %C&A **per block from actual work
   items**, %C&A as reported by the downstream block [S2][S6].
3. **Current state**: 5–15 blocks [ASSUMPTION: commonly cited M&O guidance, not verified in this pass];
   info systems on top, work flow left→right, queues between blocks, timeline + summary box.
4. **Future state**: design for flow (remove/merge blocks, reduce queues and batch sizes, pull/FIFO,
   raise %C&A at source); mark kaizen bursts; re-compute totals as **targets**.
5. **Transformation plan**: prioritized improvements with owners/dates; measure against target metrics;
   iterate current→future repeatedly [S2].
6. **Software specifics**: choose the value stream to start with (e.g., "idea → production" of one
   product/service); map stages including approvals and handoffs; deployment pipeline stages are
   primary improvement targets [S5]. Label waste with Poppendieck's software wastes [S8].

### 4c. Waste taxonomies
| Toyota 7 wastes (TIMWOOD) + S | PT-BR | Poppendieck software equivalent (2003) [S8][S9] |
|---|---|---|
| Transportation | Transporte | Task switching |
| Inventory | Estoque | Partially done work |
| Motion | Movimentação | Motion / handoffs |
| Waiting | Espera | Waiting (delays) |
| Overproduction | Superprodução | Extra features |
| Over-processing | Processamento excessivo | Extra processes |
| Defects | Defeitos | Defects |
| Skills (unused talent) — 8th waste | Talento não utilizado | — (2006 list adds Relearning, Handoffs) |
TIMWOODS acronym is practitioner shorthand [Bronze]; Liker adds "unused employee creativity" [S10].

## 5. Layout conventions [S1][S2]
- **Top band = information flow**: customer top-right, supplier top-left (mfg), production control /
  info systems top-centre; info lines run right→left (customer orders in) and down to processes.
- **Middle band = material/work flow** left→right, supplier → processes → customer (shipping truck
  bottom-right to customer). Inventory triangles sit **between** process boxes, on the flow line.
- **Data boxes / metric rows directly under each process box**, aligned in one row.
- **Timeline ladder along the bottom**: upper steps = waiting (inventory days, or LT), lower steps =
  process time (C/T or PT), each step aligned under its triangle/box; **totals box at bottom-right**
  (mfg: production lead time + processing time; office: Total LT, Total PT, Activity Ratio, Rolled %C&A).
- Title block: value stream name, state (current/future), date, champion, demand rate [S2].
- Future state: kaizen bursts attached to the element they change; supermarkets/FIFO replace triangles;
  pacemaker visibly marked. Keep the same left→right order as the current state for comparability.
- Parallel sub-flows stack vertically and merge before the downstream block; timeline follows the
  **longest** (critical) path [ASSUMPTION: common practice].

## 6. Validation rules (renderer / linter)
| ID | Level | Rule |
|---|---|---|
| R-VSM-01 | HARD | `variant` ∈ {manufacturing, office}; `state` ∈ {current, future}; one state per map (never mixed). |
| R-VSM-02 | HARD | Exactly one `customer`; ≥ 1 process block; every block reachable on the flow path customer-ward. |
| R-VSM-03 | HARD | Manufacturing blocks have `ct` (> 0); office blocks have `pt` and `lt` (> 0). |
| R-VSM-04 | HARD | Office: `pt ≤ lt` per block after unit normalization. |
| R-VSM-05 | HARD | `pct_ca` ∈ (0, 100]. Units declared; `work_hours_per_day` declared whenever days and minutes/hours mix. |
| R-VSM-06 | HARD | Takt requires `available_time > 0` and `demand > 0` in the same period. |
| R-VSM-07 | HARD | Inventory/queue has `qty` + `daily_demand` (days computed) or explicit `wait` time; never neither. |
| R-VSM-08 | HARD | Authored totals (lead time, PT, activity ratio, rolled %C&A, inventory days) equal computed values within rounding (±0.5 % / ±0.1 day); else error, computed value wins. |
| R-VSM-09 | HARD | Future state: at most one `pacemaker` (single scheduling point, Q5) [S1]. |
| R-VSM-10 | HARD | Edges: material/work edges connect flow nodes only; info edges connect control/customer/supplier/systems to blocks; `kind` ∈ {push, pull, fifo, withdrawal} / {manual, electronic}. |
| R-VSM-11 | SOFT | Warn when any block `ct > takt` (cannot meet demand) and when `ct` ≈ takt without uptime slack. |
| R-VSM-12 | SOFT | Warn when block count < 3 or > 15 (too coarse / process map in disguise) [ASSUMPTION thresholds]. |
| R-VSM-13 | SOFT | Warn when a block lacks `pct_ca` (office) or data box lacks C/O, uptime (mfg). |
| R-VSM-14 | SOFT | Future state with zero kaizen bursts, or with push arrows remaining between flow-able blocks → warn. |
| R-VSM-15 | SOFT | Kaizen bursts on a current-state map → info: consider moving to future state [ASSUMPTION]. |
| R-VSM-16 | SOFT | `fifo_lane` without `max_qty`; supermarket without owner process → warn. |
| R-VSM-17 | SOFT | Activity ratio ≥ 50 % or PT = LT on all blocks → warn "likely standards, not observed data". Heuristic. |
| R-VSM-18 | SOFT | Missing title-block fields (value stream name, date, champion/owner, demand rate). |

## 7. Anti-patterns
- **Mapping the whole company / all products at once** instead of one product family [S1][S4].
- **Mapping from memory, standards or ERP data** instead of walking the gemba; file data reflects
  "times when everything was running well" [S1].
- **Too many boxes / process map in disguise**: one box per task, gateways, exception paths → use BPMN [S2].
- **Maps with no metrics** ("value stream maps with no metrics on them at all") [S2].
- **Mixing current and future state** on one canvas; blurs baseline vs target.
- **Mapping one department's process instead of the cross-functional value stream** (suboptimization) [S2].
- **Map as deliverable**: no future state or no implementation plan with owners [S1][S3].
- **Delegating mapping to a staff analyst**; the value stream manager/team maps it themselves [S1][S2].
- **Summing lead times of parallel branches** instead of taking the critical path.
- **Activity ratio with inconsistent units** (calendar days vs work minutes undeclared).

## 8. Worked mini-examples

### 8a. Office/software — "idea to production", current state
Assumptions: 8 work-hours/day; timeline on single path; demand 40 change requests/month.
| # | Block (function) | PT | LT | %C&A |
|---|---|---|---|---|
| 1 | Intake & triage (Product Owner) | 0.5 h | 5 d | 70 % |
| 2 | Refinement / spec (PO + Tech Lead) | 4 h | 3 d | 80 % |
| 3 | Development (Dev team) | 16 h | 6 d | 85 % |
| 4 | Code review (Peers) | 1 h | 2 d | 90 % |
| 5 | QA / test (QA) | 6 h | 4 d | 75 % |
| 6 | Release & deploy (Ops, change board) | 1 h | 5 d | 95 % |
- Total PT = 28.5 h; Total LT = 25 d = 200 work-h → **Activity ratio = 28.5 / 200 = 14.25 %**.
- **Rolled %C&A** = .70 × .80 × .85 × .90 × .75 × .95 = **30.5 %** (≈ 7 of 10 items reworked somewhere).
- Kaizen candidates (future state): WIP limit + pull at intake (LT 5→2 d), definition-of-ready to raise
  %C&A at block 1, test automation (block 5 LT 4→1 d), CD pipeline replacing change board (block 6 LT
  5→0.5 d). Waste tags: waiting, partially done work, handoffs, defects [S8].

### 8b. Manufacturing — tiny current state
Demand 9,600 units/month, 20 days → 480/day. One shift 8 h − 2×10 min breaks = 460 min = 27,600 s.
**Takt = 27,600 / 480 = 57.5 s.** Supplier ships coils weekly (truck); customer receives daily.
| Element | Data | Days |
|---|---|---|
| Inventory raw (steel) | 2,400 pcs-eq | 2,400/480 = 5.0 |
| P1 Stamping | C/T 1 s, C/O 60 min, uptime 85 %, EPE 1 week | — |
| Inventory WIP | 1,920 | 4.0 |
| P2 Welding | C/T 45 s, C/O 10 min, uptime 90 %, 1 operator | — |
| Inventory WIP | 960 | 2.0 |
| P3 Assembly | C/T 62 s, C/O 0, uptime 100 %, 1 operator | — |
| Inventory FG | 1,440 | 3.0 |
- Production lead time = 5 + 4 + 2 + 3 = **14 days**; processing time = 1 + 45 + 62 = **108 s**.
- R-VSM-11 fires: **Assembly C/T 62 s > takt 57.5 s** → needs rebalancing or a second operator/shift.
- Info flow: customer → production control (electronic, daily orders); production control → each process
  (manual weekly schedule, push arrows) → future state: FG supermarket, Assembly as pacemaker, FIFO
  Welding→Assembly, supermarket after Stamping (batch process, long C/O) [S1 pattern].

## 9. Sources
| ID | Citation | URL | Grade |
|---|---|---|---|
| S1 | Rother, M.; Shook, J. *Learning to See*. LEI, 1999 (v1.3 2003). PT-BR: *Aprendendo a Enxergar*, Lean Institute Brasil, 2003 | https://www.lean.org/store/book/learning-to-see/ | Gold |
| S2 | Martin, K.; Osterling, M. *Value Stream Mapping: How to Visualize Work and Align Leadership for Organizational Transformation*. McGraw-Hill, 2014 (Ch. 1, Fig. 1.2 read) | https://tkmg.com/wp-content/files/VSM-Ch-1.pdf | Gold |
| S3 | Lean Enterprise Institute, Lean Lexicon: value-stream mapping; takt time; pacemaker process | https://www.lean.org/lexicon-terms/value-stream-mapping/ | Gold |
| S4 | Lean Institute Brasil — MFV estado atual e futuro; vocabulário (processo puxador, kaizen de fluxo) | https://www.lean.org.br/conceitos/72/mapeamento-do-fluxo-de-valor-vsm-estado-atual-e-futuro | Silver |
| S5 | Kim, G.; Humble, J.; Debois, P.; Willis, J. *The DevOps Handbook*. IT Revolution, 2016 (value stream selection & mapping chapters; LT/PT/%C&A borrowed from S2) | https://itrevolution.com/product/the-devops-handbook-second-edition/ | Gold |
| S6 | CD Foundation / Harness — "Value-Stream Mapping: your software delivery" (LT, PT, %C&A definitions) | https://cd.foundation/blog/2020/06/26/value-stream-mapping-vsm-your-software-delivery/ | Silver |
| S7 | Kersten, M. *Project to Product*. IT Revolution, 2018; Flow Framework site | https://flowframework.org/ffc-discover/ | Gold |
| S8 | Poppendieck, M.; Poppendieck, T. *Lean Software Development: An Agile Toolkit*, 2003; *Implementing Lean Software Development*, 2006 | https://en.wikipedia.org/wiki/Lean_software_development | Gold (books) / Bronze (page) |
| S9 | Ohno, T. *Toyota Production System*, 1988 (7 wastes) | — (not fetched) | Gold [ASSUMPTION: not re-read] |
| S10 | Liker, J. *The Toyota Way*, 2004 (8th waste: unused employee creativity) | — (not fetched) | Gold [ASSUMPTION: not re-read] |
| S11 | eVSM — Takt time, pacemaker selection, pitch example (takt 30 s × 20 pcs = 10 min) | https://www.evsm.com/VSM-Takt-Time-and-Pacemaker | Silver |

## 10. IR suggestion (JSON spec fields)
```jsonc
{
  "type": "vsm",
  "variant": "manufacturing | office",
  "state": "current | future",
  "title": { "value_stream": "", "product_family": "", "champion": "", "date": "YYYY-MM-DD", "pairs_with": "id-of-other-state-map" },
  "units": { "time": "s|min|h|d", "work_hours_per_day": 8, "locale": "pt-BR|en" },
  "demand": { "qty": 9600, "period": "month", "working_days": 20 },
  "available_time": { "per_day_s": 27600, "shifts": 1, "breaks_min": 20 },   // takt computed
  "customer": { "id": "cust", "label": "", "delivery": "daily" },
  "suppliers": [{ "id": "sup", "label": "", "delivery": "weekly" }],
  "control": [{ "id": "pc", "label": "Production control | Jira", "kind": "production_control | info_system" }],
  "blocks": [{
    "id": "p1", "label": "", "function": "", "staff": 1, "pacemaker": false,
    "mfg": { "ct_s": 1, "co_min": 60, "uptime_pct": 85, "epe": "1w", "operators": 1, "shifts": 1, "scrap_pct": 0, "pack_size": 0 },
    "office": { "pt": 0.5, "lt": 5, "pt_unit": "h", "lt_unit": "d", "pct_ca": 70 }
  }],
  "buffers": [{ "id": "i1", "between": ["p1", "p2"], "kind": "inventory | queue | supermarket | fifo | safety_stock",
                "qty": 1920, "daily_demand": 480, "wait": null, "max_qty": null }],
  "flows": [
    { "from": "p1", "to": "p2", "channel": "material", "kind": "push | pull | fifo | withdrawal" },
    { "from": "pc", "to": "p1", "channel": "info", "kind": "manual | electronic", "label": "Weekly schedule" },
    { "from": "sup", "to": "p1", "channel": "material", "kind": "shipment", "frequency": "weekly" }
  ],
  "signals": [{ "kind": "production_kanban | withdrawal_kanban | signal_kanban | load_leveling | go_see", "at": "p3" }],
  "kaizen": [{ "id": "k1", "target": "p3 | i1 | flow-id", "text": "", "waste": ["waiting", "defects"] }],
  "timeline": { "mode": "computed | authored", "path": ["p1", "i1", "p2"], "authored_totals": null },
  "wastes_taxonomy": "timwoods | poppendieck"
}
```
Renderer computes and prints: takt, inventory days, per-step ladder, total lead time, total PT/value-added,
activity ratio (with the work-hours/day used), rolled %C&A, and C/T-vs-takt badges; authored totals are
checked against computed ones (R-VSM-08). `timeline.path` selects the critical path when branches exist.
