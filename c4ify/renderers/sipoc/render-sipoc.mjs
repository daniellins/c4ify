import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { polylinePath } from '../shared/geometry.mjs';
import { createAdvisories, fitAspect, renderLines, round, unitsFor, wrapText } from '../shared/business.mjs';
import { cardGeometry, fitLabel, startsWithVerb } from '../shared/planning-kit.mjs';
import { planLanes } from './lanes.mjs';
import { SIPOC_KIND_PALETTE } from './palette.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: sipoc, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'sipoc',
  defaultExample: 'release-management.sipoc.json',
});

const meta = sipoc.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);
const COLUMNS = ['suppliers', 'inputs', 'steps', 'outputs', 'customers'];
const KIND = { suppliers: 'sipoc-supplier', inputs: 'sipoc-input', steps: 'sipoc-step', outputs: 'sipoc-output', customers: 'sipoc-customer' };
const NEXT = { suppliers: 'inputs', inputs: 'steps', steps: 'outputs', outputs: 'customers' };
const BOUNDARY_IDS = { start: 'process-start', end: 'process-end' };
const MAX_STEPS = 10;

// ---------------------------------------------------------------------------
// Structure (HARD rules R-SIPOC-01..04)
// ---------------------------------------------------------------------------
const items = COLUMNS.flatMap((column) => (sipoc[column] || []).map((item, index) => ({ ...item, column, index })));
const byId = new Map();
const structural = [];
for (const item of items) {
  if (byId.has(item.id)) structural.push(`/${item.column}/${item.index}/id duplicates id ${JSON.stringify(item.id)} (already used in ${byId.get(item.id).column}) — ids are unique across the five columns.`);
  if (Object.values(BOUNDARY_IDS).includes(item.id)) structural.push(`/${item.column}/${item.index}/id "${item.id}" is reserved for the process boundary chips.`);
  byId.set(item.id, item);
}
const steps = items.filter((item) => item.column === 'steps');
if (steps.some((step) => step.order !== undefined)) {
  const seen = new Map();
  for (const step of steps) {
    if (!Number.isInteger(step.order)) structural.push(`Step "${step.id}" has no order while other steps do — number every step or none.`);
    else if (seen.has(step.order)) structural.push(`Steps "${seen.get(step.order)}" and "${step.id}" share order ${step.order}.`);
    seen.set(step.order, step.id);
  }
}
if (structural.length) throwDiagnosticProblems('SIPOC structure validation failed', structural, { code: 'method/hard-rule', subject: { diagramType: 'sipoc' } });
steps.sort((a, b) => (a.order ?? a.index) - (b.order ?? b.index));
steps.forEach((step, index) => { step.position = index + 1; });

for (const column of COLUMNS) {
  if (!(sipoc[column] || []).length) advisories.fail('R-SIPOC-01', `The ${column} column is empty — a SIPOC fills all five columns (suppliers, inputs, process, outputs, customers).`);
}
const boundaries = sipoc.boundaries || {};
for (const key of ['start', 'end']) {
  if (!boundaries[key]) advisories.fail('R-SIPOC-02', `boundaries.${key} is missing — a SIPOC names the ${key === 'start' ? 'trigger that starts' : 'event that ends'} the process to bound its scope.`);
}
if (steps.length > MAX_STEPS) advisories.fail('R-SIPOC-03', `${steps.length} process steps exceed the ceiling of ${MAX_STEPS} — a SIPOC is the 35,000-foot view (4–7 steps); detail the flow in BPMN instead.`);

