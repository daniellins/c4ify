import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { createAdvisories, elbowRight, fitAspect, formatNumber, renderLines, round, uniqueIdProblems } from '../shared/business.mjs';
import { cardGeometry, fitLabel, fitsLine } from '../shared/planning-kit.mjs';
import { IMPACTMAP_KIND_PALETTE } from './palette.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: map, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'impactmap',
  defaultExample: 'mobile-payments.impactmap.json',
});

const meta = map.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);
const LEVELS = ['goal', 'actor', 'impact', 'deliverable'];
const KIND = { goal: 'impact-goal', actor: 'impact-actor', impact: 'impact-change', deliverable: 'impact-deliverable' };
const MAX_LEAF_ROWS = 18;

// ---------------------------------------------------------------------------
// Structure (HARD rules R-IMP-01, 02, 04)
// ---------------------------------------------------------------------------
const nodes = map.nodes.map((node, index) => ({ ...node, index }));
const byId = new Map(nodes.map((node) => [node.id, node]));
const structural = uniqueIdProblems(nodes, 'nodes');
if (structural.length) throwDiagnosticProblems('Impact map structure validation failed', structural, { code: 'method/hard-rule', subject: { diagramType: 'impactmap' } });

const goals = nodes.filter((node) => node.level === 'goal');
if (goals.length !== 1) {
  advisories.fail('R-IMP-01', `An impact map has exactly one goal; found ${goals.length}${goals.length ? ` (${goals.map((goal) => goal.id).join(', ')})` : ''}. Split competing goals into separate maps.`);
}
for (const node of nodes) {
  const expectedParent = LEVELS[LEVELS.indexOf(node.level) - 1];
  if (node.level === 'goal') {
    if (node.parent) advisories.fail('R-IMP-04', `Goal "${node.id}" must not have a parent — it is the root of the map.`);
    continue;
  }
  const parent = byId.get(node.parent);
  if (!node.parent || !parent) {
    advisories.fail('R-IMP-04', `${node.level} "${node.id}" needs a parent ${expectedParent}${node.parent ? ` (unknown id "${node.parent}")` : ''}.`);
  } else if (parent.level !== expectedParent) {
    advisories.fail('R-IMP-04', `${node.level} "${node.id}" hangs from ${parent.level} "${parent.id}" — every ${node.level} hangs from an ${expectedParent} (no level jumping: goal → actor → impact → deliverable).`);
  }
  if (node.metric) advisories.fail('R-IMP-04', `Only the goal carries a metric; move the metric of ${node.level} "${node.id}" to the goal.`);
}
for (const node of nodes) {
  if (node.actor_type && node.level !== 'actor') advisories.fail('R-IMP-04', `actor_type belongs to actors; "${node.id}" is a ${node.level}.`);
  if (node.direction && node.level !== 'impact') advisories.fail('R-IMP-04', `direction belongs to impacts; "${node.id}" is a ${node.level}.`);
  if (node.deliverable_kind && node.level !== 'deliverable') advisories.fail('R-IMP-04', `deliverable_kind belongs to deliverables; "${node.id}" is a ${node.level}.`);
}
const goal = goals[0];
if (goal) {
  const metric = goal.metric;
  if (!metric) {
    advisories.fail('R-IMP-02', `Goal "${goal.id}" has no metric — a goal without a measurable target is the "astronaut" anti-pattern. Add metric {name, baseline, target, deadline}.`);
  } else {
    if (!Number.isFinite(metric.target)) advisories.fail('R-IMP-02', `Goal metric "${metric.name}" has no numeric target.`);
    if (!metric.deadline) advisories.fail('R-IMP-02', `Goal metric "${metric.name}" has no deadline — goals are time-bound.`);
  }
}
advisories.throwIfHard('Impact map method validation failed', 'impactmap');

