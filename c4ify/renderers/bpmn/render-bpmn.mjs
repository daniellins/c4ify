import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { legendFootprint, resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { polylinePath, routePointsValue } from '../shared/geometry.mjs';
import { createAdvisories, renderLines, round } from '../shared/business.mjs';
import { BPMN_KIND_PALETTE } from './palette.mjs';
import { buildModel } from './model.mjs';
import { checkRules, isActivity } from './rules.mjs';
import { computeLayout, L } from './layout.mjs';
import {
  activityMarkers, dataObjectFold, dataObjectPath, dataStorePath, dataStoreRims,
  eventRings, gatewayMarker, gatewayPoints, notationMarkers, notationStyle, taskGlyph, triggerGlyph,
} from './shapes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: spec, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'bpmn',
  defaultExample: 'support-ticket.bpmn.json',
});

const meta = spec.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);

// ---------------------------------------------------------------------------
// Model and rules
// ---------------------------------------------------------------------------
const { model, problems } = buildModel(spec, advisories);
if (problems.length) throwDiagnosticProblems('BPMN structure validation failed', problems, { code: 'method/hard-rule', subject: { diagramType: 'bpmn' } });
advisories.throwIfHard('BPMN method validation failed', 'bpmn');
checkRules(model, advisories);
advisories.throwIfHard('BPMN method validation failed', 'bpmn');

const layout = computeLayout(model);
if (layout.problems.length) throwDiagnosticProblems('BPMN layout validation failed', [...new Set(layout.problems)], { subject: { diagramType: 'bpmn' } });
const { viewW, font, lh, routes, labels, head } = layout;
const { nodes, pools, nodeById } = model;

// ---------------------------------------------------------------------------
// Semantics for the viewer
// ---------------------------------------------------------------------------
function kindOf(node) {
  if (node.kind === 'event') return node.event === 'start' ? 'start-event' : node.event === 'end' ? 'end-event' : 'intermediate-event';
  return node.kind;
}

function subtypeText(node) {
  if (node.kind === 'task') return t(`bpmn.subtype.task.${node.taskType}`);
  if (node.kind === 'gateway') {
    const role = model.seqOut.get(node.id).length > 1 ? t('bpmn.split') : t('bpmn.join');
    return `${t(`bpmn.subtype.gateway.${node.gateway}`)} · ${role}`;
  }
  if (node.kind === 'event') {
    const eventKey = node.isBoundary ? (node.interrupting ? 'boundary' : 'boundary-non-interrupting') : node.event;
    return t('bpmn.subtype.event', { event: t(`bpmn.event.${eventKey}`), trigger: t(`bpmn.trigger.${node.trigger}`) });
  }
  return t(`viewer.kind.${node.kind}`);
}