// Relationships: authored references (not drawn) plus links (drawn).
const relations = [];
const addRelation = (from, to, source, link) => relations.push({ from, to, source, link });
for (const item of items) {
  if (item.column === 'inputs') {
    if (item.supplier) addRelation(item.supplier, item.id, `/inputs/${item.index}/supplier`);
    for (const step of item.steps || []) addRelation(item.id, step, `/inputs/${item.index}/steps`);
  }
  if (item.column === 'outputs') {
    for (const step of item.from_steps || []) addRelation(step, item.id, `/outputs/${item.index}/from_steps`);
    for (const customer of item.customers || []) addRelation(item.id, customer, `/outputs/${item.index}/customers`);
  }
}
const links = (sipoc.links || []).map((link, index) => ({ ...link, index }));
for (const link of links) addRelation(link.from, link.to, `/links/${link.index}`, link);
const pairKeys = new Set();
for (const relation of relations) {
  const from = byId.get(relation.from);
  const to = byId.get(relation.to);
  if (!from || !to) {
    advisories.fail('R-SIPOC-04', `${relation.source} references unknown id "${!from ? relation.from : relation.to}".`);
    continue;
  }
  if (NEXT[from.column] !== to.column) {
    advisories.fail('R-SIPOC-04', `${relation.source} links ${from.column} "${from.id}" to ${to.column} "${to.id}" — SIPOC relationships run supplier → input → step → output → customer, one column at a time.`);
    continue;
  }
  if (relation.link) {
    const key = `${relation.from}>${relation.to}`;
    if (pairKeys.has(key)) advisories.fail('R-SIPOC-04', `${relation.source} repeats the link ${relation.from} → ${relation.to}.`);
    pairKeys.add(key);
  }
  relation.fromItem = from;
  relation.toItem = to;
}
const valid = relations.filter((relation) => relation.fromItem);
const incoming = (item) => [...new Set(valid.filter((relation) => relation.to === item.id).map((relation) => relation.fromItem))];
const outgoing = (item) => [...new Set(valid.filter((relation) => relation.from === item.id).map((relation) => relation.toItem))];
for (const item of items) {
  item.sources = incoming(item);
  item.targets = outgoing(item);
  if (item.column === 'inputs' && !item.sources.length) advisories.fail('R-SIPOC-04', `Input "${item.label}" has no supplier — set inputs[].supplier or add a link from a supplier.`);
  if (item.column === 'outputs' && !item.targets.length) advisories.fail('R-SIPOC-04', `Output "${item.label}" has no customer — set outputs[].customers or add a link to a customer.`);
}
advisories.throwIfHard('SIPOC method validation failed', 'sipoc');

// ---------------------------------------------------------------------------
// SOFT rules → advisories (R-SIPOC-03, 05..10)
// ---------------------------------------------------------------------------
if (steps.length < 4 || steps.length > 7) {
  advisories.warn('R-SIPOC-03', `The process has ${steps.length} steps — a SIPOC stays at 4–7 high-level steps.`, steps[0].id);
}
const DECISION = /\?|\b(if|whether|else|se|caso|senão|senao)\b/i;
for (const step of steps) {
  if (!startsWithVerb(step.label, locale)) advisories.warn('R-SIPOC-06', `Step "${step.label}" does not start with a verb — process steps are verb phrases ("Run regression").`, step.id);
  if (DECISION.test(step.label)) advisories.warn('R-SIPOC-09', `Step "${step.label}" reads like a decision — decisions and branches belong in the BPMN that details this SIPOC.`, step.id);
}
const ARTEFACT = /\b(report|plan|code|data|file|document|backlog|credentials?|relatório|relatorio|plano|código|codigo|dados|arquivo|documento|credenciais?|planilha)\b/i;
const ROLE = /\b(team|squad|department|manager|office|vendor|supplier|time|equipe|departamento|gerente|gestor|escritório|escritorio|fornecedor|área|area)\b/i;
for (const item of items) {
  if (item.column === 'inputs' && !item.targets.length) advisories.warn('R-SIPOC-05', `Input "${item.label}" feeds no process step — link it to the step that consumes it, or drop it.`, item.id);
  if (item.column === 'outputs' && !item.requirements?.length) advisories.warn('R-SIPOC-07', `Output "${item.label}" has no requirement — add the CTQ the customer judges it by.`, item.id);
  if (item.column === 'suppliers' && ARTEFACT.test(item.label)) advisories.warn('R-SIPOC-08', `Supplier "${item.label}" looks like an artefact — suppliers are who provides; the artefact is the input.`, item.id);
  if (item.column === 'inputs' && ROLE.test(item.label)) advisories.warn('R-SIPOC-08', `Input "${item.label}" looks like a role or organisation — inputs are what is provided; the provider is the supplier.`, item.id);
}
const GENERIC_CUSTOMER = /^(everyone|everybody|all|the company|company|users?|customers?|todos|todo mundo|a empresa|empresa|usuários?|usuarios?|clientes?)$/i;
for (const customer of items.filter((item) => item.column === 'customers')) {
  if (GENERIC_CUSTOMER.test(customer.label.trim())) advisories.warn('R-SIPOC-10', `Customer "${customer.label}" is generic — name the role that receives the output.`, customer.id);
  if (customer.confirmed !== true) advisories.warn('R-SIPOC-10', `Customer "${customer.label}" is not confirmed — confirm who receives the outputs instead of assuming (set confirmed: true after checking).`, customer.id);
}