const childrenOf = new Map(nodes.map((node) => [node.id, []]));
for (const node of nodes) if (node.parent) childrenOf.get(node.parent).push(node);
for (const node of nodes) node.children = childrenOf.get(node.id);
const ofLevel = (level) => nodes.filter((node) => node.level === level);
const actors = ofLevel('actor');
const impacts = ofLevel('impact');
const deliverables = ofLevel('deliverable');

// Path: a node marked on_path puts its whole ancestor chain on the path, so
// authors mark only the deliverable they will build next.
const onPath = new Set();
for (const node of nodes.filter((item) => item.on_path)) {
  for (let cursor = node; cursor; cursor = cursor.parent ? byId.get(cursor.parent) : null) onPath.add(cursor.id);
}

// ---------------------------------------------------------------------------
// SOFT rules → advisories (R-IMP-03, 05..12)
// ---------------------------------------------------------------------------
if (!Number.isFinite(goal.metric.baseline)) {
  advisories.warn('R-IMP-03', `Goal metric "${goal.metric.name}" has no baseline — without the benchmark nobody can tell whether the map moved it.`, goal.id);
}
const SOLUTION_START = /^(build|launch|create|develop|deliver|implement|release|ship|construir|lançar|lancar|criar|desenvolver|entregar|implementar|implantar|disponibilizar)\b/i;
if (SOLUTION_START.test(goal.label.trim())) {
  advisories.warn('R-IMP-05', `Goal "${goal.label}" names a solution — state the business problem (e.g. "increase monthly active payers"), not the scope.`, goal.id);
}
const GENERIC_ACTOR = /^(the\s+)?(users?|clients?|customers?|usuários?|usuarios?|clientes?|pessoas|people)$/i;
for (const actor of actors) {
  if (GENERIC_ACTOR.test(actor.label.trim())) advisories.warn('R-IMP-06', `Actor "${actor.label}" is generic — name a persona, role or group whose behaviour matters.`, actor.id);
  if (!actor.actor_type) advisories.warn('R-IMP-07', `Actor "${actor.label}" has no actor_type (primary, secondary or off-stage).`, actor.id);
  if (!actor.children.length) advisories.warn('R-IMP-10', `Actor "${actor.label}" has no impact — an open branch; add how their behaviour should change or drop the actor.`, actor.id);
}
const FEATURE_NOUN = /\b(tela|telas|screen|screens|api|módulo|modulo|module|botão|botao|button|dashboard|feature|funcionalidade|aplicativo|app|sistema|system|página|pagina|page)\b/i;
for (const impact of impacts) {
  if (!impact.direction) advisories.warn('R-IMP-08', `Impact "${impact.label}" has no direction — say whether the behaviour increases, decreases, starts or stops.`, impact.id);
  if (FEATURE_NOUN.test(impact.label)) advisories.warn('R-IMP-08', `Impact "${impact.label}" reads like a feature — impacts are behaviour changes of the actor; move the feature to the deliverables.`, impact.id);
  if (!impact.children.length) advisories.warn('R-IMP-10', `Impact "${impact.label}" has no deliverable — an open branch, allowed while exploring.`, impact.id);
  if (impact.children.length > 8) advisories.warn('R-IMP-12', `Impact "${impact.label}" has ${impact.children.length} deliverables — keep deliverables high-level (the "shopper" anti-pattern).`, impact.id);
}
if (actors.length >= 3 && !impacts.some((impact) => impact.direction === 'decrease' || impact.direction === 'stop')) {
  advisories.warn('R-IMP-09', 'No negative or obstructing impact is mapped — with three or more actors, ask who could hinder the goal and how.', goal.id);
}
const deliverablesOnPath = deliverables.filter((node) => onPath.has(node.id));
if (!onPath.size) {
  advisories.warn('R-IMP-11', 'No path is selected — mark on_path on the deliverable(s) of the next iteration; never aim to implement the whole map.', goal.id);
} else {
  if (deliverables.length >= 2 && deliverablesOnPath.length > deliverables.length / 2) {
    advisories.warn('R-IMP-11', `${deliverablesOnPath.length} of ${deliverables.length} deliverables are on the path — pick the shortest path to the goal, not the whole map.`, goal.id);
  }
  const pathActors = actors.filter((actor) => onPath.has(actor.id));
  if (pathActors.length > 1) {
    advisories.warn('R-IMP-11', `The path runs through ${pathActors.length} actors (${pathActors.map((actor) => actor.label).join(', ')}) — a path is goal → one actor → one impact → one or few deliverables.`, goal.id);
  }
}

