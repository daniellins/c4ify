# Theory: BPMN 2.0 (Business Process Model and Notation)

> Knowledge base for authoring BPMN diagrams (AS-IS / TO-BE) in technology projects.
> Source tags such as [S1] point to §8. `HARD` = spec violation (the diagram is invalid BPMN). `SOFT` = style/method rule (the diagram is valid but hard to read).
> The normative text was checked against the OMG BPMN 2.0.2 PDF (formal/13-12-09, 532 pp.). Claims not verified in a primary source are marked [ASSUMPTION].

## 1. Purpose and when to use

BPMN shows **the order of work** (sequence flow), **who does it** (pools/lanes), **what triggers or interrupts it** (events) and **what is exchanged with outside parties** (message flow). It is the standard notation for process diagrams that stakeholders can read and that are still precise enough to be turned into software [S1].

| Use BPMN when | Use something else when |
|---|---|
| You need to show responsibility handoffs, decisions, parallel work, exceptions or timeouts | **Flowchart**: throwaway sketch, no roles, audience has no BPMN literacy |
| You are comparing AS-IS and TO-BE for automation or redesign | **VSM**: the question is lead time, waiting and waste across a value stream (metrics per step, not logic) |
| You are specifying a workflow to automate, such as a BPM engine, RPA or an integration | **SIPOC**: scope and boundary agreement *before* modelling (suppliers, inputs, process, outputs, customers), with no flow logic |
| You need to show interaction with external parties (customer, supplier, government) | **Value chain / process map**: an enterprise-level landscape of processes (the process architecture) |

**Modelling levels** (choose one per diagram and do not mix them):
- **Camunda BPMN Framework** [S4][S5]: L1 *strategic process model*, for process owners (a few activities, happy path, fast comprehension). L2 *operational process model*, split into a human flow and a technical flow. L3 *executable/technical*: the model is effectively source code for an engine. The "Camunda house" treats the technical flow as a component of the operational model, not as a separate level.
- **Silver** [S2]: Level 1 = the Descriptive palette (flowchart-like), Level 2 = the Analytic palette (events and exception handling), Level 3 = executable.
- **ABPMP CBOK process architecture** [S6][S11]: macroprocess → process → subprocess → activity → task. BPMN diagrams normally live at the *process* and *subprocess* levels. Macroprocesses belong in a value-chain or landscape map.
- **Default for bizify**: business-facing, descriptive (Silver L1, or L1+ with a few Analytic events). Executable detail is out of scope.

## 2. Element catalogue

Conformance column: **D** = Descriptive subclass (Table 2.1 of the spec), **A** = added by the Analytic subclass (Table 2.2), **F** = full Process Modeling class only [S1 §2.2].