// ---------------------------------------------------------------------------
// Layout: five column frames, process steps top to bottom
// ---------------------------------------------------------------------------
const order = meta.variant === 'copis' ? [...COLUMNS].reverse() : COLUMNS;
const WIDTH = { suppliers: 160, inputs: 178, steps: 184, outputs: 196, customers: 168 };
const margin = 40;
const framePad = 12;
const frameGap = 60;
const frameTop = 16;
const itemsTop = 84;
const itemGap = 12;
const flowGap = 22;
const legendBand = 80;
const FONT = 11;

const colX = {};
{
  let cursor = margin + framePad;
  for (const column of order) {
    colX[column] = cursor;
    cursor += WIDTH[column] + framePad * 2 + frameGap;
  }
}
let viewW = Math.max(meta.viewBox?.[0] || 0, colX[order.at(-1)] + WIDTH[order.at(-1)] + framePad + margin);
const floor = Math.max(10, round(minimumReadableSourceTextPx(viewW) + 0.2));
const contextFont = floor;

const requirementText = (requirement) => t('sipoc.ctq', { text: requirement.target ? `${requirement.ctq}: ${requirement.target}` : requirement.ctq });
const BADGE_W = 26;
const isStep = (item) => item.column === 'steps' && !item.boundary;
function tagFor(item) {
  if ((item.column === 'suppliers' || item.column === 'customers') && item.scope) return t(`sipoc.scope.${item.scope}`).toUpperCase();
  return '';
}

const problems = [];
const boundaryNodes = ['start', 'end'].map((key) => ({ id: BOUNDARY_IDS[key], key, label: boundaries[key], column: 'steps', boundary: true }));
for (const item of [...items, ...boundaryNodes]) {
  item.width = WIDTH[item.column];
  item.x = colX[item.column];
  const fitted = fitLabel(item.label, item.width, { font: item.boundary ? 10.5 : FONT, floor, maxLines: 3, reserved: isStep(item) ? BADGE_W : 0 });
  if (!fitted) {
    problems.push(`Label "${item.label}" of ${item.column} "${item.id}" does not fit three lines at ${item.width}px — shorten it.`);
    continue;
  }
  Object.assign(item, fitted);
  item.tag = item.boundary ? t(`sipoc.${item.key}`) : tagFor(item);
  item.extras = [];
  for (const requirement of item.requirements || []) {
    const wrapped = wrapText(requirementText(requirement), unitsFor(item.width, contextFont, 16), 2);
    if (wrapped.overflow) problems.push(`Requirement "${requirement.ctq}" of "${item.id}" does not fit two lines — shorten the CTQ or its target.`);
    item.extras.push(...wrapped.lines);
  }
  item.height = cardGeometry({ y: 0, lines: item.lines, font: item.font, tagRow: Boolean(item.tag), extraLines: item.extras.length, extraFont: contextFont, minHeight: item.boundary ? 40 : isStep(item) ? 38 : 44 }).height;
}
if (problems.length) throwDiagnosticProblems('SIPOC layout validation failed', problems, { subject: { diagramType: 'sipoc' } });

// Process column: start chip, steps, end chip, joined by flow arrows.
const processChain = [boundaryNodes[0], ...steps, boundaryNodes[1]];
{
  let y = itemsTop;
  for (const item of processChain) {
    item.y = round(y);
    y += item.height + flowGap;
  }
}
const center = (item) => item.y + item.height / 2;
const processBottom = boundaryNodes[1].y + boundaryNodes[1].height;