// ---------------------------------------------------------------------------
// Layout: left→right tidy tree in four labelled columns
// ---------------------------------------------------------------------------
const margin = 40;
const MIN_COL_GAP = 56;
const MAX_COL_GAP = 120;
let colGap = MIN_COL_GAP;
const headerTop = 16;
const nodesTop = 80;
const rowGap = 12;
const groupGap = 18;
const legendBand = 80;
const FONT = { goal: 12.5, other: 11 };

const leafCount = nodes.filter((node) => !node.children.length).length;
if (leafCount > MAX_LEAF_ROWS) {
  throwDiagnosticProblems('Impact map layout validation failed', [`[R-IMP-12] ${leafCount} open branches exceed the ${MAX_LEAF_ROWS} readable rows — prune deliverables to options worth discussing or split the map per actor.`], { subject: { diagramType: 'impactmap' } });
}

const fmt = (value) => formatNumber(value, locale, 2);
function goalExtras() {
  const metric = goal.metric;
  const unit = metric.unit ? ` ${metric.unit}` : '';
  const range = Number.isFinite(metric.baseline)
    ? t('impactmap.metric.range', { baseline: fmt(metric.baseline), target: fmt(metric.target), unit })
    : t('impactmap.metric.target', { target: fmt(metric.target), unit });
  return [metric.name, `${range} · ${t('impactmap.metric.deadline', { deadline: metric.deadline })}`];
}
function tagText(node) {
  if (node.level === 'actor') return node.actor_type ? t(`impactmap.actor.${node.actor_type}`) : '';
  if (node.level === 'impact') {
    const parts = [node.direction ? t(`impactmap.direction.${node.direction}`) : '', node.priority ? t('impactmap.priority', { value: node.priority }) : ''];
    return parts.filter(Boolean).join(' · ');
  }
  if (node.level === 'deliverable') {
    const parts = [node.priority ? t('impactmap.priority', { value: node.priority }) : '', node.deliverable_kind ? t(`impactmap.deliverable.${node.deliverable_kind}`) : ''];
    return parts.filter(Boolean).join(' · ');
  }
  return '';
}

