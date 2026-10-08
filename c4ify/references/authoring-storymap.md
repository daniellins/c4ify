# Authoring a User Story Map (`diagram_type: "storymap"`)

Method and sources: `theory-planning-maps.md` §2 (Patton). Schema:
`schemas/storymap.schema.json`. Example: `examples/saas-onboarding.storymap.json`.

## When

The reader must see the user's whole journey (backbone) and how it is sliced
into releases that each achieve an outcome: MVP definition, release planning,
turning an impact-map deliverable into stories, proposal scope by phase. Not a
precise workflow (use BPMN) nor a committed scope tree (use a WBS).

## Authoring steps

1. Frame it: `meta.frame.what`, `who`, `why`; add `personas[]` (role `user` or
   `chooser`).
2. Backbone: `activities[]` (what users do toward a goal) and `steps[]` under
   each activity, both short verb phrases with explicit `order` — left to right
   is the order you would tell the story. Never prioritise the backbone.
3. Stories: `stories[]` under a step, each in a `release` with `priority` 1..n
   inside its step (1 = most essential, top). Flag `risky: true` where
   developers see uncertainty.
4. Releases: `releases[]` with `order`, `goal` (the outcome) and
   `success_metric` (behaviour change). The first release is the walking
   skeleton: at least one story under **every** activity.
5. Stories without `release` are allowed while exploring; they render in a
   "Depois" band below the last slice (and are flagged).

## Fields

| Field | Notes |
|---|---|
| `activities[]` | `id`, `label` (≤ 60), `order` (required by R-USM-02), optional `persona`, `note`. Card spans its steps' columns. |
| `steps[]` | `id`, `activity`, `label`, `order` (unique within the activity). One column each (max 14). |
| `stories[]` | `id`, `step`, `label` (≤ 80), `release`, `priority`, optional `persona`, `kind` (subtask, alternative, exception, detail), `risky`, `note`. |
| `releases[]` | `id`, `label` (≤ 40), `order`, `goal` (≤ 120), `success_metric` (≤ 100). Max 5. |
| `personas[]` | `id`, `name`, `sketch`, `role`. A persona line appears on activity cards only when activities have different personas. |
| `meta.column_width` | 120–220. Default: auto-widened toward a ~2:1 first screen. |
| `meta.mode` | `now` or `future` map (informational). |
| `meta.summary` | `false` removes the "Histórias por entrega" and frame cards. |

Ids are unique across activities, steps, stories and releases. Guided views
may focus activities, steps and stories.

## Layout model

Row 1 activities, row 2 user steps joined by straight narrative arrows
(step → step relationships, so trace and route features follow the story).
Below, one horizontal band per release in `order`, with the outcome card
(ENTREGA n, goal, metric) at the left; stories stack in their step column by
priority. Max 6 stories per step inside one release.

## Rules

HARD (refused): R-USM-01 every step in a known activity, every story under a
known step, no activity without steps · R-USM-02 explicit, unique `order` for
activities and for steps within an activity · R-USM-03 known release ids,
explicit unique release `order`.

SOFT (advisory; blocks showcase unless waived): R-USM-04 frame what/who/why ·
05 release without goal or success metric · 06 first release misses an
activity (not a walking skeleton) · 07 backbone label without a verb ·
08 activity with > 3× the median steps · 09 no persona / unknown persona ·
10 story priorities in a step not unique and dense, or an earlier release
ranked below a later one · 11 priority on backbone items · 12 unsliced story.

## Repairs

- *Label does not fit three lines* → shorten it, or set `meta.column_width`.
- *Release goal/metric does not fit its card* → shorten to about 70 chars.
- *More than 6 stories in a cell* → move lower-priority stories to a later
  release, or split the step.
- *R-USM-06* → add the thinnest story under the missing activity (manual is
  fine in a walking skeleton), or waive with the reason.
- *R-USM-07 false positive* → waive; do not rename to a vaguer verb.

## Minimal spec

```json
{
  "schema_version": 1,
  "diagram_type": "storymap",
  "meta": { "title": "Mapa — Agendamento", "locale": "pt-BR", "quality_profile": "standard",
    "frame": { "what": "Agendamento online", "who": "Paciente", "why": "Reduzir faltas" } },
  "personas": [{ "id": "p1", "name": "Paciente" }],
  "activities": [{ "id": "agendar", "label": "Agendar consulta", "order": 1 }],
  "steps": [
    { "id": "escolher", "activity": "agendar", "label": "Escolher horário", "order": 1 },
    { "id": "confirmar", "activity": "agendar", "label": "Confirmar reserva", "order": 2 }
  ],
  "releases": [{ "id": "r1", "label": "MVP", "order": 1, "goal": "Primeira consulta agendada online", "success_metric": "% de agendamentos online" }],
  "stories": [
    { "id": "lista", "step": "escolher", "release": "r1", "priority": 1, "label": "Lista de horários livres" },
    { "id": "sms", "step": "confirmar", "release": "r1", "priority": 1, "label": "Confirmação por SMS" }
  ]
}
```
