# Methodology: how rules get into Bizify

Bizify's value is that a passing diagram follows its method. That only holds if the rules
themselves are trustworthy, so they follow an evidence contract.

## Sources and grades

Every `bizify/references/theory-<type>.md` ends with a sources table:

| Grade | Meaning | Examples |
|---|---|---|
| **Gold** | the standard or the original author | OMG BPMN 2.0.2 spec, NASA WBS Handbook, GAO-20-195G, MIL-STD-881F, *Learning to See*, Adzic, Patton |
| **Silver** | recognized practitioner or institute | Bruce Silver *BPMN Method & Style*, Camunda best practices, Lean Enterprise Institute |
| **Bronze** | tertiary: tutorials, forums, summaries | used only as a pointer; claims marked `[ASSUMPTION]` |

Where sources disagree, the theory file says so and the rule is designed around the conflict — for
example phase-oriented WBS (PMI allows it; NASA and MIL-STD-881F reject it) is allowed only when
declared and always produces an advisory; Silver and Camunda disagree on gateway labels, so the
agent is told to pick one convention per diagram.

## Rule levels

- **HARD** — the notation or the arithmetic is wrong: two WBS roots, a parent total that is not the
  sum of its children, a sequence flow crossing pools, a message flow inside one pool, an authored
  VSM total that disagrees with the computed one. The spec is refused.
- **SOFT** — practice and style: verb-named WBS elements, missing project management at level 2,
  unlabelled gateway branches, a story-map slice without an outcome, a SIPOC with more than 7 steps.
- **Opt-in** — folklore or context-dependent heuristics, off by default (e.g. the WBS "8/80 rule",
  which appears only in exam-prep sources and does not fit month-scale R&D packages).

## Waivers

A SOFT finding can be waived in `meta.waivers` with a mandatory reason, optionally scoped to one
node. Two reasons are legitimate: the user's justification (a name imposed by a contract), or a
**pending fact** (`"Pendente: <fact> not provided"`) when the rule asks for data the user did not
give. Waived findings stay visible in the receipt and must be reported in the handoff. Agents must
never invent data to satisfy a rule.

## Numbers

Totals are computed by the renderer and cross-checked; the diagram never shows two truths. When a
user quotes a total from elsewhere (a manager, a proposal), the WBS shows it next to the computed
roll-up with the difference (`meta.reference_total`).

## Changing a rule

Open a **Methodology correction** issue with the source (page or section), propose the level, and
include a spec that shows the current vs. expected behaviour. A HARD rule needs a Gold source.