| Element | Subtype / variant | Visual convention (normative where cited) | Meaning | PT-BR term | Conf. | Src |
|---|---|---|---|---|---|---|
| Pool (participant) | white box | Large rectangle with the name in a band on the left (horizontal layout) | A participant with its own process. A process is fully contained in its pool | Piscina (participante) | D | S1 §9.2 |
| Pool | black box | Empty pool: name only, no flow nodes | External party whose internals are hidden. Message flows attach to its border | Piscina caixa-preta | D | S1 §9.2 |
| Lane | nested lanes | Sub-partition that runs the whole length of the pool, name in a band | Role, department or performer inside one process | Raia | D | S1 §10.8 |
| Start event | none / message / timer | Circle, **single thin** line. Message = envelope, timer = clock | Where the process starts. It has no incoming sequence flow | Evento de início | D | S1 §10.5.2 |
| Start event | signal, conditional | Same circle with a triangle / lined-page marker | Start on a broadcast signal or on a condition | Evento de início de sinal/condicional | A | S1 |
| Intermediate event | catching / throwing | Circle, **double thin** line. Catching = unfilled marker, throwing = filled marker | Something happens mid-flow (wait for or send a message, wait for time, link) | Evento intermediário | A | S1 §10.5.4 |
| Boundary event | interrupting | Double-ring circle on the activity border, solid rings | An exception cancels the activity and flow leaves through the event | Evento de borda (anexado) interruptivo | A | S1 |
| Boundary event | non-interrupting | Same, with **dashed** rings | The activity continues and a parallel path starts | Evento de borda não interruptivo | A | S1 |
| End event | none / message / terminate | Circle, **single thick** line. Terminate = filled black circle | End state of a path. Terminate kills all tokens at that level | Evento de fim; fim terminativo | D | S1 §10.5.3 |
| End event | error / escalation / signal | Thick circle with a filled lightning / arrow / triangle | End that throws a result to a parent or listener | Evento de fim de erro/escalonamento/sinal | A | S1 |
| Event triggers (all) | none, message, timer, error, escalation, conditional, signal, link, compensation, cancel, multiple, parallel multiple, terminate (end only) | Marker inside the circle | Kind of trigger or result | Nenhum, mensagem, temporizador, erro, escalonamento, condicional, sinal, link, compensação, cancelamento, múltiplo, terminação | D/A/F | S1 §10.5 |
| Task | none (abstract) | Rounded rectangle, **single thin** line | Atomic unit of work | Tarefa | D | S1 §10.3.3 |
| Task | user | Human-figure marker at top-left | A person does it with IT support | Tarefa de usuário | D | S1 |
| Task | service | Gear marker | Automated, done by a system | Tarefa de serviço | D | S1 |
| Task | send / receive | Filled envelope / unfilled envelope | Send or receive a message | Tarefa de envio / de recebimento | A | S1 |
| Task | manual, script, business rule | Hand / script page / table marker | Work without IT, a script, or a decision table | Tarefa manual / de script / de regra de negócio | F | S1 |
| Sub-process | collapsed | Rounded rectangle with a **"+" marker** at bottom-centre | Composite activity with its detail on a child diagram | Subprocesso (recolhido) | D | S1 §10.3.5 |
| Sub-process | expanded | Large rounded rectangle containing a flow. Sequence flow cannot cross its border | Composite activity drawn inline | Subprocesso (expandido) | D | S1 |
| Sub-process | event / transaction | **Dotted** border / **double thin** border | Event-triggered handler inside the parent / transactional unit | Subprocesso de evento / de transação | F | S1 |
| Call activity | global task or process | **Thick** border (plus "+" if it calls a process) | Reuses a process defined elsewhere | Atividade de chamada | D | S1 §10.3.6 |
| Activity markers | loop / MI parallel / MI sequential / compensation / ad-hoc | Circular arrow / three vertical bars / three horizontal bars / rewind triangles / tilde, bottom-centre | Repetition, parallel or sequential instances, undo, unordered | Laço; multi-instância paralela/sequencial; compensação; ad hoc | A (loop, MI) | S1 |
| Gateway | exclusive (XOR) | Diamond, single thin line, "X" marker (the marker is optional in the spec) | Split: exactly one path. Merge: pass each token through | Gateway exclusivo (desvio exclusivo) | D | S1 §10.6.2 |
| Gateway | parallel (AND) | Diamond with "+" | Split: all paths. Join: wait for all | Gateway paralelo | D | S1 §10.6.4 |
| Gateway | inclusive (OR) | Diamond with "O" | Split: one or more paths. Join: wait for the active ones | Gateway inclusivo | A | S1 §10.6.3 |
| Gateway | event-based | Diamond with a pentagon inside a double circle | The first event to arrive wins. Only catching events or receive tasks follow it | Gateway baseado em eventos | A | S1 §10.6.6 |
| Gateway | complex | Diamond with "*" | Custom rule, such as 3 of 5 | Gateway complexo | F | S1 §10.6.5 |
| Sequence flow | normal (uncontrolled) | **Solid** line with a filled arrowhead | Order of execution *inside one pool*. It can cross lanes | Fluxo de sequência | D | S1 §8 (Sequence Flow) |
| Sequence flow | conditional | Mini-diamond at the source *only when leaving an activity*. None when leaving a gateway | Taken if its condition is true | Fluxo condicional | A | S1 |
| Sequence flow | default | **Slash** marker at the source (from XOR/OR only) | Taken when no other condition holds | Fluxo padrão | A | S1 |
| Message flow | — | **Dashed** line, open circle at the start, open arrowhead at the end | Communication *between two different pools* | Fluxo de mensagem | D | S1 §9.4 |
| Association | — | **Dotted** line (optional arrowhead) | Links an artifact or data element to a flow element | Associação | D | S1 §8 |
| Data object | single / collection, input / output | Page with a folded corner. Collection = three bars | Information used or produced | Objeto de dados | D | S1 §10.4 |
| Data store | — | Cylinder | Persistent storage (DB, ERP) that outlives the instance | Repositório (depósito) de dados | D | S1 |
| Text annotation | — | Open bracket plus text, connected by an association | Free comment | Anotação de texto | D | S1 |
| Group | — | Rounded rectangle with a **dashed** line. It may cross pool and lane borders | Visual grouping only, with no flow semantics | Grupo | D | S1 §8 |