// Other columns: each item wants to sit level with what it connects to, in
// barycentre order (the classic crossing-reduction heuristic), then items
// are pushed down so none overlap.
function placeColumn(column, anchorsFor) {
  const list = items.filter((item) => item.column === column).map((item) => {
    const anchors = anchorsFor(item).filter((anchor) => Number.isFinite(anchor.y));
    return { item, desired: anchors.length ? anchors.reduce((total, anchor) => total + center(anchor), 0) / anchors.length : Infinity };
  });
  list.sort((a, b) => a.desired - b.desired || a.item.index - b.item.index);
  let cursor = itemsTop;
  for (const { item, desired } of list) {
    const wanted = Number.isFinite(desired) ? desired - item.height / 2 : cursor;
    item.y = round(Math.max(cursor, wanted));
    cursor = item.y + item.height + itemGap;
  }
  // Backward pass: pull a column that ran past the process column back up,
  // keeping its order, so no column hangs below the others.
  const stacked = list.reduce((total, { item }) => total + item.height, 0) + itemGap * (list.length - 1);
  let limit = Math.max(processBottom, itemsTop + stacked);
  for (const { item } of [...list].reverse()) {
    item.y = round(Math.min(item.y, limit - item.height));
    limit = item.y - itemGap;
  }
}
placeColumn('inputs', (item) => item.targets);
placeColumn('outputs', (item) => item.sources);
placeColumn('suppliers', (item) => item.targets);
placeColumn('customers', (item) => item.sources);

const allNodes = [...items, ...boundaryNodes];
for (const node of allNodes) node.cx = round(node.x + node.width / 2);
const contentBottom = Math.max(...allNodes.map((node) => node.y + node.height));
const frameBottom = round(contentBottom + 16);
const viewH = Math.max(meta.viewBox?.[1] || 0, round(frameBottom + legendBand));
const frames = order.map((column) => ({ column, x: round(colX[column] - framePad), cx: round(colX[column] + WIDTH[column] / 2), width: WIDTH[column] + framePad * 2 }));

// Flow arrows down the process column.
const edges = [];
for (let index = 0; index < processChain.length - 1; index += 1) {
  const from = processChain[index];
  const to = processChain[index + 1];
  const points = [[from.cx, round(from.y + from.height)], [to.cx, to.y]];
  edges.push({ kind: 'flow', from, to, points, d: polylinePath(points) });
}

// Authored links: orthogonal routes through the gap between two frames, on
// lanes chosen so no two unrelated links cross or share a corridor.
const drawn = valid.filter((relation) => relation.link);
const gaps = new Map();
for (const relation of drawn) {
  const [left, right] = order.indexOf(relation.fromItem.column) < order.indexOf(relation.toItem.column)
    ? [relation.fromItem, relation.toItem] : [relation.toItem, relation.fromItem];
  const gapStart = left.x + left.width + framePad;
  const key = left.column;
  if (!gaps.has(key)) gaps.set(key, { key, x0: gapStart, x1: gapStart + frameGap, relations: [] });
  const fromLeft = left === relation.fromItem;
  relation.start = [fromLeft ? left.x + left.width : right.x, 0];
  relation.end = [fromLeft ? right.x : left.x + left.width, 0];
  relation.boxes = { from: relation.fromItem, to: relation.toItem };
  gaps.get(key).relations.push(relation);
}
const routingProblems = [];
for (const gap of gaps.values()) {
  const plan = planLanes(gap);
  if (plan.problem) routingProblems.push(plan.problem);
}
if (routingProblems.length) throwDiagnosticProblems('SIPOC routing validation failed', routingProblems, { code: 'composition/proper-crossing', subject: { diagramType: 'sipoc' } });
for (const relation of drawn) edges.push({ kind: 'link', from: relation.fromItem, to: relation.toItem, id: relation.link.id, points: relation.points, d: polylinePath(relation.points) });

({ viewW } = fitAspect({ items: [...allNodes, ...frames], edges, viewW, viewH, minFont: Math.min(contextFont, ...allNodes.map((node) => node.font)) }));

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const kindOf = (node) => (node.boundary ? 'sipoc-boundary' : KIND[node.column]);
const names = (list) => list.map((item) => item.label).join(', ') || t('sipoc.none');

