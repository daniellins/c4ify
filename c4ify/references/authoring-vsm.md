# Authoring — VSM (Value Stream Map / Mapa do Fluxo de Valor)

Theory, formulas and sources: `references/theory-vsm.md`. This guide is the IR contract.

## When to use
- Lead time, waiting, rework and where to improve across one value stream (one product family or one
  request type, from trigger to delivery). Few coarse blocks with metrics and a timeline.
- Not for decisions, exceptions or lanes (use `bpmn`), nor for scoping without metrics (use `sipoc`).
- One map = one variant and one state. Draw current and future as two files with the same block order.

## IR fields
| Field | Notes |
|---|---|
| `meta.variant` | `office` (software/service: PT, LT, %C&A) or `manufacturing` (C/T, C/O, uptime, inventory). |
| `meta.state` | `current` or `future`. |
| `meta.value_stream`, `champion`, `date` | Title block (R-VSM-18). `date` is `YYYY-MM-DD`. |
| `meta.demand` | `{ qty, period: day\|week\|month\|year, working_days, unit }`; `working_days` required unless `period: day`. |
| `meta.work_hours_per_day` | Required (office) when PT and LT units differ; converts days to work minutes. |
| `meta.available_time_s` | Manufacturing: available seconds per working day (shift − breaks). Takt = this ÷ daily demand. |
| `meta.units` | Office, required: `{ pt, lt }` in `min\|h\|d`. Manufacturing times are fixed: `ct_s` s, `co_min` min, inventory in days. |
| `meta.totals` | Optional authored totals, checked (R-VSM-08): `lead_time` (office: units.lt; mfg: days), `process_time` (office: units.pt; mfg: s), `activity_ratio_pct`, `rolled_pct_ca` (office), `takt_s`, `inventory_days` (mfg). |
| `meta.node_width` | 130–220 px process block width (default 156). |
| `nodes[].kind` | `supplier` (≤ 1), `customer` (exactly 1), `control` (≤ 3: production control, Jira, CI…), `process`, buffers `inventory` `queue` `supermarket` `fifo`, `kaizen`. |
| process (office) | `pt`, `lt` (> 0, PT ≤ LT), `pct_ca` (0–100], `staff`, `role`, `description`. |
| process (mfg) | `ct_s` (> 0), `co_min`, `uptime_pct`, `operators`, `shifts`, `epe`, `scrap_pct`, `pacemaker`. |
| buffers | exactly one of `before: <process>` / `after: <process>`; `qty` (+ `qty_unit`), `daily_demand` (mfg, defaults to meta demand), or `wait` + `wait_unit`; `max_qty` (fifo); `owner` (supermarket). |
| kaizen | `target` (process or buffer id), `label` (the improvement), `description`, `waste[]`. Drawn as burst K1, K2… |
| top nodes | `delivery` (e.g. "2x/semana") or `role` becomes the subtitle; the customer defaults to the demand. |
| `flows[]` | `{ id?, from, to, channel: material\|info, kind, label? }`. |
| material kinds | `push` (hatched arrow), `pull` / `withdrawal` (circular glyph), `fifo`, `shipment` (truck, only from supplier / to customer). |
| info kinds | `manual` (thin line), `electronic` (emphasis line + lightning glyph). |

## What the renderer computes (never trust authored numbers)
- Office: Σ PT, Σ LT, activity ratio = Σ PT ÷ Σ LT (same unit via `work_hours_per_day`),
  rolled %C&A = Π %C&A, wait per block = LT − PT, takt = work day ÷ daily demand.
- Manufacturing: daily demand, takt, inventory days = qty ÷ daily demand (or `wait`),
  lead time = Σ inventory days (+ Σ C/T), value-added time = Σ C/T, flow efficiency, C/T vs takt.
- Shown in the data boxes, the timeline ladder, the totals box (bottom-right), node passports and the
  automatic summary card (plus a kaizen card when bursts exist). Queue `wait` in office maps is
  informational: the block LT already contains the waiting.

## Layout model
- Top band: supplier over the first gap (left), controls evenly over the chain, customer over the last gap
  (right). Top-to-top info flows run side to side; control ↔ block flows fan down with one channel each
  (the farther block takes the higher channel), labels sit in one row just above the blocks.
- Middle band: gap, block, gap, block, …, gap. The work flow line runs between blocks; buffers sit in the
  gap below the line; the data box hangs under each block. Kaizen bursts sit on the block's lower-right
  corner (or beside a buffer).
- Timeline: office = LT up over the gap before each block, PT down under the block; manufacturing =
  inventory days up over stocked gaps, C/T down under blocks. Totals box bottom-right, legend bottom-left.
