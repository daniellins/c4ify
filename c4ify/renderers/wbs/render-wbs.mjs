import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { createAdvisories, fitAspect, elbowDown, formatNumber, renderLines, round, spineRight, uniqueIdProblems, unitsFor, wrapText } from '../shared/business.mjs';
import { WBS_KIND_PALETTE } from './palette.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: wbs, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'wbs',
  defaultExample: 'rd-project.wbs.json',
});

const meta = wbs.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);
const orientation = meta.orientation || 'deliverable';
const layoutMode = meta.layout || 'hybrid';
const units = { effort: meta.units?.effort || 'h', cost: meta.units?.cost || '' };
// Showcase keeps the strict desktop floor (930 px reader) and 7 columns.
// Standard allows up to 10 level-2 columns (slide-shaped EAPs, one column per
// epic) and measures legibility against the real 1440 px reader (1346 px).
const isShowcase = (process.env.ARCHIFY_QUALITY_PROFILE || meta.quality_profile) === 'showcase';
const MAX_HYBRID_COLUMNS = isShowcase ? 7 : 10;
const READER_WIDTH = isShowcase ? undefined : 1346;

// ---------------------------------------------------------------------------
// Structure (HARD rules R-WBS-01..04, 06, 07, 10)
// ---------------------------------------------------------------------------
const elements = wbs.elements.map((element, index) => ({ ...element, index }));
const byId = new Map(elements.map((element) => [element.id, element]));
const structural = uniqueIdProblems(elements, 'elements');

const roots = elements.filter((element) => !element.parent);
if (roots.length !== 1) {
  structural.push(`[R-WBS-01] A WBS has exactly one root (level 1); found ${roots.length}: ${roots.map((root) => root.id).join(', ') || 'none'}. Give every other element a parent.`);
}
for (const element of elements) {
  if (element.parent && !byId.has(element.parent)) {
    structural.push(`[R-WBS-02] Element "${element.id}" references unknown parent "${element.parent}".`);
  }
}
for (const element of elements) {
  const seen = new Set();
  let cursor = element;
  while (cursor?.parent && byId.has(cursor.parent)) {
    if (seen.has(cursor.id)) {
      structural.push(`[R-WBS-02] Element "${element.id}" is part of a parent cycle — a WBS is a strict tree.`);
      break;
    }
    seen.add(cursor.id);
    cursor = byId.get(cursor.parent);
  }
}
if (structural.length) throwDiagnosticProblems('WBS structure validation failed', structural, { code: 'method/hard-rule', subject: { diagramType: 'wbs' } });

const root = roots[0];
const childrenOf = new Map(elements.map((element) => [element.id, []]));
for (const element of elements) if (element.parent) childrenOf.get(element.parent).push(element);

// meta.root_unnumbered: the root carries no code and level 2 is numbered 1, 2,
// 3… (a common proposal convention); the hierarchy rule still applies below.
const rootCode = meta.root_unnumbered ? '' : (root.code || meta.root_code || '1');
const rootSegments = rootCode ? rootCode.split('.').length : 0;
function assignLevels(node, level, computedCode) {
  node.level = level;
  node.children = childrenOf.get(node.id);
  node.isLeaf = node.children.length === 0;
  node.effectiveCode = node.code || computedCode;
  node.children.forEach((child, index) => assignLevels(child, level + 1, node.effectiveCode ? `${node.effectiveCode}.${index + 1}` : `${index + 1}`));
}
assignLevels(root, 1, rootCode);
const maxDepth = Math.max(...elements.map((element) => element.level));

const codes = new Map();
for (const element of elements) {
  if (element.effectiveCode && codes.has(element.effectiveCode)) {
    advisories.fail('R-WBS-03', `Code "${element.effectiveCode}" is used by "${codes.get(element.effectiveCode)}" and "${element.id}" — codes are unique join keys to schedule and cost.`);
  }
  codes.set(element.effectiveCode, element.id);
  if (element.code && element.parent) {
    const parentCode = byId.get(element.parent).effectiveCode;
    const segments = element.code.split('.').length;
    if ((parentCode && !element.code.startsWith(`${parentCode}.`)) || segments !== rootSegments + element.level - 1) {
      advisories.fail('R-WBS-04', `Code "${element.code}" of "${element.id}" must be "${parentCode}.<n>" (parent code plus one segment) to reflect level ${element.level}.`);
    }
  }
}