## 3. Modelling methodology (AS-IS → analysis → TO-BE)

1. **Scope** [S6][S2]: name the process ("Object + nominalised verb", for example *Ticket handling*), its trigger, its end states, the owner and the boundary. A SIPOC is a good precursor.
2. **Top level first** [S2]: draw the happy path from start to end in about 5 to 10 activities, then add the main XOR end-state branches. Push detail into collapsed sub-processes (hierarchical modelling, one child diagram per sub-process).
3. **Participants**: the internal organisation becomes one white-box pool with lanes for roles. Each external party (customer, supplier, regulator) becomes a black-box pool. Draw the message flows between them.
4. **AS-IS capture**: model what *actually* happens, including workarounds, rework loops and manual handoffs ("model reality first to avoid automating the mess") [S11]. Validate it with the performers.
5. **Analysis**: annotate the pain points (text annotations or groups): waiting, handoffs between lanes, rework loops, manual re-keying (a manual task next to a data store), missing SLAs (no timer boundary), unclear decisions (unlabelled gateways). Quantify them with a VSM or metrics where needed.
6. **TO-BE design**: remove or merge handoffs, automate (user task → service task), parallelise independent work (AND split/join), add explicit exception handling (timer or error boundary events) and SLAs. Keep one TO-BE per decided scenario.
7. **Deliver as a pair**: AS-IS and TO-BE at the *same level*, with the same pools, lanes and naming, so the differences show. Tag every changed element (for example `delta: added|removed|changed`) [ASSUMPTION: a bizify convention, not part of BPMN].

## 4. Style rules (Method and Style, Camunda) and layout

**Labels** [S2][S3][S4]
- Activity: **verb + object**, action form ("Validate invoice"). Avoid generic verbs ("Handle", "Process"). No two activities at one level share a name unless they are identical.
- Sub-process or call activity: "Object + nominalised verb" ("Invoice processing") is the Camunda form [S4]. Silver also accepts verb-object. The child diagram's title must match the sub-process name (Silver Style 0051).
- Start event: the trigger. A message start is labelled "Receive <message>" (Silver Style 01101). A timer start is labelled with its frequency ("Every Monday").
- End event: the **end state**, noun + adjective or participle ("Invoice paid", "Order rejected") (Silver Style 0129). With a single end event, Silver says leave it unlabelled; Camunda labels it anyway. Two end events at one level never share a name.
- XOR gateway: a **question** ("Credit approved?") with the answers on the gates [S4], *or* the gates labelled as the end states of the preceding activity (Silver). Pick one convention per diagram.
- OR gateway: label the non-default gates. **Never label AND gateways, event-based gateways or merge gateways** (Silver). Camunda also advises against naming them.
- Boundary and intermediate events: always labelled ("4 h elapsed", "Payment received").
- Message flow: the **message name**, a noun ("Purchase order"), not an action (Silver Style 0304).
- Lane: a role or organisational unit ("Finance analyst"). Pool: an organisation or process name. Use sentence case and no unexplained abbreviations [S4].

**Structure** [S2][S3][S4]
- Show start and end events explicitly (spec: they are optional, but an implicit start or end is a style violation and not executable in Camunda).
- One process per pool. Internal roles go in lanes. External entities go in black-box pools that exchange only message flows.
- Use separate gateways for split and join. Never use one gateway that both merges and splits. Show the "X" marker on exclusive gateways.
- Prefer a gateway to a conditional flow leaving an activity (explicit beats implicit) [S3].
- Keep at most about 10 activities per diagram level (Silver, for one printed page). Above roughly 15 to 20, split into sub-processes. Model retries in tooling, not in the diagram, at the operational level [S3].
- Show only the data objects and stores that matter to the business reader [S3].

