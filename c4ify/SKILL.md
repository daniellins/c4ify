---
name: c4ify
description: >
  Create validated C4 model architecture diagrams (c4model.com, Simon Brown) as explorable
  standalone HTML: one model with System Landscape, System Context, Container and Component
  views, linked by drill-down (double-click an element to open the next level), with inline
  SVG, dark/light themes, pan/zoom, search, focus and PNG/SVG/WebM export. Enforces the C4
  notation (element types, descriptions, technology on containers and components, labelled
  one-way relationships with protocols, acronyms explained, generated title and key) and
  lifts relationships between levels automatically. Use when the user asks for a C4 diagram
  or C4 model, a system context diagram, diagrama de contexto, container diagram, diagrama
  de contêineres, component diagram, diagrama de componentes, system landscape, panorama de
  sistemas, Structurizr-style model and views, or to document a software system's
  architecture in C4. Not for business diagrams such as WBS/EAP, BPMN, VSM or SIPOC (use
  bizify), nor for generic architecture, workflow, sequence, data-flow or state diagrams
  outside the C4 notation (use archify).
license: MIT
metadata:
  version: "0.2.0"
  author: Daniel Lins
  based_on: daniellins/bizify 0.1.0 (MIT), itself forked from tt-a1i/archify 2.17.0-dev.1 (MIT)
---

# c4ify

Describe a software system once, as a C4 model, and deliver one explorable
HTML per view: context, containers, components, linked by drill-down. The
notation is the product: a model that validates follows the C4 guidance, so
every diagram explains itself (title, key, element types, technology,
labelled arrows) to any reader.

## View router

| The reader asks | View | Scope |
|---|---|---|
| Which systems do we run and who uses them? | `systemLandscape` | none |
| What is this system, who uses it, what does it depend on? | `systemContext` | software system |
| What is it made of and how do the parts talk? | `container` | software system |
| How is one container organised inside? | `component` | container |

Default: `systemContext` + `container`. Add `component` only when it adds
value (C4 calls it optional). When the request is ambiguous, run
`node bin/c4ify.mjs guide "<scenario>" --json` (EN or PT).

## Fast authoring path

1. Read, and only read: `references/authoring-c4.md`,
   `schemas/c4.schema.json`, `schemas/common.schema.json` and one example in
   `examples/`. Open `references/theory-c4.md` for a rule's rationale or a
   level boundary, not by default.
2. Collect the facts before writing: user roles, the system in scope, each
   container (runnable or deployable unit: app, API, worker, database, queue)
   with its technology and responsibility, what each one calls and with which
   protocol, and which systems belong to someone else (`external: true`). When
   the diagram must reflect real code, read the repository (manifests,
   docker-compose, Kubernetes, IaC, API clients) instead of guessing. Ask only
   for facts that change the diagram; never invent technologies or protocols.
3. Write the candidate JSON first; no coordinates. Author every element and
   relationship once in `model`, at the lowest level you model (relationships
   are lifted to higher views automatically), then list the `views`. Set
   `meta.quality_profile: "showcase"`; for Portuguese content set
   `meta.locale: "pt-BR"` and write every text with full accents. Save the
   model with your file-writing tool, not a shell heredoc (quotes, accents
   and backslashes break heredocs, notably on Windows).
4. Look before you fix. Render a draft of every view; it renders even when
   layout gates fail, outlines each problem in red and lists them all at once:

   ```bash
   node bin/c4ify.mjs draft c4 <model.json> <draft-dir> --png --json
   ```

   `--png` adds a quick 1440×900 screenshot per view (seconds, not minutes):
   look at it. The receipt gives, per view, the layout the renderer chose
   (orientation, elements per row, box width, extra spacing, aspect), whether
   it scrolls, and every problem, notation findings included.
   HARD findings `[R-C4-…]` stop the draft: the model is wrong, fix the facts.
   For layout problems, in this order:
   - **Shared infrastructure** (config, discovery, tracing, logging reached by
     every service): hide those arrows with
     `exclude_relationships: [{ "from": "*", "to": "<id>" }]` and say so in the
     view description, or give them their own view.
   - **Too many elements or arrows for one picture**: split the view (one per
     flow or subsystem) and give each a nav `label`; or, when the reader needs
     the whole picture, keep it and set `layout.fit: "scroll"`.
   - **One element in the way**: `placement: { "<id>": { "row": r, "col": c } }`.
     Rows and columns are visual: row 0 is the top row (people), col 0 the
     leftmost; `.5` centres between two columns. The same cells apply in both
     orientations.
   - **One arrow or label**: `routes[{ from, to, fromSide, toSide, labelDx, labelDy }]`.
   If two rounds of drafts do not reduce the problem count, stop and report.