function layout(nodeW) {
  const widths = { goal: nodeW + 24, actor: nodeW, impact: nodeW, deliverable: nodeW };
  const colX = {};
  let cursor = margin;
  for (const level of LEVELS) {
    colX[level] = cursor;
    cursor += widths[level] + colGap;
  }
  const viewW = cursor - colGap + margin;
  // A 10px floor lets fitAspect widen the canvas to ~1500px (still >= 6px
  // projected), which suits a tree that is taller than four columns are wide.
  const floor = Math.max(10, round(minimumReadableSourceTextPx(viewW) + 0.2));
  const contextFont = floor;
  const problems = [];
  for (const node of nodes) {
    node.width = widths[node.level];
    const fitted = fitLabel(node.label, node.width, { font: node.level === 'goal' ? FONT.goal : FONT.other, floor, maxLines: 3 });
    if (!fitted) {
      problems.push(`Label "${node.label}" does not fit three lines in ${node.level} "${node.id}" (${node.width}px) — shorten it or raise meta.node_width.`);
      continue;
    }
    node.font = fitted.font;
    node.lines = fitted.lines;
    node.tag = tagText(node);
    node.extras = node.level === 'goal' ? goalExtras() : [];
    for (const text of [node.tag, ...node.extras].filter(Boolean)) {
      if (!fitsLine(text, node.width, contextFont, 16)) problems.push(`"${text}" does not fit one line of ${node.level} "${node.id}" (${node.width}px) — shorten it or raise meta.node_width.`);
    }
    const geometry = cardGeometry({ y: 0, lines: node.lines, font: node.font, tagRow: Boolean(node.tag), extraLines: node.extras.length, extraFont: contextFont, minHeight: node.level === 'goal' ? 92 : 46 });
    node.height = geometry.height;
  }
  if (problems.length) return { problems };

  // Span of a subtree = max(own height, stacked children). Actor subtrees get a
  // wider gap so each actor's branch reads as a group.
  const gapFor = (node) => (node.level === 'goal' ? groupGap : rowGap);
  const span = (node) => {
    if (!node.children.length) return (node.span = node.height);
    const stacked = node.children.reduce((total, child) => total + span(child), 0) + gapFor(node) * (node.children.length - 1);
    return (node.span = Math.max(node.height, stacked));
  };
  span(goal);
  const place = (node, top) => {
    node.x = colX[node.level];
    if (node.children.length) {
      const stacked = node.children.reduce((total, child) => total + child.span, 0) + gapFor(node) * (node.children.length - 1);
      let childTop = top + (node.span - stacked) / 2;
      for (const child of node.children) {
        place(child, childTop);
        childTop += child.span + gapFor(node);
      }
      const center = (node.children[0].cy + node.children.at(-1).cy) / 2;
      node.y = Math.min(Math.max(center - node.height / 2, top), top + node.span - node.height);
    } else {
      node.y = top + (node.span - node.height) / 2;
    }
    node.y = round(node.y);
    node.cy = round(node.y + node.height / 2);
    node.cx = round(node.x + node.width / 2);
  };
  place(goal, nodesTop);
  const bottom = nodesTop + goal.span;
  return { widths, colX, viewW, floor, contextFont, bottom };
}

// Widen the cards (fewer wrapped lines, shorter canvas) until the map is
// close to the ~2:1 first screen; an authored node_width is respected.
let geometry;
let nodeW = meta.node_width || 172;
for (;;) {
  geometry = layout(nodeW);
  const canWiden = !meta.node_width && nodeW + 16 <= 260;
  if (geometry.problems ? !canWiden : (!canWiden || geometry.viewW / (geometry.bottom + 24 + legendBand) >= 1.9)) break;
  nodeW += 16;
}
if (geometry.problems) throwDiagnosticProblems('Impact map layout validation failed', geometry.problems, { subject: { diagramType: 'impactmap' } });
// Spend spare first-screen width on longer connectors rather than blank
// margins: the same target fitAspect would center toward.
{
  const legibleW = Math.floor(930 * 10 / 6.1);
  const targetW = Math.min(Math.ceil((geometry.bottom + 16 + legendBand) * 2.05), Math.max(geometry.viewW, legibleW));
  const extra = targetW - geometry.viewW;
  if (extra > 0) {
    colGap = Math.min(MAX_COL_GAP, MIN_COL_GAP + Math.floor(extra / 3));
    geometry = layout(nodeW);
  }
}
const { widths, colX, contextFont } = geometry;
let { viewW } = geometry;
const frameBottom = round(geometry.bottom + 16);
const viewH = Math.max(meta.viewBox?.[1] || 0, frameBottom + legendBand);
viewW = Math.max(viewW, meta.viewBox?.[0] || 0);