function passportFor(node) {
  if (node.boundary) return { kind: 'sipoc-boundary', context: t(`sipoc.context.boundary.${node.key}`) };
  const contexts = {
    suppliers: () => t('sipoc.context.supplier', { inputs: names(node.targets) }),
    inputs: () => t('sipoc.context.input', { suppliers: names(node.sources), steps: names(node.targets) }),
    steps: () => t('sipoc.context.step', { order: node.position, total: steps.length }),
    outputs: () => t('sipoc.context.output', { customers: names(node.targets) }),
    customers: () => t('sipoc.context.customer', { outputs: names(node.sources) }) + (node.confirmed === false ? ` · ${t('sipoc.unconfirmed')}` : ''),
  };
  return {
    kind: kindOf(node),
    sublabel: node.note,
    tag: node.requirements?.length ? node.requirements.map(requirementText).join(' · ') : undefined,
    context: contexts[node.column](),
  };
}

function renderNode(node, step) {
  const kind = kindOf(node);
  const slot = SIPOC_KIND_PALETTE[kind];
  const passport = passportFor(node);
  const geometry = cardGeometry({ y: node.y, lines: node.lines, font: node.font, tagRow: Boolean(node.tag), extraLines: node.extras.length, extraFont: contextFont, minHeight: node.height });
  const radius = node.boundary ? round(node.height / 2) : node.column === 'steps' ? 8 : 6;
  const tag = node.tag ? `\n          <text data-detail="context" x="${node.cx}" y="${geometry.tagY}" class="t-${slot}" font-size="${contextFont}" font-weight="700" text-anchor="middle" letter-spacing="0.5">${esc(node.tag)}</text>` : '';
  const extras = node.extras.map((text, index) => `\n          <text data-detail="context" x="${node.cx}" y="${geometry.extraYs[index]}" class="t-messagebus" font-size="${contextFont}" font-weight="600" text-anchor="middle">${esc(text)}</text>`).join('');
  const stepCard = isStep(node);
  const labelX = stepCard ? node.cx + BADGE_W / 2 : node.cx;
  const label = renderLines(node.lines, { x: labelX, y: geometry.labelCenter, fontSize: node.font, weight: node.column === 'steps' ? 700 : 600, attrs: 'data-node-label=""' });
  const badge = stepCard
    ? `
          <circle cx="${round(node.x + 17)}" cy="${round(node.y + node.height / 2)}" r="10" class="c-${slot}" stroke-width="1.4"/><text data-detail="context" x="${round(node.x + 17)}" y="${round(node.y + node.height / 2 + contextFont * 0.35)}" class="t-${slot}" font-size="${contextFont}" font-weight="800" text-anchor="middle">${node.position}</text>`
    : '';
  return `        <g ${focusNodeAttrs(node.id, node.label, passport, locale)}>
          ${focusNodeTitle(node.label, passport)}
          <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${radius}" class="c-mask"/>
          <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${radius}" class="c-${slot}"${node.confirmed === false ? ' stroke-dasharray="5,4"' : ''}${animateAttr(meta, 'node', step)} stroke-width="${stepCard ? 1.8 : 1.3}"/>${tag}${badge}
          ${label}${extras}
        </g>`;
}

function renderEdge(edge, index) {
  const cls = edge.kind === 'flow' ? 'a-default' : 'a-emphasis';
  const marker = edge.kind === 'flow' ? 'arrowhead' : 'arrowhead-emphasis';
  const step = edge.kind === 'flow' ? processChain.indexOf(edge.to) : order.indexOf(edge.to.column);
  return `        <path ${focusEdgeAttrs(edge.from.id, edge.to.id, undefined, index, edge.id)} data-composition-points="${edge.points.map((point) => point.join(',')).join(' ')}" d="${edge.d}" class="${cls}"${animateAttr(meta, 'edge', step)} stroke-width="${edge.kind === 'flow' ? 1.6 : 1.3}" fill="none" marker-end="url(#${marker})"/>`;
}

