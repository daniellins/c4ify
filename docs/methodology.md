# Methodology: how rules get into c4ify

c4ify's value is that a passing model follows the C4 notation. That only holds if the rules
themselves are trustworthy, so they follow an evidence contract.

## Sources and grades

`c4ify/references/theory-c4.md` ends with a sources table:

| Grade | Meaning | Examples |
|---|---|---|
| **Gold** | the original author | Simon Brown's c4model.com pages; Structurizr documentation for the model-and-views behaviour |
| **Silver** | recognized practitioner | talks, books and articles by experienced C4 practitioners |
| **Bronze** | tertiary: tutorials, forums, summaries | used only as a pointer; claims marked `[ASSUMPTION]` |

The primary pages, all published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
by Simon Brown and paraphrased (never copied) by c4ify:

| Page | Used for |
|---|---|
| [c4model.com/diagrams/notation](https://c4model.com/diagrams/notation) | titles, keys, element and relationship descriptions, technologies, acronyms, one notation per diagram |
| [c4model.com/diagrams/checklist](https://c4model.com/diagrams/checklist) | the review questions behind the SOFT rules |
| [c4model.com/diagrams/system-context](https://c4model.com/diagrams/system-context) | scope and contents of context views, users and neighbours |
| [c4model.com/diagrams/container](https://c4model.com/diagrams/container) | containers inside a system boundary, technology choices, inter-container protocols |
| [c4model.com/diagrams/component](https://c4model.com/diagrams/component) | components inside a container, when a component view is worth drawing |

The C4 model deliberately prescribes no shapes or colours. Where c4ify chooses (one hue per
abstraction level, slate for external elements, cylinders for stores, dashed lines for async), the
choice is documented as a convention, and the generated key explains it, which is what the
notation guidance asks for.

## Rule levels

- **HARD** (R-C4-01..05): the model breaks the notation: a container outside a software system, a
  component outside a container, a view whose scope does not match its type, a relationship
  without a description, an arrow between an element and its own parent or child, a zoom into
  something without children. The model is refused.
- **SOFT** (R-C4-06..13): review-checklist practice: descriptions, technologies, inter-container
  protocols, explained acronyms, readable view size (about 20 elements), specific relationship
  verbs, every element drawn somewhere, context views with users or neighbours. Warnings in
  `standard`; they block `showcase` until fixed or waived.

Some checklist items are guaranteed **by construction** instead of checked: every view has a
generated title stating its type and scope, and a key for the shapes, colours, line styles and
drill-down marker in use.

## Waivers

A SOFT finding can be waived in `meta.waivers` with a mandatory reason, optionally scoped to one
element. Two reasons are legitimate: the user's justification (a legacy system whose technology is
unknown), or a **pending fact** (`"Pending: <fact> not provided"`) when the rule asks for data the
user did not give. Waived findings stay visible in the receipt and must be reported in the handoff.
Agents must never invent technologies, protocols or descriptions to satisfy a rule.

## Changing a rule

Open a **C4 notation correction** issue with the source (page and passage), propose the level, and
include a model that shows the current vs. expected behaviour. A HARD rule needs a Gold source.
