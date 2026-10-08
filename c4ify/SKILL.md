---
name: bizify
description: >
  Create validated business diagrams for technology projects as explorable standalone HTML
  (inline SVG, dark/light, presets, pan/zoom, search, focus, guided views, trace motion,
  PNG/SVG/WebM export): WBS/EAP with codes, work packages and effort/cost roll-up; BPMN 2.0
  processes with pools and lanes (AS-IS/TO-BE); Value Stream Maps for manufacturing or
  software/office with computed lead time, flow efficiency, %C&A and takt; Impact Maps;
  User Story Maps with release slices; SIPOC. Enforces each method's rules (PMI, NASA, GAO,
  OMG BPMN, Learning to See, Adzic, Patton, Six Sigma). Use when the user asks for an EAP,
  WBS, estrutura analítica, BPMN, mapeamento/modelagem de processos, fluxograma com raias,
  fluxo de valor, MFV, VSM, mapa de impacto, story map, mapa de histórias, SIPOC, or a
  business diagram for a proposal or plano de trabalho. Not for software architecture,
  sequence, data-flow or state diagrams (use archify).
license: MIT
metadata:
  version: "0.1.0"
  author: Daniel Lins
  based_on: tt-a1i/archify 2.17.0-dev.1 (MIT)
---

# Bizify

Turn a business question into a typed JSON spec, let the renderer derive the
layout and compute the numbers, and deliver one self-contained interactive
HTML. The method is the product: every type enforces the rules of its source
standard, so a diagram that passes is not only pretty but methodologically
defensible in front of a client, a PMO or an R&D reviewer.

## Type router

| Type | Question it answers | Theory |
|---|---|---|
| `wbs` | What does the project deliver, and does it cover 100% of the scope? | `theory-wbs.md` |
| `bpmn` | Who does what, in which order, with which decisions and hand-offs? | `theory-bpmn.md` |
| `vsm` | Where does work wait, and how much of the lead time adds value? | `theory-vsm.md` |
| `impactmap` | Which deliverables move the business goal, through whose behaviour? | `theory-planning-maps.md` |
| `storymap` | What is the smallest end-to-end release that delivers the outcome? | `theory-planning-maps.md` |
| `sipoc` | Where does the process start and end, who feeds it and who receives it? | `theory-planning-maps.md` |

The methods chain naturally: impact map (why) → story map (what first) → WBS
(scope baseline); SIPOC (scope a process) → BPMN (logic) → VSM (time and
waste). When the request is ambiguous, run
`node bin/bizify.mjs guide "<scenario>" --json` (EN or PT); it recommends the
type, what the diagram must include and a copy-ready prompt.

## Fast authoring path

1. Pick the type. Read, and only read: `references/authoring-<type>.md`,
   `schemas/<type>.schema.json`, `schemas/common.schema.json` and the type's
   example in `examples/`. Open `references/theory-<type>.md` when you need a
   rule's rationale, a definition, or the method steps — not by default.
2. Collect the facts the method needs before writing (see each authoring
   guide): WBS leaves and owners, BPMN participants and decisions, VSM times
   per step and hours per day, the impact map's measurable goal. Ask only for
   facts that change the diagram; mark unknowns instead of inventing them.
   Never invent numbers — effort, times, %C&A, demand come from the user or
   their documents.
3. Write the candidate JSON first; do not plan coordinates in prose. Author
   semantics (parents, lanes, order, kinds, metrics), set
   `meta.quality_profile: "showcase"`, and for Portuguese content set
   `meta.locale: "pt-BR"`.
4. Validate after every edit:

   ```bash
   node bin/bizify.mjs validate <type> <candidate.json> --quality showcase --json
   ```

   A pass reports 9 artifact checks, 0 composition errors and 0 warnings.
   Fix what each diagnostic names: `[R-…]` HARD rules mean the facts violate
   the method or the arithmetic — repair the facts; `method/R-…` SOFT findings
   mean practice guidance — fix the content, or add a justified waiver when
   the user has a reason (`references/authoring-contract.md`). Layout
   diagnostics say which label, node or branch to shorten, widen or split.
   If two rounds do not reduce the error count, stop and report the remaining
   diagnostics truthfully.
5. Deliver once the candidate is frozen, then collect browser evidence:

   ```bash
   node bin/bizify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json
   node bin/bizify.mjs visual-check <output.html> --json
   ```

   `visual-check` must report containment pass (no scroll at 1440×900 up to
   2048×1320). Look at the PNG screenshots it writes next to the HTML (light
   and dark) before claiming visual review; if you cannot view images, say so.

