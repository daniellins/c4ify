# C4 model: theory and rules

The knowledge base behind c4ify's validation. Open it when you need a rule's
rationale, a definition, or the boundary between two levels; the day-to-day
authoring guide is `authoring-c4.md`. Guidance from c4model.com is paraphrased
(CC BY 4.0, Simon Brown) and tagged with its page; nothing is quoted at length.

## 1. Purpose and when to use

The C4 model describes software architecture as a hierarchy of abstractions
(people, software systems, containers, components, code) and a set of diagrams
that zoom from one level to the next [C4-HOME]. It is
notation-independent: boxes and lines are fine as long as every diagram is
self-describing [C4-NOTATION].

Use it when the reader needs to understand **structure**: what the system is,
who uses it, what it is made of and how the parts talk. Do not use it for a
business process (bizify BPMN), for a request sequence over time (archify
sequence, or a C4 dynamic view, planned) or for a value stream (bizify VSM).

## 2. Abstractions (canonical definitions)

| Abstraction | Definition (paraphrased) | Source |
|---|---|---|
| Person | A human user of the system: an actor, role or persona, not an individual. | [C4-ABSTRACTIONS] |
| Software system | The highest level of abstraction: something that delivers value to its users, owned by one team. External systems are owned by someone else. | [C4-ABSTRACTIONS] |
| Container | An application or a data store: something that must be running for the system to work (web app, API, worker, database, queue, file store). The name implies nothing about how it runs; it is not necessarily a Docker container. Libraries, JARs and modules are code inside containers, not containers. | [C4-CONTAINER-ABS] |
| Component | A grouping of related functionality behind an interface, inside one container; not separately deployable. | [C4-ABSTRACTIONS] |
| Code | Classes, functions; usually generated from the code itself. Out of scope for c4ify. | [C4-ABSTRACTIONS] |

Hierarchy: a software system is made of containers; a container is made of
components. People and software systems are top-level [C4-ABSTRACTIONS].

## 3. Diagram types

| View (c4ify `type`) | Scope | Shows | Audience | Source |
|---|---|---|---|---|
| `systemLandscape` | An enterprise | People and software systems | Everyone | [C4-LANDSCAPE] |
| `systemContext` | One software system | The system, its users and the systems it depends on | Everyone, including non-technical people | [C4-CONTEXT] |
| `container` | One software system | Its containers, plus the people and systems they talk to | Technical people inside and outside the team | [C4-CONTAINER] |
| `component` | One container | Its components, plus the containers and systems they talk to | Architects and developers | [C4-COMPONENT] |
| dynamic, deployment | (planned in c4ify) | Runtime collaboration; mapping to infrastructure | Technical | [C4-DYNAMIC], [C4-DEPLOYMENT] |

Component diagrams are optional: draw them only where they add value, and
consider generating them for long-lived documentation [C4-COMPONENT].

## 4. Notation guidance

From the notation page and the review checklist [C4-NOTATION] [C4-CHECKLIST]:

- Every diagram has a **title** that states the diagram type and scope.
- Every diagram has a **key/legend** for shapes, colours, border and line
  styles, arrowheads.
- The **type** of every element is explicit (Person, Software System,
  Container, Component).
- Every element has a short **description** of its responsibility.
- Every **container and component** names its **technology**.
- Every line is a **unidirectional** relationship with a **label** consistent
  with its direction and intent.
- Relationships **between containers** (inter-process) name the
  **technology/protocol**.
- **Acronyms** are understandable to all readers or explained in the key.
- Colours and shapes carry meaning only through the key; keep them
  consistent and accessible (colour-blindness, grayscale print).

Implied relationships: when a relationship exists between two lower-level
elements, the same relationship is implied between their parents; modelling
tools draw it at each level instead of asking authors to repeat it
[STRUCTURIZR-IMPLIED]. c4ify does this and merges duplicates with a count.

## 5. Rules

HARD rules refuse the model (the diagram would be wrong at every level).
SOFT rules are advisories: they block the `showcase` profile unless fixed or
waived in `meta.waivers` with a reason.