**Layout** [S3][S2]
- Flow runs **left to right**. Lanes and pools are **horizontal**. The main internal pool sits in the middle, the external black-box pools above and/or below it.
- The **happy path runs in a straight horizontal line** through the centre. Exceptions and alternate branches branch **below** and rejoin to the right.
- Draw split and join gateways **symmetrically** (matching blocks, branches the same distance from the axis).
- No sequence flow runs right to left except for explicit loop-backs. Minimise crossings. For very long flows, use a link event pair instead of a multi-page line.
- Keep the default symbol sizes (task about 100×80, event diameter 36, gateway 50) [ASSUMPTION: the bpmn.io/Camunda default sizes, not in the spec]. Use colour sparingly and only as a highlight (such as a TO-BE delta), never to carry meaning.

## 5. Validation rules

| ID | Rule | Level | Source |
|---|---|---|---|
| R-BPMN-01 | A sequence flow never crosses a pool boundary. It may cross lanes | HARD | S1 §9.2, glossary; Silver BPMN 0202 |
| R-BPMN-02 | A sequence flow never crosses an (expanded) sub-process boundary | HARD | S1 Table 7.2; Silver BPMN 0202 |
| R-BPMN-03 | A message flow connects two **different** pools (their borders or flow nodes inside them), never two objects in the same pool | HARD | S1 §9.4, §7.6.2 |
| R-BPMN-04 | A message flow source or target must be a pool, an activity or a message event (a send/receive/user/service task, sub-process, message event or pool). Gateways never carry message flows | HARD | S1 Table 7.4; Silver BPMN 0302 |
| R-BPMN-05 | A start event has no incoming sequence flow | HARD | S1 §10.5.2; Silver BPMN 0105 |
| R-BPMN-06 | A start event has no outgoing message flow | HARD | S1 §10.5.2 |
| R-BPMN-07 | An end event has no outgoing sequence flow | HARD | S1 §10.5.3 |
| R-BPMN-08 | If a level has a start event it has at least one end event, and vice versa | HARD | S1 §10.5.2–3 |
| R-BPMN-09 | Every process level (top level and each expanded sub-process) has at least one explicit start event and at least one explicit end event | SOFT (the spec allows implicit ones) | S2, S3 |
| R-BPMN-10 | A top-level process has exactly one start event unless alternative triggers are intended. Each start event is typed (none/message/timer) | SOFT | S2 [ASSUMPTION: rule number not verified] |
| R-BPMN-11 | A boundary event has no incoming sequence flow and at least one outgoing sequence flow (a compensation boundary uses an association instead). It is attached to exactly one activity. Prefer exactly one outgoing flow | HARD (no incoming, at least one outgoing, attachment) / SOFT (exactly one) | S1 §10.5.4 |
| R-BPMN-12 | A splitting gateway has more than one gate (outgoing flow) | HARD | Silver BPMN 0134 |
| R-BPMN-13 | Outgoing flows from a **parallel** or **event-based** gateway carry no condition. Conditional flows cannot leave these gateways | HARD | S1 §8 (Sequence Flow) |
| R-BPMN-14 | A default flow (slash) leaves only an XOR or OR gateway (or an activity), with at most one per source | HARD | S1 §8 (Sequence Flow) |
| R-BPMN-15 | A conditional flow leaving an **activity** has a mini-diamond and the activity has at least one other outgoing flow. Leaving a gateway, it has no mini-diamond | HARD | S1 §8 (Sequence Flow) |
| R-BPMN-16 | Every XOR/OR split gate except the default is labelled (a condition or answer) | SOFT | S2 Style; S4 |
| R-BPMN-17 | AND gateways, event-based gateways and merge gateways are unlabelled | SOFT | S2 |
| R-BPMN-18 | An event-based gateway has at least two outgoing flows, none with a condition, and each leads to a catching intermediate event or a receive task | HARD | S1 §10.6.6 |
| R-BPMN-19 | A parallel split is joined by a parallel gateway, and XOR by XOR. An XOR split joined by AND is a **deadlock**. An AND split joined by XOR causes **multiple triggering** | SOFT (spec-legal, semantically wrong) | S2, S3 |
| R-BPMN-20 | A gateway is either a split (1 in, n out) or a join (n in, 1 out), never mixed | SOFT | S3 |
| R-BPMN-21 | Every flow node is reachable from a start event, and every node has a path to an end event (no orphans, no dead ends) | SOFT (HARD for execution) | S2 ("continuous chain") |
| R-BPMN-22 | Every activity (non-merge) has at least one incoming and one outgoing sequence flow, except where it is a black-box interface | SOFT | S2 |
| R-BPMN-23 | Artifacts (annotation, group) never source or target a sequence or message flow | HARD | S1 §8 |
| R-BPMN-24 | Data objects connect only through an association or data association, never through a sequence flow | HARD | S1 §10.4 |
| R-BPMN-25 | A black-box pool contains no flow nodes and no sequence flows | HARD | S1 §9.2 |
| R-BPMN-26 | Activity labels are verb + object. End events at a level have unique end-state names | SOFT | S2 Style 0129; S4 |
| R-BPMN-27 | Message flows are labelled with a noun (the message name) | SOFT | S2 Style 0304 |
| R-BPMN-28 | Each diagram level has 10 or fewer activities (warn above 10, error above 20) | SOFT | S2 (10); the 20 threshold is [ASSUMPTION] |
| R-BPMN-29 | An activity with several incoming flows and no merge gateway is an implicit XOR merge. Flag it and prefer an explicit gateway | SOFT | S1 Table 7.2 (uncontrolled flow); S3 |
| R-BPMN-30 | Every lane holds at least one flow node, and every flow node belongs to exactly one lane when the pool has lanes | SOFT / HARD (a node in two lanes) | S1 §10.8 [ASSUMPTION on the SOFT part] |
| R-BPMN-31 | A diagram declares its conformance palette. The Descriptive profile rejects elements outside the D set (§2) | SOFT (tooling) | S1 §2.2 |