## What the renderers do for you

- **Layout from structure**: trees, lanes × columns, value-stream bands,
  backbone × release bands and SIPOC columns are placed automatically, with
  orthogonal routes, masked labels and first-screen proportions.
- **Numbers**: WBS roll-ups (Σ), VSM lead time, process time, activity ratio,
  rolled %C&A, takt and inventory days are computed and shown on the diagram,
  in each node's details passport and in an automatic summary card. Authored
  totals are cross-checked.
- **Method rules**: HARD rules refuse the spec; SOFT rules become advisories
  that block `showcase` until fixed or waived with a reason.
- **Viewer**: theme and preset switching, pan/zoom, search, focus, Semantic
  Lens by kind, relationship tracing, guided views (`meta.views`, ≤ 5),
  presentation mode and PNG/JPEG/WebP/SVG/WebM exports come with every HTML.
  Read `references/viewer-runtime.md` only when the user asks about them.

## Authoring invariants

- One primary language for all authored text, with full accents in Portuguese.
  `meta.locale` (`en` default, `pt-BR`) only localizes the viewer UI, default
  legend labels, summary cards and number formatting.
- Labels carry the method's grammar: WBS elements are noun phrases
  (deliverables); BPMN activities are verb + object and gateways ask a question
  or name the outcomes; impacts are behaviour changes; SIPOC steps are verb +
  noun. The linters flag the rest.
- Keep diagrams inside the method's legibility guidance (≤ 7 WBS level-2
  branches, ≤ ~20 BPMN activities per level, 5–12 VSM blocks, 4–7 SIPOC steps).
  When a diagnostic says it is too big, split along the method's seams
  (overview + one diagram per branch, one process level per BPMN, one value
  stream per product family) instead of shrinking text.
- Omit `meta.visual_preset`, `meta.subtitle` and `meta.animation` unless the
  user asks; add `meta.views` to walk readers through the key path.
- Never delete a meaningful label, node or number to pass validation.

## Examples

**1. EAP for a PD&I work plan.** "Monte a EAP do projeto SmartDoc com as
horas por pacote" → `wbs`, `locale: "pt-BR"`; root = product, level 2 =
deliverables + Gestão do Projeto (`common: "project-management"`), leaves with
`effort`, `owner`, `dictionary`; parents roll up automatically. If the user
also gives a parent total that disagrees, R-WBS-08 rejects it — report the
difference instead of silently fixing either number.

**2. AS-IS support process.** "Map our ticket process — customer, service
desk, N2, with the 4-hour escalation" → `bpmn`; the customer as a black-box
pool, three lanes by role, an exclusive gateway with labelled outcomes, a timer
boundary event for the escalation, message flows only between pools.

**3. Delivery value stream.** "Where do our features wait between idea and
production?" → `vsm`, `variant: "office"`, `work_hours_per_day` set; process
blocks with PT, LT and %C&A from the team's data, queues between them; bizify
computes total lead time, activity ratio and rolled %C&A for the totals box.

**4. From goal to MVP.** "Queremos 30% mais lojistas ativos até março — o que
construir?" → `impactmap` with the measurable goal and the selected path,
then a `storymap` whose first release slice implements that path end to end.

## Anti-patterns

- Choosing the type by habit: a WBS for a process, BPMN for scope, VSM without
  times. Ask which question the reader needs answered (router above).
- Typing parent totals or VSM totals by hand "to be safe" — they will be
  checked and must agree; prefer leaving them computed.
- Waiving SOFT rules to get a green receipt. A waiver needs a reason: either
  the user's (a name imposed by a contract), or `"Pendente: <fato> não
  informado"` when a SOFT rule asks for a fact you were not given (VSM
  demand/owner, WBS owners). A pending waiver is a question for the user —
  list it first in the handoff, never fill the gap with invented data.
- Inventing metrics, owners or durations to fill fields; leave them out and
  say what is missing.
- Mapping the whole company in one diagram; the methods all scope first.

## Delivery and handoff

Use `validate` during repair and `deliver` once. Report: output path, type,
validation summary (checks, errors, warnings), specification/artifact SHA-256
from the receipt, browser-evidence status, visual-review status, and every
waiver with its reason. Follow `references/delivery-contract.md` for preview,
receipts and the perceptual review gate. Never claim success for a non-zero
command or a visual review you did not perform.

## Setup

No install is needed to render. Verify with `node bin/bizify.mjs doctor`;
`node bin/bizify.mjs demo <dir>` renders the WBS example. Developers extending
the skill: `renderers/README.md` (renderer contract) and `npm test`.