function effectiveKind(element) {
  if (element === root) return 'project';
  if (element.isLeaf) return element.kind === 'planning-package' ? 'planning-package' : 'work-package';
  if (element.kind === 'phase' || element.kind === 'deliverable') return element.kind;
  return orientation === 'phase' && element.level === 2 ? 'phase' : 'deliverable';
}
for (const element of elements) {
  const kind = element.kind;
  if (element === root && kind && kind !== 'project') advisories.fail('R-WBS-07', `Root "${element.id}" must be kind "project" (level 1 is the whole project).`);
  if (element !== root && kind === 'project') advisories.fail('R-WBS-07', `Only the root may be kind "project"; "${element.id}" is at level ${element.level}.`);
  if (element.isLeaf && kind && !['work-package', 'planning-package'].includes(kind) && element !== root) {
    advisories.fail('R-WBS-07', `Leaf "${element.id}" is kind "${kind}" — the lowest level of every branch is a work-package or planning-package.`);
  }
  if (!element.isLeaf && ['work-package', 'planning-package'].includes(kind)) {
    advisories.fail('R-WBS-07', `"${element.id}" is kind "${kind}" but has children — work and planning packages are leaves.`);
  }
  element.effectiveKind = effectiveKind(element);
}

// Control accounts (R-WBS-10): one per leaf path, never nested.
const hasControlAccounts = elements.some((element) => element.control_account);
if (hasControlAccounts) {
  for (const element of elements.filter((item) => item.isLeaf)) {
    const path = [];
    for (let cursor = element; cursor; cursor = cursor.parent ? byId.get(cursor.parent) : null) path.push(cursor);
    const accounts = path.filter((item) => item.control_account);
    if (accounts.length !== 1) {
      advisories.fail('R-WBS-10', `Work package "${element.id}" has ${accounts.length} control accounts on its path (${accounts.map((item) => item.id).join(', ') || 'none'}) — each package rolls up to exactly one control account.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Roll-up (R-WBS-08: the 100% rule applied to numbers)
// ---------------------------------------------------------------------------
function rollup(element, field) {
  const childValues = element.children.map((child) => rollup(child, field));
  const complete = element.children.length > 0 && childValues.every(Number.isFinite);
  const sum = complete ? childValues.reduce((total, value) => total + value, 0) : undefined;
  const authored = element[field];
  if (Number.isFinite(authored) && Number.isFinite(sum)) {
    const tolerance = Math.max(1, Math.abs(authored) * 0.005);
    if (Math.abs(authored - sum) > tolerance) {
      advisories.fail('R-WBS-08', `"${element.id}" declares ${field} ${authored} but its children sum to ${sum} — fix the children or remove the parent value so it is computed.`);
    }
  }
  const value = Number.isFinite(authored) ? authored : sum;
  element[`${field}Value`] = value;
  element[`${field}Computed`] = !Number.isFinite(authored) && Number.isFinite(sum);
  return value;
}
rollup(root, 'effort');
rollup(root, 'cost');

advisories.throwIfHard('WBS method validation failed', 'wbs');

// ---------------------------------------------------------------------------
// SOFT rules → advisories
// ---------------------------------------------------------------------------
// English verbs double as nouns in Portuguese (build, design, plano), so the
// English list only applies when the diagram is not declared pt-BR.
const EN_VERBS = [
  'develop', 'create', 'implement', 'test', 'build', 'design', 'write', 'perform', 'execute', 'conduct', 'make', 'do', 'deploy', 'define', 'analyze', 'plan', 'manage', 'integrate', 'validate', 'document', 'train',
];
const PT_VERBS = [
  'desenvolver', 'criar', 'implementar', 'testar', 'elaborar', 'fazer', 'realizar', 'executar', 'construir', 'projetar', 'validar', 'definir', 'levantar', 'especificar', 'documentar', 'integrar', 'analisar', 'planejar', 'gerenciar', 'treinar', 'implantar', 'codificar', 'programar',
];
const VERB_START = new Set(locale === 'pt-BR' ? PT_VERBS : [...EN_VERBS, ...PT_VERBS]);
const NON_PRODUCT = /\b(meetings?|reuni(?:ão|ões|oes)|travel|viagens?|rework|retrabalho|retest|reteste|warranty|other|outros|misc(?:ellaneous)?|diversos|department|departamento|labor|mão de obra|direct costs?|custos diretos)\b/i;
const PHASE_TERMS = /\b(phase|fase|sprint|iteration|itera(?:ção|cao)|etapa|stage)\s*\d*\b/i;
const PM_LABEL = /(project management|program management|gest(?:ão|ao) d[oe] projeto|gerenciamento d[oe] projeto|gest(?:ão|ao) do programa)/i;

const level2 = root.children;
for (const element of elements) {
  if (element.children.length === 1) {
    advisories.warn('R-WBS-11', `"${element.effectiveCode} ${element.label}" has a single child — that child is 100% of its parent, so one level is redundant.`, element.id);
  }
  const firstWord = element.label.trim().split(/\s+/)[0].toLowerCase().normalize('NFC');
  if (VERB_START.has(firstWord)) {
    advisories.warn('R-WBS-15', `"${element.label}" starts with a verb — WBS elements are deliverables (noun phrases); activities belong in the schedule.`, element.id);
  }
  if (NON_PRODUCT.test(element.label)) {
    advisories.warn('R-WBS-16', `"${element.label}" names a non-product item (meetings, travel, rework, "other"…) — fold it into the deliverable it serves.`, element.id);
  }
  if (orientation !== 'phase' && element !== root && PHASE_TERMS.test(element.label) && !element.isLeaf) {
    advisories.warn('R-WBS-17', `"${element.label}" looks like a phase while meta.orientation is "deliverable" — keep phases in the schedule, or declare orientation "phase".`, element.id);
  }
}
if (orientation === 'phase') {
  advisories.warn('R-WBS-17', 'Phase-oriented level 2 is accepted by PMI but rejected by NASA and MIL-STD-881F — keep deliverables at level 3.', root.id);
}
if (!level2.some((element) => element.common === 'project-management' || PM_LABEL.test(element.label))) {
  advisories.warn('R-WBS-12', 'No project management element at level 2 — the 100% rule includes managing the project (GAO, MIL-STD-881F, NASA).', root.id);
}
if (maxDepth < 3) advisories.warn('R-WBS-13', `The WBS has ${maxDepth} levels; GAO best practice expects at least 3.`, root.id);
if (maxDepth > 4) advisories.warn('R-WBS-14', `The WBS has ${maxDepth} levels in one diagram — split into an overview plus one detail diagram per level-2 branch.`, root.id);

const labelsSeen = new Map();
for (const element of elements) {
  const key = element.label.trim().toLowerCase();
  if (labelsSeen.has(key)) {
    advisories.warn('R-WBS-18', `"${element.label}" appears twice (${labelsSeen.get(key)} and ${element.id}) — duplicated names usually hide overlapping scope.`, element.id);
  } else {
    labelsSeen.set(key, element.id);
  }
}

// Completeness rules apply once the author opts into the data: if any owner,
// dictionary, or number exists, the whole set of packages must carry it.
const leaves = elements.filter((element) => element.isLeaf);
if (elements.some((element) => element.owner)) {
  for (const element of elements.filter((item) => item.isLeaf || item.control_account)) {
    if (!element.owner) advisories.warn('R-WBS-19', `"${element.effectiveCode} ${element.label}" has no owner while others do — each package and control account has one accountable owner.`, element.id);
  }
}
if (leaves.some((element) => element.dictionary)) {
  for (const element of leaves) {
    if (!element.dictionary?.description || !element.dictionary?.acceptance?.length) {
      advisories.warn('R-WBS-20', `"${element.effectiveCode} ${element.label}" lacks a dictionary description or acceptance criteria.`, element.id);
    }
  }
}
for (const field of ['effort', 'cost']) {
  if (!leaves.some((element) => Number.isFinite(element[field]))) continue;
  for (const element of leaves) {
    if (!Number.isFinite(element[field])) advisories.warn('R-WBS-23', `"${element.effectiveCode} ${element.label}" has no ${field} while other packages do — the roll-up is incomplete.`, element.id);
  }
}
if (meta.effort_band) {
  for (const element of leaves) {
    if (Number.isFinite(element.effort) && (element.effort < meta.effort_band.min || element.effort > meta.effort_band.max)) {
      advisories.warn('R-WBS-21', `"${element.label}" effort ${element.effort} is outside the ${meta.effort_band.min}–${meta.effort_band.max} band (an opt-in heuristic, not a standard).`, element.id);
    }
  }
}
for (const element of leaves.filter((item) => item.effectiveKind === 'planning-package')) {
  if (!Number.isFinite(element.effortValue)) advisories.warn('R-WBS-22', `Planning package "${element.label}" has no effort estimate — budget it at summary level.`, element.id);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
// Order matters: the viewBox width fixes the legibility floor, the floor and
// node width fix the wrapped text, and the text fixes each node's height.
const margin = 40;
const nodeW = meta.node_width || 168;
const indent = 18;
const FONT = { root: 13, l2: 11, card: 10.5 };
const BASE_H = { root: 60, l2: 64, card: 60 };
const rowGap = 12;
const colGap = level2.length > 7 ? 16 : 24;
const levelGap = 58;
const legendBand = 80;

function metricsText(element) {
  const parts = [];
  if (Number.isFinite(element.effortValue)) {
    const value = `${formatNumber(element.effortValue, locale)} ${units.effort}`;
    parts.push(element.effortComputed ? t('wbs.rollup', { value }) : value);
  }
  if (Number.isFinite(element.costValue)) {
    const value = `${units.cost ? `${units.cost} ` : ''}${formatNumber(element.costValue, locale)}`;
    parts.push(element.costComputed ? t('wbs.rollup', { value }) : value);
  }
  return parts.join(' · ');
}

const tier = (element) => (element === root ? 'root' : layoutMode === 'hybrid' && element.level > 2 ? 'card' : element.level === 2 ? 'l2' : 'card');

// 1. Width of the canvas.
let viewW;
let slotCount = 0;
if (layoutMode === 'hybrid') {
  if (level2.length > MAX_HYBRID_COLUMNS) {
    throwDiagnosticProblems('WBS layout validation failed', [`[R-WBS-14] ${level2.length} level-2 branches exceed the ${MAX_HYBRID_COLUMNS} readable columns${isShowcase ? ' in showcase (standard allows 10)' : ''} — group related branches or split the diagram per branch.`], { subject: { diagramType: 'wbs' } });
  }
  viewW = Math.max(meta.viewBox?.[0] || 0, level2.length * (nodeW + colGap) - colGap + margin * 2, 720);
} else {
  slotCount = leaves.length;
  viewW = Math.max(meta.viewBox?.[0] || 0, slotCount * (nodeW + 20) - 20 + margin * 2, 720);
}
const floorFont = Math.max(8.6, round(minimumReadableSourceTextPx(viewW, READER_WIDTH) + 0.2));
const contextFont = Math.max(9, floorFont);

// 2. Widths, wrapped text and heights.
const layoutProblems = [];
for (const element of elements) {
  const kind = tier(element);
  if (element === root) element.width = layoutMode === 'hybrid' ? Math.min(Math.max(nodeW + 80, 260), viewW - margin * 2) : nodeW + 60;
  else element.width = layoutMode === 'hybrid' ? nodeW - indent * Math.max(0, element.level - 2) : nodeW;
  if (element.width < 104) {
    layoutProblems.push(`[R-WBS-14] "${element.label}" at level ${element.level} leaves only ${element.width}px — raise meta.node_width or split the branch into its own diagram.`);
    continue;
  }
  const reserved = element.control_account ? 28 : 0;
  // Prefer a consistent type size: allow one half-step shrink, then a third
  // line, and only then shrink toward the legibility floor.
  const attempts = [];
  for (let font = FONT[kind]; font >= floorFont - 0.001; font = round(font - 0.5)) attempts.push(font);
  const order = [
    ...attempts.slice(0, 2).map((font) => [font, 2]),
    [FONT[kind], 3],
    ...attempts.slice(2).map((font) => [font, 2]),
    ...attempts.slice(1).map((font) => [font, 3]),
  ];
  let fitted = null;
  for (const [font, maxLines] of order) {
    const wrapped = wrapText(element.label, unitsFor(element.width - reserved, font), maxLines);
    if (!wrapped.overflow) { fitted = { font, lines: wrapped.lines }; break; }
  }
  if (!fitted) {
    layoutProblems.push(`Label "${element.label}" does not fit three lines in node "${element.id}" (${element.width}px) — shorten it or raise meta.node_width.`);
    continue;
  }
  element.font = fitted.font;
  element.lines = fitted.lines;
  element.sublines = [];
  if (element.sublabel) {
    const wrappedSub = wrapText(element.sublabel, unitsFor(element.width, contextFont), 2);
    if (wrappedSub.overflow) {
      layoutProblems.push(`Sublabel "${element.sublabel}" needs more than two lines in node "${element.id}" (${element.width}px) — shorten it.`);
    }
    element.sublines = wrappedSub.lines;
  }
  element.metrics = metricsText(element);
  // Height follows content: code row + wrapped label + metrics row, never
  // less than the tier's base height (so rows stay aligned when text is short).
  const contentH = (meta.show_codes === false ? 6 : 18) + fitted.lines.length * fitted.font * 1.25 + element.sublines.length * contextFont * 1.25 + (element.metrics ? 19 : 6) + 8;
  element.height = Math.max(BASE_H[kind], Math.ceil(contentH));
  if (element.metrics && element.metrics.length > unitsFor(element.width, contextFont)) {
    layoutProblems.push(`Numbers "${element.metrics}" do not fit node "${element.id}" (${element.width}px) — shorten units or raise meta.node_width.`);
  }
}
if (layoutProblems.length) throwDiagnosticProblems('WBS layout validation failed', layoutProblems, { subject: { diagramType: 'wbs' } });

function place(element, x, y) {
  Object.assign(element, { x: round(x), y: round(y), cx: round(x + element.width / 2) });
}

// 3. Placement and connectors.
const edges = [];
let viewH;
if (layoutMode === 'hybrid') {
  const colW = nodeW + colGap;
  const left = (viewW - (level2.length * colW - colGap)) / 2;
  place(root, (viewW - root.width) / 2, 36);
  const l2Y = root.y + root.height + 44;
  const l2H = Math.max(...level2.map((element) => element.height));
  let bottom = l2Y + l2H;
  level2.forEach((element, column) => {
    element.height = l2H;
    const x = left + column * colW;
    place(element, x, l2Y);
    edges.push({ from: root, to: element, ...elbowDown([root.cx, root.y + root.height], [element.cx, element.y], root.y + root.height + 22) });
    let cursor = element.y + element.height + 16;
    const stack = (parent) => {
      for (const child of parent.children) {
        place(child, x + indent * (child.level - 2), cursor);
        const spineX = parent.x + 9;
        edges.push({ from: parent, to: child, ...spineRight([spineX, parent.y + parent.height], [child.x, child.y + child.height / 2], spineX) });
        cursor += child.height + rowGap;
        stack(child);
      }
    };
    stack(element);
    bottom = Math.max(bottom, cursor - rowGap);
  });
  viewH = Math.max(meta.viewBox?.[1] || 0, bottom + legendBand);
} else {
  // Top-down tidy tree: leaves take consecutive slots, parents center on them.
  const slotW = nodeW + 20;
  let slot = 0;
  const assign = (element) => {
    if (element.isLeaf) {
      element.slotCenter = slot * slotW + nodeW / 2;
      slot += 1;
    } else {
      element.children.forEach(assign);
      element.slotCenter = (element.children[0].slotCenter + element.children.at(-1).slotCenter) / 2;
    }
  };
  assign(root);
  const left = (viewW - (slotCount * slotW - 20)) / 2;
  const rowHeight = new Map();
  for (const element of elements) rowHeight.set(element.level, Math.max(rowHeight.get(element.level) || 0, element.height));
  const rowY = new Map([[1, 36]]);
  for (let level = 2; level <= maxDepth; level += 1) rowY.set(level, rowY.get(level - 1) + rowHeight.get(level - 1) + levelGap);
  for (const element of elements) {
    element.height = rowHeight.get(element.level);
    place(element, left + element.slotCenter - element.width / 2, rowY.get(element.level));
  }
  for (const element of elements) {
    for (const child of element.children) {
      edges.push({ from: element, to: child, ...elbowDown([element.cx, element.y + element.height], [child.cx, child.y], element.y + element.height + levelGap / 2) });
    }
  }
  viewH = Math.max(meta.viewBox?.[1] || 0, rowY.get(maxDepth) + rowHeight.get(maxDepth) + legendBand);
}

// 4. Aspect: the viewer is a first-screen artifact. A narrow, tall canvas is
// widened (content centered) toward ~2:1, but never past the width at which
// the smallest node text would fall below the desktop legibility floor.
({ viewW } = fitAspect({ items: elements, edges, viewW, viewH, minFont: Math.min(contextFont, ...elements.map((element) => element.font)) }));

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const showCodes = meta.show_codes !== false;

// meta.color_by: "group" colors each level-2 branch (and its descendants) by
// an authored group such as the epic's nature; kinds still drive the details
// passport and the Semantic Lens. Seven palette slots → at most seven groups.
const GROUP_SLOTS = ['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external'];
const colorByGroup = meta.color_by === 'group';
const groupSlots = new Map();
if (colorByGroup) {
  const assign = (element, inherited) => {
    element.group = element.group || inherited;
    element.children.forEach((child) => assign(child, element.group));
  };
  level2.forEach((element) => assign(element, undefined));
  const used = new Set(Object.values(meta.groups || {}));
  const free = GROUP_SLOTS.filter((slot) => !used.has(slot));
  for (const element of elements) {
    if (!element.group || groupSlots.has(element.group)) continue;
    const slot = meta.groups?.[element.group] || free.shift();
    if (!slot) {
      throwDiagnosticProblems('WBS layout validation failed', [`meta.color_by "group" supports 7 groups; "${element.group}" is the 8th — merge groups or use color_by "kind".`], { subject: { diagramType: 'wbs' } });
    }
    groupSlots.set(element.group, slot);
  }
}
function slotFor(element) {
  if (colorByGroup && element !== root && element.group) return groupSlots.get(element.group);
  return WBS_KIND_PALETTE[element.effectiveKind];
}

function passportFor(element) {
  const contextParts = [t('wbs.context', { code: element.effectiveCode, level: element.level })];
  if (element.owner) contextParts.push(t('wbs.owner', { owner: element.owner }));
  if (element.stage) contextParts.push(t('wbs.stage', { stage: element.stage }));
  const acceptance = element.dictionary?.acceptance?.length
    ? ` — ${t('wbs.dictionary.acceptance', { text: element.dictionary.acceptance.join('; ') })}`
    : '';
  return {
    kind: element.effectiveKind,
    sublabel: element.dictionary?.description ? `${element.dictionary.description}${acceptance}` : element.sublabel,
    tag: element.metrics || undefined,
    context: contextParts.join(' · '),
  };
}

const STATUS_CLASS = { done: 'c-backend', 'in-progress': 'c-cloud', 'at-risk': 'c-security', planned: 'c-external' };

function renderElement(element) {
  const slot = slotFor(element);
  const passport = passportFor(element);
  const dashed = element.effectiveKind === 'planning-package' ? ' stroke-dasharray="5,4"' : '';
  const strokeWidth = element === root ? 2.2 : element.level === 2 ? 1.8 : 1.3;
  const codeY = element.y + 13;
  const hasMetrics = Boolean(element.metrics);
  // Optical centering: the label block sits between the code row and the
  // metrics row; baselines are offset by ~0.35em so glyphs, not baselines,
  // are centered.
  const regionTop = element.y + (showCodes ? 18 : 6);
  const regionBottom = element.y + element.height - (hasMetrics ? 19 : 6);
  const lineH = element.font * 1.25;
  const subH = contextFont * 1.25;
  const blockH = element.lines.length * lineH + element.sublines.length * subH;
  const firstBaseline = (regionTop + regionBottom) / 2 - blockH / 2 + element.font * 0.85;
  const labelCenterY = firstBaseline + ((element.lines.length - 1) * lineH) / 2;
  const firstSubBaseline = firstBaseline + (element.lines.length - 1) * lineH + subH;
  const code = showCodes
    && element.effectiveCode ? `\n          <text x="${round(element.x + 8)}" y="${round(codeY)}" class="t-dim" font-size="9" font-weight="600">${esc(element.effectiveCode)}</text>`
    : '';
  const badge = element.control_account
    ? `\n          <g aria-hidden="true"><rect x="${round(element.x + element.width - 30)}" y="${round(element.y + 5)}" width="24" height="12" rx="3" class="c-database" stroke-width="1"/><text x="${round(element.x + element.width - 18)}" y="${round(element.y + 14)}" class="t-database" font-size="7.5" font-weight="700" text-anchor="middle">CA</text></g>`
    : '';
  const status = element.status && element.status !== 'planned'
    ? `\n          <circle cx="${round(element.x + element.width - (element.control_account ? 38 : 11))}" cy="${round(element.y + 11)}" r="3.6" class="${STATUS_CLASS[element.status]}" stroke-width="1.2"/>`
    : '';
  const metrics = hasMetrics
    ? `\n          <text data-detail="context" x="${element.cx}" y="${round(element.y + element.height - 9)}" class="t-muted" font-size="${contextFont}" text-anchor="middle">${esc(element.metrics)}</text>`
    : '';
  const sublabel = element.sublines.length
    ? `\n          ${renderLines(element.sublines, { x: element.cx, y: firstSubBaseline + ((element.sublines.length - 1) * subH) / 2, fontSize: contextFont, className: 't-muted', attrs: 'data-detail="context"' })}`
    : '';
  const label = renderLines(element.lines, {
    x: element.cx,
    y: labelCenterY,
    fontSize: element.font,
    weight: element.level <= 2 ? 700 : 600,
    attrs: 'data-node-label=""',
  });
  return `        <g ${focusNodeAttrs(element.id, element.label, passport, locale)}>
          ${focusNodeTitle(`${element.effectiveCode} ${element.label}`, passport)}
          <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="7" class="c-mask"/>
          <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="7" class="c-${slot}"${dashed}${animateAttr(meta, 'node', element.level - 1)} stroke-width="${strokeWidth}"/>${code}${badge}${status}
          ${label}${sublabel}${metrics}
        </g>`;
}

function renderEdge(edge, index) {
  return `        <path ${focusEdgeAttrs(edge.from.id, edge.to.id, undefined, index)} data-composition-points="${edge.points.map((point) => point.join(',')).join(' ')}" d="${edge.d}" class="a-default"${animateAttr(meta, 'edge', edge.to.level - 2)} stroke-width="1.3" fill="none"/>`;
}

const LEGEND_CATALOG = [
  { kind: 'project' },
  { kind: 'phase' },
  { kind: 'deliverable' },
  { kind: 'work-package' },
  { kind: 'planning-package' },
  { kind: 'control-account', interactive: false },
].map((entry) => ({ ...entry, label: t(`legend.wbs.${entry.kind}`) }));

function renderLegend() {
  const present = new Set(elements.map((element) => element.effectiveKind));
  if (hasControlAccounts) present.add('control-account');
  if (colorByGroup) {
    // Groups replace the kind colors; planning packages and control accounts
    // keep their own marks, so they stay in the legend.
    const groupEntries = [...groupSlots].map(([name, slot], index) => ({ kind: `group-${index}`, label: name, slot, interactive: false }));
    groupEntries.forEach((entry) => present.add(entry.kind));
    const catalog = [...groupEntries, ...LEGEND_CATALOG.filter((entry) => ['planning-package', 'control-account'].includes(entry.kind))];
    return renderLegendEntries(resolveLegend(meta.legend, catalog, present));
  }
  return renderLegendEntries(resolveLegend(meta.legend, LEGEND_CATALOG, present));
}

function renderLegendEntries(entries) {
  return renderResolvedLegend({
    entries,
    locale,
    layout: {
      x: 40,
      baselineY: viewH - 30,
      width: viewW - 80,
      minTitleY: viewH - 64,
      unfit: meta.legend === undefined ? 'hide' : 'error',
      diagramType: 'wbs',
    },
    renderSwatch: (entry) => {
      if (entry.kind === 'control-account') {
        return `<rect x="${entry.x}" y="${entry.baseline - 9}" width="16" height="10" rx="2" class="c-database" stroke-width="1"/>`;
      }
      const dashed = entry.kind === 'planning-package' ? ' stroke-dasharray="3,2"' : '';
      return `<rect x="${entry.x}" y="${entry.baseline - 9}" width="14" height="10" rx="2" class="c-${entry.slot || WBS_KIND_PALETTE[entry.kind]}"${dashed} stroke-width="1"/>`;
    },
  });
}

function summaryCards() {
  const cards = [];
  if (meta.summary !== false) {
    const items = [];
    if (Number.isFinite(root.effortValue)) items.push(t('wbs.summary.effort', { value: formatNumber(root.effortValue, locale), unit: units.effort }));
    if (Number.isFinite(root.costValue)) items.push(t('wbs.summary.cost', { value: formatNumber(root.costValue, locale), unit: units.cost }));
    items.push(t('wbs.summary.packages', { count: leaves.filter((item) => item.effectiveKind === 'work-package').length }));
    const planning = leaves.filter((item) => item.effectiveKind === 'planning-package').length;
    if (planning) items.push(t('wbs.summary.planning', { count: planning }));
    if (hasControlAccounts) items.push(t('wbs.summary.accounts', { count: elements.filter((item) => item.control_account).length }));
    items.push(t('wbs.summary.levels', { count: maxDepth }));
    // A total stated elsewhere (a manager, a proposal) never replaces the
    // roll-up; it is shown beside it so the variance is visible in the artifact.
    const reference = meta.reference_total;
    for (const [field, unitText, rolled] of [['effort', units.effort, root.effortValue], ['cost', units.cost, root.costValue]]) {
      if (!reference || !Number.isFinite(reference[field]) || !Number.isFinite(rolled)) continue;
      const show = (value) => (field === 'effort'
        ? `${formatNumber(value, locale)} ${unitText}`
        : `${unitText ? `${unitText} ` : ''}${formatNumber(value, locale)}`);
      const delta = rolled - reference[field];
      const source = reference.source || t('wbs.summary.reference.source');
      items.push(Math.abs(delta) < 0.5
        ? t('wbs.summary.reference.match', { source, value: show(reference[field]) })
        : t('wbs.summary.reference', { source, value: show(reference[field]), delta: `${delta > 0 ? '+' : '−'}${show(Math.abs(delta))}` }));
    }
    cards.push({ dot: 'emerald', title: t('wbs.summary.title'), items });
  }
  if (meta.dictionary_card) {
    const items = leaves
      .filter((item) => item.dictionary?.description)
      .map((item) => `${item.effectiveCode} ${item.label} — ${item.dictionary.description}`);
    if (items.length) cards.push({ dot: 'cyan', title: t('wbs.dictionary.title'), items });
  }
  return [...(wbs.cards || []), ...cards];
}

function renderSvg() {
  return `      <svg viewBox="0 0 ${round(viewW)} ${round(viewH)}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'wbs')}
${renderDefinitions()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Decomposition connectors -->
${edges.map(renderEdge).join('\n')}

        <!-- WBS elements -->
${elements.map(renderElement).join('\n\n')}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({
  outPath,
  template,
  diagramType: 'wbs',
  meta,
  svg: renderSvg(),
  cards: summaryCards(),
});