function passportFor(node) {
  const lane = model.laneById.get(node.lane);
  const pool = model.poolById.get(node.pool);
  const context = [lane && !lane.implicit ? t('bpmn.context.lane', { pool: pool.label, lane: lane.label }) : t('bpmn.context.pool', { pool: pool.label }), subtypeText(node)];
  if (node.isBoundary) context.push(t('bpmn.attached', { host: nodeById.get(node.attachedTo).label }));
  if (node.owner) context.push(t('bpmn.owner', { owner: node.owner }));
  return {
    kind: kindOf(node),
    sublabel: node.note,
    tag: node.sla ? t('bpmn.sla', { sla: node.sla }) : undefined,
    context: context.join(' · '),
  };
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------
function rotatedLines(lines, cx, cy, weight) {
  const left = cx - ((lines.length - 1) * lh) / 2;
  return lines.map((line, index) => {
    const x = round(left + index * lh);
    return `<text x="${x}" y="${round(cy)}" transform="rotate(-90 ${x} ${round(cy)})" class="t-primary" font-size="${font}" font-weight="${weight}" text-anchor="middle" dominant-baseline="middle">${esc(line)}</text>`;
  }).join('\n          ');
}

function renderPoolFrame(pool) {
  if (pool.blackBox) return '';
  const parts = [
    `<rect x="${pool.x}" y="${pool.y}" width="${pool.w}" height="${round(pool.h)}" data-graph-role="structural-frame" data-composition-frame-kind="pool" data-composition-frame-id="${esc(pool.id)}" class="c-lane bpmn-frame" stroke-width="1.4"/>`,
    `<rect x="${pool.x}" y="${pool.y}" width="${head}" height="${round(pool.h)}" class="bpmn-band" stroke-width="1.2"/>`,
    rotatedLines(pool.lines, pool.x + head / 2, pool.y + pool.h / 2, 700),
  ];
  for (const lane of pool.lanes.filter((item) => !item.implicit)) {
    parts.push(`<rect x="${lane.x}" y="${round(lane.y)}" width="${lane.w}" height="${round(lane.h)}" data-graph-role="structural-frame" data-composition-frame-kind="lane" data-composition-frame-id="${esc(lane.id)}" class="c-lane bpmn-frame" stroke-width="1"/>`);
    parts.push(`<rect x="${lane.x}" y="${round(lane.y)}" width="${head}" height="${round(lane.h)}" class="bpmn-band" stroke-width="1"/>`);
    parts.push(rotatedLines(lane.lines, lane.x + head / 2, lane.y + lane.h / 2, 600));
  }
  return `        <g data-bpmn-pool="${esc(pool.id)}">\n          ${parts.join('\n          ')}\n        </g>`;
}

function renderBlackBox(pool) {
  const passport = { kind: 'black-box-pool', context: t('bpmn.context.pool', { pool: pool.label }) };
  const textY = pool.y + pool.h / 2 + font * 0.35;
  return `        <g ${focusNodeAttrs(pool.id, pool.label, passport, locale)}>
          ${focusNodeTitle(pool.label, passport)}
          <rect x="${pool.x}" y="${pool.y}" width="${pool.w}" height="${pool.h}" rx="3" class="c-mask"/>
          <rect x="${pool.x}" y="${pool.y}" width="${pool.w}" height="${pool.h}" rx="3" class="c-${BPMN_KIND_PALETTE['black-box-pool']}"${animateAttr(meta, 'node', 0)} stroke-width="1.4"/>
          <text data-node-label="" x="${round(pool.x + pool.w / 2)}" y="${round(textY)}" class="t-primary" font-size="${round(font + 1.5)}" font-weight="700" text-anchor="middle">${esc(pool.label)}</text>
        </g>`;
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------
function sideLabel(node) {
  if (!node.labelRect) return '';
  const rect = node.labelRect;
  const anchor = node.isBoundary ? 'start' : 'middle';
  const x = node.isBoundary ? rect.x : rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2 + font * 0.35;
  return renderLines(node.lines, { x, y: cy, fontSize: font, lineHeight: lh, weight: 600, anchor, attrs: 'data-node-label=""' });
}

function renderNode(node) {
  const kind = kindOf(node);
  const slot = BPMN_KIND_PALETTE[kind];
  const passport = passportFor(node);
  const step = Math.max(0, (node.colValue || 1) - 1);
  const animate = animateAttr(meta, 'node', step);
  const { x, y, width, height } = node.box;
  const body = [];
  if (node.kind === 'event') {
    body.push(eventRings(node, node.cx, node.cy, slot, animate));
    body.push(triggerGlyph(node.trigger, node.cx, node.cy, { filled: node.throwing, scale: node.isBoundary ? 0.78 : 1 }));
    body.push(sideLabel(node));
  } else if (isActivity(node)) {
    const strokeWidth = node.kind === 'call-activity' ? 3.2 : 1.5;
    body.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" class="c-mask"/>`);
    body.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" class="c-${slot}"${animate} stroke-width="${strokeWidth}"/>`);
    if (node.kind === 'task') body.push(taskGlyph(node.taskType, x + 7, y + 6));
    body.push(activityMarkers(node, { x, y, w: width, h: height }));
    const bottom = node.kind !== 'task' || node.marker ? 18 : 8;
    const hasGlyph = node.kind === 'task' && node.taskType !== 'none';
    const top = y + (hasGlyph ? 16 : 8);
    const cy = (top + y + height - bottom) / 2 + font * 0.35;
    body.push(renderLines(node.lines, { x: node.cx, y: cy, fontSize: font, lineHeight: lh, weight: 600, attrs: 'data-node-label=""' }));
  } else if (node.kind === 'gateway') {
    const points = gatewayPoints(node.cx, node.cy);
    body.push(`<polygon points="${points}" class="c-mask"/>`);
    body.push(`<polygon points="${points}" class="c-${slot}"${animate} stroke-width="1.5"/>`);
    body.push(gatewayMarker(node.gateway, node.cx, node.cy));
    body.push(sideLabel(node));
  } else if (node.kind === 'data-object') {
    const d = dataObjectPath(x, y);
    body.push(`<path d="${d}" class="c-mask"/>`);
    body.push(`<path d="${d}" class="c-${slot}"${animate} stroke-width="1.3"/>`);
    body.push(dataObjectFold(x, y));
    body.push(sideLabel(node));
  } else if (node.kind === 'data-store') {
    const d = dataStorePath(x, y);
    body.push(`<path d="${d}" class="c-mask"/>`);
    body.push(`<path d="${d}" class="c-${slot}"${animate} stroke-width="1.3"/>`);
    body.push(dataStoreRims(x, y));
    body.push(sideLabel(node));
  } else {
    body.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" class="c-mask" opacity="0.001"/>`);
    body.push(`<path d="M ${x + 12} ${y} L ${x} ${y} L ${x} ${y + height} L ${x + 12} ${y + height}" class="c-${slot}" fill="none"${animate} stroke-width="1.4"/>`);
    body.push(renderLines(node.lines, { x: x + 8, y: node.cy + font * 0.35, fontSize: font, lineHeight: lh, weight: 500, anchor: 'start', className: 't-muted', attrs: 'data-node-label=""' }));
  }
  return `        <g ${focusNodeAttrs(node.id, node.label || subtypeText(node), passport, locale)}>
          ${focusNodeTitle(node.label || subtypeText(node), passport)}
          ${body.filter(Boolean).join('\n          ')}
        </g>`;
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------
function unit(start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
}

function sourceDecoration(route) {
  const { flow, points } = route;
  const [ux, uy] = unit(points[0], points[1]);
  const [sx, sy] = points[0];
  if (flow.default) {
    const cx = sx + ux * 11;
    const cy = sy + uy * 11;
    const px = -uy;
    const py = ux;
    const a = [cx - ux * 3.5 + px * 5.5, cy - uy * 3.5 + py * 5.5];
    const b = [cx + ux * 3.5 - px * 5.5, cy + uy * 3.5 - py * 5.5];
    return `<path d="M ${round(a[0])} ${round(a[1])} L ${round(b[0])} ${round(b[1])}" class="bpmn-ink" stroke-width="1.6" aria-hidden="true"/>`;
  }
  if (flow.conditional) {
    const px = -uy;
    const py = ux;
    const tip = [sx + ux * 14, sy + uy * 14];
    const mid = [sx + ux * 7, sy + uy * 7];
    const pts = [[sx, sy], [mid[0] + px * 5, mid[1] + py * 5], tip, [mid[0] - px * 5, mid[1] - py * 5]];
    return `<polygon points="${pts.map(([px2, py2]) => `${round(px2)} ${round(py2)}`).join(' ')}" class="c-mask" style="stroke: var(--arrow); stroke-width: 1.3" aria-hidden="true"/>`;
  }
  return '';
}

function renderRoute(route) {
  const { flow, points } = route;
  const d = polylinePath(points);
  const composition = `data-composition-points="${routePointsValue(points)}"`;
  const edge = focusEdgeAttrs(flow.from, flow.to, flow.label || undefined, flow.index, flow.id);
  const step = Math.max(0, (flow.fromNode?.colValue || flow.toNode?.colValue || 1) - 1);
  const animate = animateAttr(meta, 'edge', step);
  if (flow.type === 'association') {
    return `        <path ${edge} ${composition} d="${d}" class="bpmn-association" stroke-width="1.4"/>`;
  }
  if (flow.type === 'message') {
    return `        <path ${edge} ${composition} d="${d}" class="a-dashed" marker-start="url(#bpmn-message-start)" marker-end="url(#bpmn-message-end)"${animate} stroke-width="1.4" style="stroke-dasharray: 6 4"/>`;
  }
  const happy = model.happyFlows.has(flow);
  const cls = happy ? 'a-emphasis' : 'a-default';
  const marker = happy ? 'arrowhead-emphasis' : 'arrowhead';
  const decoration = sourceDecoration(route);
  return `        <path ${edge} ${composition} d="${d}" class="${cls}" marker-end="url(#${marker})"${animate} stroke-width="${happy ? 1.8 : 1.4}"/>${decoration ? `\n        ${decoration}` : ''}`;
}

function renderFlowLabel(label) {
  const { flow, rect } = label;
  const edge = focusEdgeAttrs(flow.from, flow.to, flow.label, flow.index, flow.id);
  const textClass = flow.type === 'message' ? 't-database' : 't-muted';
  return `        <g data-detail="context" ${edge}>
          <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="3" class="c-mask"/>
          <text x="${round(rect.x + rect.width / 2)}" y="${round(rect.y + rect.height / 2 + font * 0.35)}" class="${textClass}" font-size="${font}" font-weight="600" text-anchor="middle">${esc(flow.label)}</text>
        </g>`;
}

// ---------------------------------------------------------------------------
// Legend and cards
// ---------------------------------------------------------------------------
const LEGEND_CATALOG = [
  { kind: 'start-event' },
  { kind: 'intermediate-event' },
  { kind: 'end-event' },
  { kind: 'task' },
  { kind: 'subprocess' },
  { kind: 'call-activity' },
  { kind: 'gateway' },
  { kind: 'data-object' },
  { kind: 'data-store' },
  { kind: 'annotation' },
  { kind: 'black-box-pool' },
  { kind: 'sequence-flow', interactive: false, swatchWidth: 20 },
  { kind: 'message-flow', interactive: false, swatchWidth: 20 },
  { kind: 'association', interactive: false, swatchWidth: 20 },
].map((entry) => ({ ...entry, label: t(`legend.bpmn.${entry.kind}`) }));

function legendSwatch(entry) {
  const x = entry.x;
  const b = entry.baseline;
  const slot = BPMN_KIND_PALETTE[entry.kind];
  switch (entry.kind) {
    case 'start-event':
      return `<circle cx="${x + 7}" cy="${b - 4}" r="5.5" class="c-${slot}" stroke-width="1.2"/>`;
    case 'intermediate-event':
      return `<circle cx="${x + 7}" cy="${b - 4}" r="5.5" class="c-${slot}" stroke-width="1"/><circle cx="${x + 7}" cy="${b - 4}" r="3.6" fill="none" class="c-${slot}" stroke-width="0.9"/>`;
    case 'end-event':
      return `<circle cx="${x + 7}" cy="${b - 4}" r="5" class="c-${slot}" stroke-width="2.6"/>`;
    case 'gateway':
      return `<polygon points="${x + 7} ${b - 11} ${x + 14} ${b - 4} ${x + 7} ${b + 3} ${x} ${b - 4}" class="c-${slot}" stroke-width="1.1"/>`;
    case 'data-object':
      return `<path d="${dataObjectPath(x + 2, b - 11, 10, 13)}" class="c-${slot}" stroke-width="1"/>`;
    case 'data-store':
      return `<path d="${dataStorePath(x, b - 11, 14, 13)}" class="c-${slot}" stroke-width="1"/>`;
    case 'annotation':
      return `<path d="M ${x + 6} ${b - 10} L ${x + 1} ${b - 10} L ${x + 1} ${b + 1} L ${x + 6} ${b + 1}" class="c-${slot}" fill="none" stroke-width="1.2"/>`;
    case 'sequence-flow':
      return `<path d="M ${x} ${b - 4} L ${x + 15} ${b - 4}" class="a-default" stroke-width="1.4"/><polygon points="${x + 14} ${b - 7.5}, ${x + 20} ${b - 4}, ${x + 14} ${b - 0.5}" class="m-default"/>`;
    case 'message-flow':
      return `<path d="M ${x + 3} ${b - 4} L ${x + 15} ${b - 4}" class="a-dashed" stroke-width="1.3" style="stroke-dasharray: 3 2"/><circle cx="${x + 2.5}" cy="${b - 4}" r="2.4" class="c-mask" style="stroke: var(--database-stroke)"/><polygon points="${x + 14} ${b - 7.5}, ${x + 20} ${b - 4}, ${x + 14} ${b - 0.5}" class="c-mask" style="stroke: var(--database-stroke)"/>`;
    case 'association':
      return `<path d="M ${x} ${b - 4} L ${x + 20} ${b - 4}" class="bpmn-association" stroke-width="1.4"/>`;
    default: {
      const thick = entry.kind === 'call-activity' ? 2.4 : 1;
      return `<rect x="${x}" y="${b - 9}" width="14" height="10" rx="3" class="c-${slot}" stroke-width="${thick}"/>`;
    }
  }
}

function legendEntries() {
  const present = new Set(nodes.map(kindOf));
  if (pools.some((pool) => pool.blackBox)) present.add('black-box-pool');
  if (model.flows.some((flow) => flow.type === 'sequence')) present.add('sequence-flow');
  if (model.flows.some((flow) => flow.type === 'message')) present.add('message-flow');
  if (model.flows.some((flow) => flow.type === 'association')) present.add('association');
  return resolveLegend(meta.legend, LEGEND_CATALOG, present);
}

// The layout reserves one legend row; extra rows extend the canvas.
const LEGEND = legendEntries();
const legendExtra = legendFootprint(LEGEND, { width: viewW - L.margin * 2 }).extraHeight;
const viewH = round(layout.viewH + legendExtra);

function renderLegend() {
  return renderResolvedLegend({
    entries: LEGEND,
    locale,
    layout: {
      x: L.margin,
      baselineY: viewH - 14,
      width: viewW - L.margin * 2,
      minTitleY: viewH - L.legendBand - legendExtra,
      unfit: meta.legend === undefined ? 'hide' : 'error',
      diagramType: 'bpmn',
    },
    renderSwatch: legendSwatch,
  });
}

function summaryCards() {
  if (meta.summary === false) return spec.cards || [];
  const white = pools.filter((pool) => !pool.blackBox);
  // Two dense lines instead of eight: the card shares the first screen with
  // the diagram, and every line it saves goes to the diagram's height.
  const counts = [
    t('bpmn.summary.participants', { count: pools.length, lanes: white.reduce((sum, pool) => sum + pool.lanes.filter((lane) => !lane.implicit).length, 0) }),
    t('bpmn.summary.activities', { count: nodes.filter(isActivity).length }),
    t('bpmn.summary.gateways', { count: nodes.filter((node) => node.kind === 'gateway').length }),
    t('bpmn.summary.events', { count: nodes.filter((node) => node.kind === 'event').length }),
    t('bpmn.summary.messages', { count: model.flows.filter((flow) => flow.type === 'message').length }),
  ];
  const profile = [];
  if (model.happyPath.length) profile.push(t('bpmn.summary.happy', { count: model.happyPath.length }));
  if (meta.conformance) profile.push(t('bpmn.summary.conformance', { value: meta.conformance }));
  if (meta.variant) profile.push(t('bpmn.summary.variant', { value: meta.variant.toUpperCase() }));
  const items = [counts.join(' · '), profile.join(' · ')].filter(Boolean);
  return [...(spec.cards || []), { dot: 'emerald', title: t('bpmn.summary.title'), items }];
}

// Paint order: frames, associations, sequence/message flows, nodes, labels.
const flowOrder = (route) => (route.flow.type === 'association' ? 0 : route.flow.type === 'sequence' ? 1 : 2);
const orderedRoutes = [...routes].sort((a, b) => flowOrder(a) - flowOrder(b) || a.flow.index - b.flow.index);

function renderSvg() {
  return `      <svg viewBox="0 0 ${viewW} ${viewH}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'bpmn')}
${renderDefinitions()}
${notationMarkers()}
${notationStyle()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Pools and lanes -->
${pools.map(renderPoolFrame).filter(Boolean).join('\n')}

        <!-- Flows -->
${orderedRoutes.map(renderRoute).join('\n')}

        <!-- Participants and flow nodes -->
${pools.filter((pool) => pool.blackBox).map(renderBlackBox).join('\n')}
${nodes.filter((node) => !node.isBoundary).map(renderNode).join('\n\n')}
${nodes.filter((node) => node.isBoundary).map(renderNode).join('\n\n')}

        <!-- Flow labels -->
${labels.map(renderFlowLabel).join('\n')}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({
  outPath,
  template,
  diagramType: 'bpmn',
  meta,
  svg: renderSvg(),
  cards: summaryCards(),
});