5. Validate every view (the same gates, now as a pass/fail receipt):

   ```bash
   node bin/c4ify.mjs validate c4 <model.json> --quality showcase --json
   ```

   Each view reports 0 errors and 0 warnings when it passes. `method/R-C4-…`
   SOFT findings mean the notation is incomplete (the message names the
   element or acronym): fix the content, or waive with a reason
   (`references/authoring-contract.md`). `[viewport/fit]` means the view will
   scroll at 1440×900: split it or hide shared relationships.
6. Deliver once the model is frozen (one HTML per view into a folder), then
   collect browser evidence for each view:

   ```bash
   node bin/c4ify.mjs deliver c4 <model.json> <output-dir> --quality showcase --json
   node bin/c4ify.mjs visual-check <output-dir>/<view-key>.html --json
   ```

   `visual-check` takes one to three minutes per view; give it a long timeout
   or run it in the background. It must report containment pass. Look at the
   PNG screenshots it writes (light and dark) before claiming a visual review;
   if you cannot view images, say so.

## What the renderer does for you

- **Views from one model**: default element selection per view, boundary of
  the scope, implied relationships lifted and merged with a count.
- **Layout search**: people on top, stores and queues in the last boundary
  row, called systems beside the boundary, shared services between the two
  hubs that use them; it tries top-down and left-to-right, 4 to 8 elements per
  row, two box widths and growing spacing, and keeps the first layout that
  passes every gate and fits the screen.
- **Notation by construction**: titles "System Context diagram for X", a key
  of exactly what is drawn, the acronyms the view uses (from `meta.glossary`)
  printed under the key, `[Type: Technology]` on every box, cylinders for
  stores, dashed arrows for async, a ⊕ badge on elements with a deeper view.
- **Navigation**: a bar linking every view (by `label`, else type and scope);
  double-click (or Shift+Enter) on an element opens its next level.
- **Viewer**: themes, presets, pan/zoom, search, focus, Semantic Lens, guided
  views (`views[].chapters`), presentation mode, PNG/JPEG/WebP/SVG/WebM export
  (`references/viewer-runtime.md` only when asked).

## Authoring invariants

- One language for all authored text; `meta.locale` localizes the viewer UI,
  titles, types and legend.
- Names are nouns; descriptions state one responsibility; relationship
  descriptions state intent from the source's side ("Reads orders from"),
  technology states the protocol ("JSON/HTTPS", "JDBC", "AMQP").
- People are roles, not individuals. A container is a runtime unit, not a
  library or a Docker image; a component is a grouping inside one container.
- Explain every acronym your audience may not know in `meta.glossary`.
- Keep each view near 20 elements or fewer; split per system or container.
- Never delete a meaningful element or relationship to pass validation.

## Examples

**1. Proposal architecture.** "Desenhe a arquitetura da plataforma de pedidos
no padrão C4" → `locale: "pt-BR"`; people (Cliente, Atendente), the system,
its containers (SPA, API, worker, fila, banco) with technology, external
gateways marked `external`; views `systemContext` and `container`
(see `examples/online-store.c4.json`).

**2. Inside one service.** "Show the components of our Lending API" →
components with `parent: "api"`, relationships authored between components
and to the database; add a `component` view scoped to the API; the container
and context views pick the same relationships up automatically
(see `examples/library-lending.c4.json`).

**3. From a repository.** "Document this repo in C4" → read docker-compose,
manifests and HTTP/queue clients to find containers, technologies and
protocols; cite unknown protocols as pending waivers instead of guessing.

## Anti-patterns

- One diagram mixing levels; pick the view whose scope answers the question.
- "Uses" on every arrow, or arrows between containers without a protocol.
- Repeating the same relationship at every level by hand (it is lifted).
- Waiving SOFT rules for a green receipt. A waiver needs the user's reason,
  or `"Pendente: <fato> não informado"` for a missing fact; list pending
  waivers first in the handoff.

## Delivery and handoff

Use `validate` while repairing and `deliver` once. Report: output folder and
entry view, each view's validation summary, specification/artifact SHA-256
from the receipts, browser evidence status, visual review status, and every
waiver with its reason (`references/delivery-contract.md`). Never claim
success for a non-zero command or a review you did not do.

## Setup

No install needed to render. Verify with `node bin/c4ify.mjs doctor`;
`node bin/c4ify.mjs demo <dir>` renders the bundled example. Developers:
`renderers/README.md` and `npm test`.