## 6. Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| **Sequence flow to an external party** (a customer drawn as a lane) | Breaks R-01. The customer does not follow your process | Give the customer a black-box pool and use message flows |
| **Lanes as systems** ("ERP", "CRM" as lanes next to people) | Mixes performers with tools, and handoffs look like human handoffs. Camunda accepts system lanes [S4]. Silver prefers roles | Lanes are roles. A system goes into a *service task* in the role's lane, or a data store. Use system lanes only in technical-flow (L2 technical) diagrams |
| **Data flow drawn as sequence flow** (task → document → task) | Sequence flow means *execution order*, not information transfer | Sequence flow task→task, plus a data object attached by association |
| **Message flow inside one pool** between departments | Breaks R-03 | Use lanes in one pool with sequence flow, or model the department as its own pool on purpose |
| **Ambiguous gateways** (one diamond that merges and splits, or an unlabelled XOR) | The reader cannot tell the semantics | Use separate join and split gateways, a question plus answers, and a default flow |
| **Mismatched split/join** (AND split → XOR join, XOR split → AND join) | Duplicate execution or deadlock | Match the gateway types symmetrically (R-19) |
| **Gateway used as a task** ("Check stock?" with no preceding activity doing the checking) | Gateways do not perform work, they only route | Put the activity "Check stock" before the XOR "In stock?" |
| **Flat mega-diagram** (more than 15 to 20 activities on one level) | Unreadable, unreviewable | Add hierarchy: collapsed sub-processes and child diagrams (R-28) |
| **Implicit start or end** (a node with no incoming or outgoing flow) | Unclear triggers and outcomes | Add explicit, labelled start and end events |
| **Several end events with the same name**, or one "End" for different outcomes | The outcome is invisible | Give each distinct end state its own end event. Merge the ones that are really the same |
| **Technical noise at the business level** (retries, error codes, polling loops) | Hides the business logic | Push it into technical-flow or executable models [S3] |
| **Colour or position carrying meaning** | Not BPMN. Lost in exports | Use proper markers. Keep colour only as a highlight |
| **Dangling message flows** (no counterpart activity or event) | You cannot see where the reply is sent or received | Anchor them on send/receive tasks, message events or the pool border |

## 7. Worked mini-example: IT support ticket (TO-BE, Descriptive + timer boundary)

**Pools**
- `P1` "Cliente" (black box, top).
- `P2` "Suporte de TI" (white box). Lanes: `L1` "Atendente N1", `L2` "Especialista N2", `L3` "Coordenador de suporte".