| Rule | Level | Rule | Source |
|---|---|---|---|
| R-C4-01 | HARD | Hierarchy: a container's parent is a software system; a component's parent is a container; people and software systems have no parent; ids are unique. | [C4-ABSTRACTIONS] |
| R-C4-02 | HARD | A view's scope matches its type (context/container: software system; component: container; landscape: none); include/exclude reference existing elements drawn at that level. | [C4-CONTEXT] [C4-CONTAINER] [C4-COMPONENT] |
| R-C4-03 | HARD | Every relationship has a description. | [C4-NOTATION] [C4-CHECKLIST] |
| R-C4-04 | HARD | A relationship connects two existing, distinct elements, neither inside the other (containment is shown by the boundary). | [C4-NOTATION] |
| R-C4-05 | HARD | A container or component view zooms into an element that has containers or components. | [C4-CONTAINER] [C4-COMPONENT] |
| R-C4-06 | SOFT | Every drawn element has a description. | [C4-NOTATION] |
| R-C4-07 | SOFT | Every container and component has a technology. | [C4-NOTATION] |
| R-C4-08 | SOFT | Relationships between different containers (inter-process) have a technology/protocol. In-process calls between components of one container are exempt. | [C4-NOTATION] |
| R-C4-09 | SOFT | Acronyms in names and descriptions are common knowledge or explained in `meta.glossary` (shown as a card). | [C4-NOTATION] [C4-CHECKLIST] |
| R-C4-10 | SOFT | A view stays readable: about 20 elements or fewer; split otherwise. | [C4-FAQ] [ASSUMPTION: threshold] |
| R-C4-11 | SOFT | A relationship label states the intent ("Reads orders from"), not a bare "uses". | [C4-NOTATION] [C4-CHECKLIST] |
| R-C4-12 | SOFT | Every modelled element appears in at least one view. | [ASSUMPTION: model hygiene] |
| R-C4-13 | SOFT | A context view shows the users and neighbouring systems of its scope. | [C4-CONTEXT] |

By construction (not rules): titles default to "<Type> diagram for <scope>";
the legend lists exactly the element kinds, shapes, line styles and markers in
use; element boxes always print `[Type: Technology]`.

## 6. Anti-patterns

- Mixing levels in one diagram (a component next to unrelated systems):
  pick the view whose scope answers the reader's question.
- "Uses" on every arrow; arrows with no protocol between containers.
- Treating every Docker container or Kubernetes pod as a C4 container, or
  every class as a component: containers are runtime constructs, components
  are groupings behind an interface [C4-CONTAINER-ABS].
- Drawing shared libraries as containers (they organise code inside
  containers) [C4-CONTAINER-ABS].
- One giant diagram: split per system (landscape → context) or per container.

## 7. Sources

| Tag | Source | Grade |
|---|---|---|
| [C4-HOME] | Simon Brown, *The C4 model for visualising software architecture*, https://c4model.com | Gold (primary, author) |
| [C4-ABSTRACTIONS] | c4model.com/abstractions (software system, container, component, code) | Gold |
| [C4-CONTAINER-ABS] | c4model.com/abstractions/container (definition and FAQ) | Gold |
| [C4-NOTATION] | c4model.com/diagrams/notation | Gold |
| [C4-CHECKLIST] | c4model.com/diagrams/checklist (review checklist) | Gold |
| [C4-LANDSCAPE] | c4model.com/diagrams/system-landscape | Gold |
| [C4-CONTEXT] | c4model.com/diagrams/system-context | Gold |
| [C4-CONTAINER] | c4model.com/diagrams/container | Gold |
| [C4-COMPONENT] | c4model.com/diagrams/component | Gold |
| [C4-DYNAMIC] / [C4-DEPLOYMENT] | c4model.com/diagrams/dynamic, /deployment | Gold |
| [C4-FAQ] | c4model.com/diagrams/faq and /abstractions/faq | Gold |
| [STRUCTURIZR-IMPLIED] | Structurizr documentation, implied relationships (docs.structurizr.com) | Silver (tooling by the C4 author) |
| [ASSUMPTION] | c4ify design choice, not a C4 rule; documented so it can be challenged | n/a |

c4model.com content is licensed CC BY 4.0; c4ify paraphrases it with
attribution and copies no text or images.