const frames = LEVELS.map((level) => ({ level, x: round(colX[level] - 14), cx: round(colX[level] + widths[level] / 2), width: widths[level] + 28 }));
const edges = [];
for (const node of nodes) {
  for (const child of node.children) {
    const route = elbowRight([node.x + node.width, node.cy], [child.x, child.cy], node.x + node.width + colGap / 2);
    edges.push({ from: node, to: child, onPath: onPath.has(node.id) && onPath.has(child.id), ...route });
  }
}
({ viewW } = fitAspect({ items: [...nodes, ...frames], edges, viewW, viewH, minFont: Math.min(contextFont, ...nodes.map((node) => node.font)) }));

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function passportFor(node) {
  let context;
  if (node.level === 'goal') context = t('impactmap.context.goal');
  else if (node.level === 'actor') context = node.actor_type ? t('impactmap.context.actor', { type: t(`impactmap.actor.${node.actor_type}`).toLowerCase() }) : t('impactmap.context.actor.untyped');
  else if (node.level === 'impact') context = t('impactmap.context.impact', { actor: byId.get(node.parent).label });
  else context = t('impactmap.context.deliverable', { impact: byId.get(node.parent).label });
  if (onPath.has(node.id)) context = `${context} · ${t('impactmap.on-path')}`;
  const sublabelParts = [node.note];
  if (node.level === 'goal') {
    if (node.metric.meter) sublabelParts.push(t('impactmap.metric.meter', { meter: node.metric.meter }));
    if (Number.isFinite(node.metric.constraint)) sublabelParts.push(t('impactmap.metric.constraint', { value: fmt(node.metric.constraint) }));
  }
  return {
    kind: KIND[node.level],
    sublabel: sublabelParts.filter(Boolean).join(' — ') || undefined,
    tag: node.level === 'goal' ? node.extras.join(' · ') : node.tag || undefined,
    context,
  };
}

function renderNode(node) {
  const slot = IMPACTMAP_KIND_PALETTE[KIND[node.level]];
  const passport = passportFor(node);
  const highlighted = onPath.has(node.id);
  const strokeWidth = highlighted ? 2.6 : node.level === 'goal' ? 2 : 1.3;
  const geometry = cardGeometry({ y: node.y, lines: node.lines, font: node.font, tagRow: Boolean(node.tag), extraLines: node.extras.length, extraFont: contextFont, minHeight: node.height });
  const tag = node.tag
    ? `\n          <text data-detail="context" x="${node.cx}" y="${geometry.tagY}" class="t-${slot}" font-size="${contextFont}" font-weight="700" text-anchor="middle">${esc(node.tag)}</text>`
    : '';
  const extras = node.extras.map((text, index) => `\n          <text data-detail="context" x="${node.cx}" y="${geometry.extraYs[index]}" class="${index === 0 ? 't-muted' : 't-cloud'}" font-size="${contextFont}"${index === 0 ? '' : ' font-weight="700"'} text-anchor="middle">${esc(text)}</text>`).join('');
  const label = renderLines(node.lines, { x: node.cx, y: geometry.labelCenter, fontSize: node.font, weight: node.level === 'goal' || node.level === 'actor' ? 700 : 600, attrs: 'data-node-label=""' });
  return `        <g ${focusNodeAttrs(node.id, node.label, passport, locale)}>
          ${focusNodeTitle(node.label, passport)}
          <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.level === 'actor' ? 18 : 7}" class="c-mask"/>
          <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.level === 'actor' ? 18 : 7}" class="c-${slot}"${animateAttr(meta, 'node', LEVELS.indexOf(node.level))} stroke-width="${strokeWidth}"/>${tag}
          ${label}${extras}
        </g>`;
}

function renderEdge(edge, index) {
  const cls = edge.onPath ? 'a-emphasis' : 'a-default';
  const width = edge.onPath ? 2.6 : 1.3;
  return `        <path ${focusEdgeAttrs(edge.from.id, edge.to.id, undefined, index)} data-composition-points="${edge.points.map((point) => point.join(',')).join(' ')}" d="${edge.d}" class="${cls}"${animateAttr(meta, 'edge', LEVELS.indexOf(edge.to.level) - 1)} stroke-width="${width}" fill="none"/>`;
}