**Flow nodes** (col = left-to-right order, lane in brackets)
| id | kind / subtype | label | lane | col |
|---|---|---|---|---|
| S1 | startEvent / message | Receber solicitação de suporte | L1 | 1 |
| T1 | task / user | Registrar chamado | L1 | 2 |
| T2 | task / user | Diagnosticar incidente | L1 | 3 |
| B1 | boundaryEvent / timer, interrupting, attachedTo T2 | 4 h sem solução | L1 | 3 |
| G1 | exclusiveGateway (split) | Resolvido no N1? | L1 | 4 |
| T7 | task / user | Priorizar escalonamento | L3 | 4 |
| G5 | exclusiveGateway (merge) | — | L2 | 5 |
| T3 | task / user | Resolver incidente | L2 | 6 |
| G2 | exclusiveGateway (merge) | — | L1 | 7 |
| G3 | parallelGateway (split) | — | L1 | 8 |
| T4 | task / send | Notificar solução ao cliente | L1 | 9 |
| T5 | task / user | Atualizar base de conhecimento | L2 | 9 |
| G4 | parallelGateway (join) | — | L1 | 10 |
| T6 | task / user | Encerrar chamado | L1 | 11 |
| E1 | endEvent / none | Chamado encerrado | L1 | 12 |

**Sequence flows**: S1→T1, T1→T2, T2→G1, G1→G2 [Sim], G1→G5 [Não], B1→T7, T7→G5, G5→T3, T3→G2, G2→G3, G3→T4, G3→T5, T4→G4, T5→G4, G4→T6, T6→E1.
**Message flows**: P1 (border)→S1 "Solicitação de suporte". T4→P1 (border) "Aviso de solução".
**Checks**: the happy path S1→T1→T2→G1[Sim]→G2→G3→T4→G4→T6→E1 is a straight line in L1. The escalation (G1[Não], B1) drops to L2/L3 below it. Splits and joins are symmetric (XOR G1 ↔ G2, AND G3 ↔ G4). The explicit merge G5 avoids an implicit merge on T3 (R-29). No sequence flow touches P1 (R-01). The timer boundary and the send task are *Analytic* elements, so declare the palette as "descriptive+" (R-31).
**AS-IS contrast (typical)**: no timer (tickets age silently), a serial "notify then update KB" sequence instead of AND, and the customer drawn as a lane (anti-pattern).

## 8. Sources

| id | Citation | URL | Grade |
|---|---|---|---|
| S1 | OMG, *Business Process Model and Notation (BPMN) v2.0.2*, formal/13-12-09, Jan 2014 (§2.2 conformance, Table 2.1/2.2, §7–§10). Adopted as ISO/IEC 19510:2013 | https://www.omg.org/spec/BPMN/2.0.2/PDF | Gold |
| S1b | ISO/IEC 19510:2013, *Information technology — OMG BPMN* (equivalence stated by ISO/OMG, not re-read here) | https://www.iso.org/standard/62652.html | Gold [ASSUMPTION: content not fetched] |
| S2 | B. Silver, *BPMN Method and Style*, 2nd ed., Cody-Cassidy, 2011; blog "The Rules of BPMN", "Standardizing BPMN Labels", "BPMN Style Rules" (Trisotech) | https://www.methodandstyle.com/blog/the-rules-of-bpmn/ ; https://www.trisotech.com/bpmn-style-rules/ | Silver |
| S3 | Camunda Docs, Best Practices: "Creating readable process models" | https://docs.camunda.io/docs/components/best-practices/modeling/creating-readable-process-models/ | Silver |
| S4 | Camunda Docs, Best Practices: "Naming BPMN elements" | https://docs.camunda.io/docs/components/best-practices/modeling/naming-bpmn-elements/ | Silver |
| S5 | J. Freund, B. Rücker, *Real-Life BPMN*, 4th ed., 2019 (Camunda BPMN Framework; strategic/operational/technical) | https://page.camunda.com/wp-real-life-bpmn-book-excerpt | Silver |
| S6 | ABPMP, *BPM CBOK v3.0* (Portuguese edition) — AS-IS/TO-BE, process architecture | https://cdn.ymaws.com/www.abpmp.org/resource/resmgr/Docs/ABPMP_CBOK_Guide__Portuguese.pdf | Silver |
| S7 | Visual Paradigm, "Mastering BPMN Level 1 (Descriptive) and Level 2 (Analytic)". Used only for orientation, superseded by S1 Table 2.1 | https://www.visual-paradigm.com/guide/mastering-bpmn-a-comprehensive-guide-to-level-1-descriptive-and-level-2-analytic-process-modeling/ | Bronze |
| S8 | iProcess blog (PT-BR BPMN guide series, e.g., intermediate events) | https://blog.iprocess.com.br/2012/12/um-guia-para-iniciar-estudos-em-bpmn-iv-eventos-intermediarios/ | Bronze |
| S9 | Brazilian public-sector modelling guides (gov.br Guia Prático de Gestão de Processos 2024; UFMG/DTI Guia de boas práticas; MPM Guia de Modelagem) for PT-BR terms | https://www.gov.br/gestao/pt-br/acesso-a-informacao/estrategia-e-governanca/gestaodeprocessos/arquivos_pdf/GuiaPrticodeGestodeProcessosv1maiode2024.pdf | Bronze |
| S10 | Wikipedia, "Business Process Model and Notation" (history, three conformance subclasses) | https://en.wikipedia.org/wiki/Business_Process_Model_and_Notation | Bronze |
| S11 | ABPMP Brasil, *CBOK 4.0 Essencial — Guia de Estudo* ("model reality first") | https://cbok.abpmp-br.org/ | Silver |

