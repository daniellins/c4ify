# Authoring an Impact Map (`diagram_type: "impactmap"`)

Method and sources: `theory-planning-maps.md` §1 (Adzic). Schema:
`schemas/impactmap.schema.json`. Example: `examples/mobile-payments.impactmap.json`.

## When

The reader must see **why** a product milestone exists, **whose** behaviour has
to change, and which deliverables are only options: project inception, scope
disputes ("shopping list" backlogs), proposal problem/solution slides. Not for
routine maintenance without a business goal, nor for sequencing work (use a
story map for the chosen deliverable, a WBS for the committed scope).

## Authoring steps

1. One `goal` node: the business problem, not the solution ("Aumentar
   pagadores ativos", not "Lançar o app"). Give it `metric` with `name`,
   `baseline`, `target`, `deadline` (plus optional `meter`, `constraint`, `unit`).
2. `actor` nodes under the goal: specific people or groups (persona, role,
   department), each with `actor_type` primary | secondary | off-stage.
   Include those who can obstruct the goal.
3. `impact` nodes under each actor: the **behaviour change** vs today, with
   `direction` increase | decrease | start | stop. Include at least one negative
   or obstructing impact when there are three or more actors.
4. `deliverable` nodes under impacts: high-level options (software or
   `deliverable_kind: "organisational"`), never a committed backlog.
5. Mark `on_path: true` on the deliverable(s) of the next iteration — the
   ancestors join the path automatically. Keep the path short: one actor, one
   impact, one or few deliverables.

## Fields

| Field | Notes |
|---|---|
| `nodes[].id` / `level` / `parent` | Strict hierarchy goal → actor → impact → deliverable; array order = sibling order (top to bottom). |
| `label` | ≤ 90 chars; wraps to up to 3 lines. |
| `note` | Details-panel text (persona sketch, acceptance idea). |
| `metric` | Goal only: `name` (required), `baseline`, `target`, `deadline`, `meter`, `constraint`, `unit`. The card shows `baseline → target · até deadline`. |
| `actor_type` | Actors only; badge PRIMÁRIO / SECUNDÁRIO / FORA DE CENA. |
| `direction`, `priority` | Impacts; `priority` 1–9 also on deliverables (shown as P1…). |
| `deliverable_kind` | `software` or `organisational`. |
| `on_path` | Selected path: emphasised connectors (`a-emphasis`) and stronger borders; summary card lists it. |
| `meta.node_width` | 140–260. Default: auto-widened toward a ~2:1 first screen. |
| `meta.summary` | `false` removes the "Caminho selecionado" card. |

## Layout model

Left → right tidy tree in four labelled columns (POR QUÊ? / QUEM? / COMO? /
O QUÊ?). Leaves stack top to bottom; each parent centres on its children;
actor branches get a wider gap. Connectors are orthogonal elbows without
arrowheads (tree links). Spare width goes to longer connectors, then
`fitAspect` centres. Up to 18 open branches (leaves) per map.

## Rules

HARD (refused): R-IMP-01 exactly one goal · R-IMP-02 goal metric with target
and deadline · R-IMP-04 no level jumping (and level-specific fields only on
their level).

SOFT (advisory; blocks showcase unless waived): R-IMP-03 goal baseline ·
05 goal names a solution · 06 generic actor ("usuários", "clientes") ·
07 actor without `actor_type` · 08 impact without direction or that reads like
a feature ("tela", "API", "módulo") · 09 no negative impact with ≥3 actors ·
10 open branch (actor without impact, impact without deliverable) · 11 no path,
path over >50% of deliverables, or path through several actors · 12 more than
8 deliverables under one impact.

## Repairs

- *Label does not fit three lines* → shorten it, or set `meta.node_width`.
- *Metric line does not fit* → shorten `metric.unit`/`deadline` ("jun/2027").
- *More than 18 open branches* → prune deliverable options, or split one map
  per actor.
- *R-IMP-08 false positive* (a real behaviour that mentions "app") → rephrase
  as behaviour ("Paga pelo celular…") or waive with the reason.
- *R-IMP-10 on an actor you keep for context* → waive it with the reason.

## Minimal spec

```json
{
  "schema_version": 1,
  "diagram_type": "impactmap",
  "meta": { "title": "Mapa de Impacto — Portal", "locale": "pt-BR", "quality_profile": "showcase" },
  "nodes": [
    { "id": "meta", "level": "goal", "label": "Reduzir chamados de segunda via",
      "metric": { "name": "Chamados/mês", "baseline": 1200, "target": 400, "deadline": "dez/2026" } },
    { "id": "cliente", "level": "actor", "parent": "meta", "label": "Cliente pessoa física", "actor_type": "primary" },
    { "id": "autoatende", "level": "impact", "parent": "cliente", "label": "Emite a segunda via sem ligar", "direction": "start" },
    { "id": "boleto-app", "level": "deliverable", "parent": "autoatende", "label": "Segunda via no portal", "on_path": true }
  ]
}
```