function renderFrames() {
  return frames.map((frame) => `        <rect data-graph-role="structural-frame" data-composition-frame-kind="impactmap-column" data-composition-frame-id="column-${frame.level}" x="${frame.x}" y="${headerTop}" width="${frame.width}" height="${round(frameBottom - headerTop)}" rx="10" class="c-lane"/>
        <text x="${frame.cx}" y="${headerTop + 28}" class="t-primary" font-size="12.5" font-weight="700" text-anchor="middle" letter-spacing="1">${esc(t(`impactmap.column.${frame.level}`))}</text>
        <text x="${frame.cx}" y="${headerTop + 46}" class="t-muted" font-size="${Math.max(10, contextFont)}" text-anchor="middle">${esc(t(`impactmap.column.${frame.level}.sub`))}</text>`).join('\n');
}

const LEGEND_CATALOG = [
  { kind: 'impact-goal' },
  { kind: 'impact-actor' },
  { kind: 'impact-change' },
  { kind: 'impact-deliverable' },
  { kind: 'path', interactive: false },
].map((entry) => ({ ...entry, label: t(`legend.impactmap.${entry.kind}`) }));

function renderLegend() {
  const present = new Set(nodes.map((node) => KIND[node.level]));
  if (onPath.size) present.add('path');
  return renderResolvedLegend({
    entries: resolveLegend(meta.legend, LEGEND_CATALOG, present),
    locale,
    layout: { x: 40, baselineY: viewH - 30, width: viewW - 80, minTitleY: viewH - 64, unfit: meta.legend === undefined ? 'hide' : 'error', diagramType: 'impactmap' },
    renderSwatch: (entry) => {
      if (entry.kind === 'path') return `<line x1="${entry.x}" y1="${entry.baseline - 4}" x2="${entry.x + 16}" y2="${entry.baseline - 4}" class="a-emphasis" stroke-width="2.6"/>`;
      return `<rect x="${entry.x}" y="${entry.baseline - 9}" width="14" height="10" rx="2" class="c-${IMPACTMAP_KIND_PALETTE[entry.kind]}" stroke-width="1"/>`;
    },
  });
}

function summaryCards() {
  const cards = [];
  if (meta.summary !== false) {
    const items = [];
    if (onPath.size) {
      const chain = (level) => nodes.filter((node) => node.level === level && onPath.has(node.id));
      items.push(t('impactmap.summary.goal', { label: goal.label }));
      for (const actor of chain('actor')) items.push(t('impactmap.summary.actor', { label: actor.label }));
      for (const impact of chain('impact')) items.push(t('impactmap.summary.impact', { label: impact.label }));
      for (const deliverable of chain('deliverable')) items.push(t('impactmap.summary.deliverable', { label: deliverable.label }));
    } else {
      items.push(t('impactmap.summary.none'));
    }
    items.push(`${t('impactmap.summary.counts', { actors: actors.length, impacts: impacts.length, deliverables: deliverables.length, onPath: deliverablesOnPath.length })}. ${t('impactmap.summary.assumptions')}`);
    cards.push({ dot: 'amber', title: t('impactmap.summary.title'), items });
  }
  return [...(map.cards || []), ...cards];
}

const pathEdges = edges.filter((edge) => edge.onPath);
const otherEdges = edges.filter((edge) => !edge.onPath);

function renderSvg() {
  return `      <svg viewBox="0 0 ${round(viewW)} ${round(viewH)}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'impactmap')}
${renderDefinitions()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Why / Who / How / What columns -->
${renderFrames()}

        <!-- Tree connectors (selected path drawn last, on top) -->
${[...otherEdges, ...pathEdges].map((edge) => renderEdge(edge, edges.indexOf(edge))).join('\n')}

        <!-- Impact map nodes -->
${nodes.map(renderNode).join('\n\n')}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({ outPath, template, diagramType: 'impactmap', meta, svg: renderSvg(), cards: summaryCards() });