Notes: the PT-BR terms are common usage across S6, S8 and S9. Bizagi's exact PT-BR localisation strings were not verified [ASSUMPTION]. Some Brazilian guides use "desvio" for gateway, so accept both in labels and prefer "gateway".

## 9. IR suggestion for the bizify JSON spec (`kind: "bpmn"`)

```jsonc
{
  "kind": "bpmn", "title": "…", "variant": "as-is|to-be", "level": "strategic|operational",
  "palette": "descriptive|descriptive+|analytic",          // drives R-31
  "pools": [{ "id": "P2", "name": "…", "blackBox": false, "order": 1,
              "lanes": [{ "id": "L1", "name": "…", "order": 1, "children": [] }] }],
  "nodes": [{
    "id": "T2", "pool": "P2", "lane": "L1", "col": 3, "row": 0,   // grid placement; row>0 = below happy path
    "kind": "task|subProcess|callActivity|startEvent|intermediateEvent|endEvent|boundaryEvent|gateway|dataObject|dataStore|annotation|group",
    "subtype": "none|user|service|send|receive|manual|script|businessRule |exclusive|parallel|inclusive|eventBased|complex",
    "trigger": "none|message|timer|error|escalation|conditional|signal|link|compensation|terminate",
    "throwing": false, "interrupting": true, "attachedTo": "T2",   // events only
    "markers": ["loop|miParallel|miSequential|compensation|adhoc"], "collapsed": true, "calledElement": "…",
    "gatewayRole": "split|join", "label": "…", "delta": "added|removed|changed|null", "note": "…"
  }],
  "flows": [{ "id": "f1", "type": "sequence|message|association|dataAssociation",
              "from": "G1", "to": "G5", "label": "Não", "condition": "…", "isDefault": false,
              "direction": "none|one|both" }],
  "happyPath": ["S1","T1","T2","G1","G2","G3","T4","G4","T6","E1"]   // optional, the layout axis
}
```

**Renderer rules derived from §2 and §5**: sequence = solid line with a filled arrow. Message = dashed line with an open circle and open arrow. Association = dotted line. Default = slash, conditional-from-activity = mini-diamond. Start = thin circle, intermediate = double circle, end = thick circle, non-interrupting = dashed double circle. Call activity = thick border, event sub-process = dotted border. Put markers in fixed slots: the task type at top-left, loop/MI/"+" at bottom-centre. Route message flows vertically between pools, and sequence flows orthogonally with at most 2 bends.

**Minimal subset for a Descriptive renderer (v1)**: every element of S1 Table 2.1 (pool, black-box pool, lane, task none/user/service, collapsed and expanded sub-process, call activity, XOR and AND gateways, start none/message/timer, end none/message/terminate, sequence and message flow, association, data object, data store, text annotation, group), **plus** these Analytic items that business AS-IS/TO-BE needs: default flow, send/receive task, interrupting and non-interrupting timer/message/error boundary events, catching message/timer intermediate events, and the inclusive gateway. Defer to v2: event-based and complex gateways, signal/escalation/compensation/conditional/link events, event and transaction sub-processes, MI/loop markers, conversations and choreographies (the latter are out of scope of process modelling conformance, S1 §2.2).