- One linear chain only (critical path). At most 10 blocks per row; fonts scale with width.
- Labels on material flows between two blocks stay in the passport (data-edge-label), not on the canvas.

## Rules (ids; details in theory-vsm.md §6)
HARD (render fails):
- R-VSM-01 one variant per map; no fields of the other variant.
- R-VSM-02 one customer, ≥ 1 block, one linear flow reaching the customer; ≤ 1 supplier, ≤ 3 controls.
- R-VSM-03 mfg `ct_s` > 0; office `pt`, `lt` > 0.
- R-VSM-04 office PT ≤ LT after unit normalization.
- R-VSM-05 units declared; `work_hours_per_day` when units mix; %C&A in (0, 100]; `wait_unit` with `wait`.
- R-VSM-06 takt needs demand and available time; non-daily demand needs `working_days`.
- R-VSM-07 each buffer has qty (+ daily demand in mfg) or wait.
- R-VSM-08 authored totals equal computed ones (±0.5 % / ±0.1 d / ±0.5 pp).
- R-VSM-09 future state has ≤ 1 pacemaker; only blocks can be pacemakers.
- R-VSM-10 material vs info channels, kinds and endpoints; supermarket ⇒ pull/withdrawal; fifo buffer ⇔ fifo flow.
- R-VSM-12 (layout) more than 10 blocks cannot be drawn legibly.
SOFT (advisories; showcase blocks them unless waived in `meta.waivers`):
- R-VSM-11 C/T > takt, or C/T ÷ uptime > takt.
- R-VSM-12 fewer than 3 (or more than 15) blocks.
- R-VSM-13 office block without %C&A; mfg data box without C/O or uptime.
- R-VSM-14 future state without kaizen, or push flow left between blocks.
- R-VSM-15 kaizen on a current-state map.
- R-VSM-16 FIFO without `max_qty`; supermarket without `owner`; fifo flow without a fifo buffer.
- R-VSM-17 activity ratio ≥ 50 % or PT = LT everywhere (standards, not observed data).
- R-VSM-18 title block incomplete (value stream, date, champion, demand).

## Repair recipes
| Diagnostic | Fix |
|---|---|
| label does not fit N lines in process/buffer/top node | shorten the label (buffers: ~2 × 12 chars), or raise `meta.node_width`. |
| data line does not fit the data box | raise `meta.node_width` or shorten `epe`. |
| "…of <buffer> does not fit between two blocks" | shorter `qty_unit` (e.g. "pçs"). |
| top band too crowded | fewer controls, more blocks, or wider `node_width`. |
| information flow needs an N px jog | reorder controls or pick another block so the flow runs straight or ≥ 16 px sideways. |
| only one flow may skip a top-band neighbour | route customer ↔ supplier information through the control node. |
| label wider than the gap between two top boxes | shorten the flow label. |
| composition/proper-crossing or ambiguous-corridor | usually two controls feeding interleaved blocks: merge the controls or reassign flows. |
| viewer/viewport-overflow (visual-check) | shorten `meta.title` / `subtitle` (one line) and extra cards. |

## Minimal JSON
```json
{
  "schema_version": 1, "diagram_type": "vsm",
  "meta": { "title": "MFV — Pedido ao deploy", "locale": "pt-BR", "variant": "office", "state": "current",
    "value_stream": "Pedido ao deploy", "champion": "Head de Engenharia", "date": "2026-09-24",
    "demand": { "qty": 40, "period": "month", "working_days": 20, "unit": "pedidos" },
    "work_hours_per_day": 8, "units": { "pt": "h", "lt": "d" } },
  "nodes": [
    { "id": "cli", "kind": "customer", "label": "Áreas de negócio" },
    { "id": "dev", "kind": "process", "label": "Desenvolvimento", "pt": 16, "lt": 6, "pct_ca": 85 },
    { "id": "fila", "kind": "queue", "label": "Fila de testes", "before": "qa", "qty": 15 },
    { "id": "qa", "kind": "process", "label": "Testes", "pt": 6, "lt": 4, "pct_ca": 75 },
    { "id": "ops", "kind": "process", "label": "Deploy", "pt": 1, "lt": 5, "pct_ca": 95 }
  ],
  "flows": [
    { "from": "dev", "to": "qa", "channel": "material", "kind": "push" },
    { "from": "qa", "to": "ops", "channel": "material", "kind": "push" },
    { "from": "ops", "to": "cli", "channel": "material", "kind": "push" }
  ]
}
```
Examples: `examples/software-delivery.vsm.json` (office, current) and `examples/machining-cell.vsm.json`
(manufacturing, future: supermarkets, FIFO, pacemaker, kaizen).