function renderFrames() {
  return frames.map((frame) => {
    const slot = SIPOC_KIND_PALETTE[KIND[frame.column]];
    return `        <rect data-graph-role="structural-frame" data-composition-frame-kind="sipoc-column" data-composition-frame-id="column-${frame.column}" x="${frame.x}" y="${frameTop}" width="${frame.width}" height="${round(frameBottom - frameTop)}" rx="10" class="c-lane"/>
        <text x="${frame.cx}" y="${frameTop + 34}" class="t-${slot}" font-size="24" font-weight="800" text-anchor="middle">${esc(t(`sipoc.letter.${frame.column}`))}</text>
        <text x="${frame.cx}" y="${frameTop + 56}" class="t-muted" font-size="${Math.max(10.5, contextFont)}" font-weight="700" text-anchor="middle" letter-spacing="1">${esc(t(`sipoc.column.${frame.column}`))}</text>`;
  }).join('\n');
}

const LEGEND_CATALOG = [
  { kind: 'sipoc-supplier' },
  { kind: 'sipoc-input' },
  { kind: 'sipoc-step' },
  { kind: 'sipoc-output' },
  { kind: 'sipoc-customer' },
  { kind: 'sipoc-boundary' },
  { kind: 'link', interactive: false },
].map((entry) => ({ ...entry, label: t(`legend.sipoc.${entry.kind}`) }));

function renderLegend() {
  const present = new Set(allNodes.map(kindOf));
  if (drawn.length) present.add('link');
  return renderResolvedLegend({
    entries: resolveLegend(meta.legend, LEGEND_CATALOG, present),
    locale,
    layout: { x: 40, baselineY: viewH - 30, width: viewW - 80, minTitleY: viewH - 64, unfit: meta.legend === undefined ? 'hide' : 'error', diagramType: 'sipoc' },
    renderSwatch: (entry) => {
      if (entry.kind === 'link') return `<line x1="${entry.x}" y1="${entry.baseline - 4}" x2="${entry.x + 16}" y2="${entry.baseline - 4}" class="a-emphasis" stroke-width="1.5"/>`;
      return `<rect x="${entry.x}" y="${entry.baseline - 9}" width="14" height="10" rx="${entry.kind === 'sipoc-boundary' ? 5 : 2}" class="c-${SIPOC_KIND_PALETTE[entry.kind]}" stroke-width="1"/>`;
    },
  });
}

function summaryCards() {
  const cards = [];
  if (meta.summary !== false) {
    const count = (column) => items.filter((item) => item.column === column).length;
    const outputs = items.filter((item) => item.column === 'outputs');
    const items_ = [
      ...(meta.process ? [t('sipoc.summary.process', { name: meta.process })] : []),
      t('sipoc.summary.boundaries', { start: boundaries.start, end: boundaries.end }),
      `${t('sipoc.summary.counts', { suppliers: count('suppliers'), inputs: count('inputs'), steps: count('steps'), outputs: count('outputs'), customers: count('customers') })} · ${t('sipoc.summary.ctq', { count: outputs.reduce((total, output) => total + (output.requirements?.length || 0), 0), outputs: outputs.length })}`,
      t('sipoc.summary.next'),
    ];
    cards.push({ dot: 'emerald', title: t('sipoc.summary.title'), items: items_ });
    const cm = [
      ...(sipoc.constraints || []).map((text) => t('sipoc.cm.constraint', { text })),
      ...(sipoc.measures || []).map((text) => t('sipoc.cm.measure', { text })),
    ];
    if (cm.length) cards.push({ dot: 'orange', title: t('sipoc.cm.title'), items: cm });
  }
  return [...(sipoc.cards || []), ...cards];
}

function renderSvg() {
  return `      <svg viewBox="0 0 ${round(viewW)} ${round(viewH)}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'sipoc')}
${renderDefinitions()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- S · I · P · O · C columns -->
${renderFrames()}

        <!-- Process flow and traced links -->
${edges.map(renderEdge).join('\n')}

        <!-- SIPOC elements -->
${allNodes.map((node) => renderNode(node, order.indexOf(node.column))).join('\n\n')}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({ outPath, template, diagramType: 'sipoc', meta, svg: renderSvg(), cards: summaryCards() });
