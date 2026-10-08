# Authoring a SIPOC (`diagram_type: "sipoc"`)

Method and sources: `theory-planning-maps.md` §3 (Six Sigma / ASQ). Schema:
`schemas/sipoc.schema.json`. Example: `examples/release-management.sipoc.json`.

## When

The reader must see the scope of an **operational process** at 35,000 feet:
who supplies what, the 4–7 core steps between a start trigger and an end
event, what comes out, for whom, and the CTQs it is judged by. DMAIC Define,
process-improvement kick-off, the scoping page before a BPMN (detail) or a VSM
(measurement). Not for decisions and branches (BPMN) nor for product scope.

## Authoring steps

1. Name the process (`meta.process`) and set `boundaries.start` (trigger) and
   `boundaries.end` (stop event).
2. `steps[]`: 4–7 verb phrases in `order` — no decisions ("se…", "?").
3. `outputs[]` with `requirements[]` (`ctq`, optional `target`) and their
   customers; `customers[]` are named roles with `confirmed: true` once checked.
4. `inputs[]` and `suppliers[]`: each input traceable to a supplier and to
   the step that consumes it. Suppliers are who; inputs are what.
5. Relate items either with reference fields (`inputs[].supplier`,
   `inputs[].steps`, `outputs[].from_steps`, `outputs[].customers` — not drawn)
   or with `links[]` `{from, to}` (drawn as arrows). Both count for the rules.
6. Optional +CM: `constraints[]` and `measures[]` (shown in a card).
   `meta.variant: "copis"` mirrors the columns (C O P I S) for a redesign.

## Fields

| Field | Notes |
|---|---|
| `suppliers[]`, `customers[]` | `id`, `label` (≤ 70), `scope` internal/external (tag), `note`; customers also `confirmed`. |
| `inputs[]` | `id`, `label`, `supplier`, `steps[]`, `requirements[]`, `note`. |
| `steps[]` | `id`, `label` (≤ 60), `order` (all or none), `note`. Numbered badge; flow arrows join start → steps → end. |
| `outputs[]` | `id`, `label`, `from_steps[]`, `customers[]`, `requirements[]` (CTQ lines on the card). |
| `links[]` | `from`, `to`, optional `id`. Only adjacent columns: supplier→input, input→step, step→output, output→customer. |
| `boundaries` | `start`, `end` chips above and below the process column. |
| `meta.summary` | `false` removes the scope and +CM cards. |

Ids are unique across the five columns; `process-start` and `process-end` are
reserved. Guided views may focus any item of the five columns.

## Layout model

Five column frames. The process column is fixed (start chip, steps, end chip).
Other columns place each item level with the average of what it links to
(barycentre order, then pushed apart and compacted so no column hangs below
the process). Links run out of the source card, along one vertical lane in the
gap between frames, into the target card; lanes are searched so unrelated
links never cross or share a corridor. Level cards get a straight arrow.

## Rules

HARD (refused): R-SIPOC-01 all five columns filled · R-SIPOC-02 start and end
boundaries · R-SIPOC-03 at most 10 steps · R-SIPOC-04 referential integrity:
known ids, links only between adjacent columns, no repeated link, every input
has a supplier, every output a customer.

SOFT (advisory; blocks showcase unless waived): R-SIPOC-03 fewer than 4 or
more than 7 steps · 05 input feeding no step · 06 step label without a verb ·
07 output without CTQ · 08 supplier that looks like an artefact / input that
looks like a role · 09 decision wording in a step · 10 generic or unconfirmed
customer.

## Repairs

- *Links cannot be routed without crossings* → reorder items (array order
  breaks barycentre ties), drop links that repeat what the columns already say,
  or keep the relation as a reference field (not drawn).
- *Label or CTQ does not fit* → shorten; CTQs get two lines at most.
- *More than 7 steps* → raise the altitude (merge steps); the detail belongs
  in the BPMN.
- *R-SIPOC-08 false positive* ("Time de produto" as supplier is fine; "Plano"
  as supplier is not) → waive with the reason if the name is imposed.

## Minimal spec

```json
{
  "schema_version": 1,
  "diagram_type": "sipoc",
  "meta": { "title": "SIPOC — Faturamento", "locale": "pt-BR", "quality_profile": "standard" },
  "boundaries": { "start": "Pedido entregue", "end": "Nota fiscal enviada" },
  "suppliers": [{ "id": "vendas", "label": "Time de vendas" }],
  "inputs": [{ "id": "pedido", "label": "Pedido aprovado", "supplier": "vendas", "steps": ["conferir"] }],
  "steps": [
    { "id": "conferir", "label": "Conferir o pedido" },
    { "id": "calcular", "label": "Calcular impostos" },
    { "id": "emitir", "label": "Emitir a nota" },
    { "id": "enviar", "label": "Enviar ao cliente" }
  ],
  "outputs": [{ "id": "nota", "label": "Nota fiscal", "from_steps": ["emitir"], "customers": ["cliente"], "requirements": [{ "ctq": "prazo", "target": "≤ 24 h" }] }],
  "customers": [{ "id": "cliente", "label": "Comprador corporativo", "confirmed": true }]
}
```
