import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { polylinePath } from '../shared/geometry.mjs';
import { TARGET_ASPECT, createAdvisories, dedupe, formatNumber, formatPercent, renderLines, round, unitsFor, wrapText } from '../shared/business.mjs';
import { textUnits } from '../shared/utils.mjs';
import { VSM_KIND_PALETTE } from './palette.mjs';
import { analyzeVsm } from './metrics.mjs';
import { factoryPath, lightning, pullGlyph, starPoints, supermarketPath, trianglePoints, truck, vsmDefinitions } from './glyphs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: vsm, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'vsm',
  defaultExample: 'software-delivery.vsm.json',
});

const meta = vsm.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);
const model = analyzeVsm(vsm, advisories);
const { chain, gaps, buffers, kaizens, controls, supplier, customer, material, info, metrics, byId } = model;
const office = metrics.variant === 'office';
const N = chain.length;
const kindOf = (node) => `vsm-${node.kind}`;

// ---------------------------------------------------------------------------
// Number formatting (units always explicit)
// ---------------------------------------------------------------------------
const num = (value, digits = 1) => formatNumber(value, locale, digits);
const dur = (value, unit, digits = 1) => `${num(value, digits)} ${unit}`;
// Round half-up on the displayed digit (0.1425 is stored as 0.14249…).
const pct = (ratio) => {
  const digits = ratio < 0.01 ? 2 : 1;
  const scale = 10 ** digits;
  return formatPercent(Math.round(ratio * 100 * scale + 1e-7) / scale / 100, locale, digits);
};
function seconds(value) {
  if (value >= 3600) return dur(value / 3600, 'h');
  if (value >= 120) return dur(value / 60, 'min');
  return dur(value, 's');
}
const qtyUnit = (buffer) => buffer.qty_unit || t(office ? 'vsm.unit.items' : 'vsm.unit.pieces');
const demandText = () => (meta.demand ? t('vsm.demand', { qty: num(meta.demand.qty, 0), unit: meta.demand.unit || t(office ? 'vsm.unit.items' : 'vsm.unit.pieces'), period: t(`vsm.period.${meta.demand.period}`) }) : '');

// ---------------------------------------------------------------------------
// Canvas width fixes the legibility floor; the floor fixes every font.
// ---------------------------------------------------------------------------
const MARGIN = 40;
const procW = meta.node_width || 156;
const gapW = 118;
const topW = procW;
const controlW = Math.round(procW * 1.25);
const chainW = (N + 1) * gapW + N * procW;
const naturalW = Math.max(meta.viewBox?.[0] || 0, MARGIN * 2 + chainW + 24);
const floorFont = Math.max(8.6, round(minimumReadableSourceTextPx(naturalW) + 0.2));
const F = { label: Math.max(12, round(floorFont + 0.8)), ctx: Math.max(10, floorFont), small: Math.max(10, floorFont) };
const LH = (font) => round(font * 1.3);
const problems = [];

function fit(text, width, font, maxLines, subject) {
  const wrapped = wrapText(text, unitsFor(width, font), maxLines);
  if (wrapped.overflow) problems.push(`"${text}" does not fit ${maxLines} line${maxLines > 1 ? 's' : ''} in ${subject} (${Math.round(width)}px at ${font}px) — shorten it${subject.startsWith('process') ? ' or raise meta.node_width' : ''}.`);
  return wrapped.lines;
}
const textW = (text, font) => textUnits(text) * font * 0.6;

// ---------------------------------------------------------------------------
// Text content per node
// ---------------------------------------------------------------------------
function dataLines(node) {
  const lines = [];
  if (office) {
    lines.push({ text: t('vsm.data.pt', { value: dur(node.pt, metrics.units.pt) }) });
    lines.push({ text: t('vsm.data.lt', { value: dur(node.lt, metrics.units.lt) }) });
    if (Number.isFinite(node.pct_ca)) lines.push({ text: t('vsm.data.ca', { value: `${num(node.pct_ca)}%` }) });
    if (node.staff) lines.push({ text: t('vsm.data.staff', { value: node.staff }) });
    return lines;
  }
  const ct = dur(node.ct_s, 's');
  lines.push(node.overTakt ? { text: t('vsm.data.overTakt', { value: t('vsm.data.ct', { value: ct }) }), alert: true } : { text: t('vsm.data.ct', { value: ct }) });
  if (node.co_min !== undefined) lines.push({ text: t('vsm.data.co', { value: dur(node.co_min, 'min') }) });
  if (node.uptime_pct !== undefined) lines.push({ text: t('vsm.data.uptime', { value: `${num(node.uptime_pct)}%` }) });
  if (node.operators !== undefined) lines.push({ text: t('vsm.data.operators', { value: node.operators }) });
  if (node.shifts !== undefined) lines.push({ text: t('vsm.data.shifts', { value: node.shifts }) });
  if (node.epe) lines.push({ text: t('vsm.data.epe', { value: node.epe }) });
  if (node.scrap_pct !== undefined) lines.push({ text: t('vsm.data.scrap', { value: `${num(node.scrap_pct)}%` }) });
  return lines;
}

function bufferLines(buffer) {
  const lines = [];
  if (Number.isFinite(buffer.qty)) lines.push(`${num(buffer.qty, 0)} ${qtyUnit(buffer)}`);
  if (office && Number.isFinite(buffer.wait)) lines.push(t('vsm.buffer.wait', { value: dur(buffer.wait, buffer.wait_unit) }));
  if (!office && Number.isFinite(buffer.days)) lines.push(t('vsm.buffer.days', { value: num(buffer.days) }));
  if (buffer.max_qty) lines.push(t('vsm.buffer.max', { value: num(buffer.max_qty, 0) }));
  return lines;
}

const topSub = (node) => {
  if (node.kind === 'customer') return node.delivery || node.role || demandText();
  return node.delivery || node.role || '';
};

for (const node of chain) {
  const role = [node.role, node.pacemaker ? t('vsm.pacemaker') : ''].filter(Boolean).join(' · ');
  node.labelLines = fit(node.label, procW - 8, F.label, 3, `process "${node.id}"`);
  node.roleLines = role ? fit(role, procW - 8, F.ctx, 2, `process "${node.id}" role`) : [];
  node.data = dataLines(node);
  for (const line of node.data) if (textW(line.text, F.ctx) > procW - 14) problems.push(`Data "${line.text}" does not fit the data box of "${node.id}" — raise meta.node_width.`);
}
const topNodes = [supplier, ...controls, customer].filter(Boolean);
for (const node of topNodes) {
  const width = node.kind === 'control' ? controlW : topW;
  node.w = width;
  node.labelLines = fit(node.label, width - 12, F.label, 2, `${node.kind} "${node.id}"`);
  const sub = topSub(node);
  node.subLines = sub ? fit(sub, width - 12, F.ctx, 2, `${node.kind} "${node.id}" subtitle`) : [];
}
for (const buffer of buffers) {
  buffer.labelLines = fit(buffer.label, gapW - 6, F.small, 2, `${buffer.kind} "${buffer.id}"`);
  buffer.metricLines = bufferLines(buffer);
  for (const line of buffer.metricLines) if (textW(line, F.ctx) > gapW - 8) problems.push(`"${line}" of "${buffer.id}" does not fit between two blocks — use a shorter qty_unit.`);
}
kaizens.forEach((kaizen, index) => { kaizen.code = `K${index + 1}`; });
if (problems.length) throwDiagnosticProblems('VSM layout validation failed', problems, { subject: { diagramType: 'vsm' } });

// Uniform heights keep the flow line and the data boxes aligned in one row.
const procH = Math.max(...chain.map((node) => 14 + node.labelLines.length * LH(F.label) + node.roleLines.length * LH(F.ctx) + 8));
const dataH = Math.max(...chain.map((node) => 10 + node.data.length * LH(F.ctx)));
const ROOF = 12;
const topH = Math.max(...topNodes.map((node) => ROOF + 14 + node.labelLines.length * LH(F.label) + node.subLines.length * LH(F.ctx)));

// ---------------------------------------------------------------------------
// Horizontal placement (a pure function of the left edge, so the canvas can be
// re-centred after the height is known)
// ---------------------------------------------------------------------------
const edges = [];
const infoProblems = [];
function place(left) {
  let x = left;
  for (let index = 0; index <= N; index += 1) {
    const gap = gaps[index];
    gap.x = round(x);
    gap.cx = round(x + gapW / 2);
    x += gapW;
    if (index < N) {
      const node = chain[index];
      node.x = round(x);
      node.w = procW;
      node.cx = round(x + procW / 2);
      x += procW;
    }
  }
  const chainLeft = left;
  const chainRight = round(x);
  if (supplier) Object.assign(supplier, { x: round(gaps[0].cx - topW / 2), cx: gaps[0].cx });
  Object.assign(customer, { x: round(gaps[N].cx - topW / 2), cx: gaps[N].cx });
  controls.forEach((control, index) => {
    const cx = chainLeft + (chainW * (index + 1)) / (controls.length + 1);
    Object.assign(control, { x: round(cx - controlW / 2), cx: round(cx) });
  });
  return { chainLeft, chainRight };
}

// Top-band order: supplier left, controls centre, customer right.
const topOrder = topNodes;
const topIndex = new Map(topOrder.map((node, index) => [node.id, index]));
const topToTop = info.filter((flow) => topIndex.has(flow.from) && topIndex.has(flow.to));
const topToProcess = info.filter((flow) => !(topIndex.has(flow.from) && topIndex.has(flow.to)));
const topOf = (flow) => (topIndex.has(flow.from) ? flow.fromNode : flow.toNode);
const procOf = (flow) => (topIndex.has(flow.from) ? flow.toNode : flow.fromNode);
const materialIn = material.find((flow) => flow.fromNode.kind === 'supplier');
const materialOut = material.find((flow) => flow.toNode.kind === 'customer');

// Ports and channel levels. Along one fan, the farther target takes the
// higher channel and the outer port, so routes never cross each other.
function planFans() {
  for (const node of chain) {
    const touching = topToProcess.filter((flow) => procOf(flow) === node).sort((a, b) => topOf(a).cx - topOf(b).cx);
    touching.forEach((flow, index) => { flow.procPort = round(node.cx + (index - (touching.length - 1) / 2) * 22); });
  }
  let maxLevels = 0;
  for (const top of topOrder) {
    const items = topToProcess.filter((flow) => topOf(flow) === top).map((flow) => ({ flow, tx: flow.procPort, materialEdge: false }));
    if (top === supplier && materialIn) items.push({ flow: materialIn, tx: chain[0].x, materialEdge: true });
    if (top === customer && materialOut) items.push({ flow: materialOut, tx: chain[N - 1].x + procW, materialEdge: true });
    items.sort((a, b) => a.tx - b.tx);
    const spacing = items.length > 1 ? Math.min(22, (top.w - 28) / (items.length - 1)) : 0;
    items.forEach((item, index) => {
      item.port = round(top.cx + (index - (items.length - 1) / 2) * spacing);
      const inSpan = item.tx >= top.x + 14 && item.tx <= top.x + top.w - 14;
      const crowded = items.some((other) => other !== item && Math.abs(other.port - item.tx) < 10);
      if (!item.materialEdge && inSpan && Math.abs(item.port - item.tx) < 24 && !crowded) item.port = item.tx;
    });
    const left = items.filter((item) => !item.materialEdge && item.tx < item.port - 0.5).sort((a, b) => a.tx - b.tx);
    const right = items.filter((item) => !item.materialEdge && item.tx > item.port + 0.5).sort((a, b) => b.tx - a.tx);
    left.forEach((item, index) => { item.level = index; });
    right.forEach((item, index) => { item.level = index; });
    for (const item of items) {
      item.flow.topPort = item.port;
      item.flow.level = item.level;
      if (!item.materialEdge && item.level !== undefined && Math.abs(item.port - item.tx) < 16) {
        infoProblems.push(`Information flow ${item.flow.from} → ${item.flow.to} needs a ${Math.round(Math.abs(item.port - item.tx))}px jog — reorder the controls or blocks so the flow runs straight or at least 16px sideways.`);
      }
    }
    maxLevels = Math.max(maxLevels, left.length, right.length);
  }
  return maxLevels;
}

// ---------------------------------------------------------------------------
// Vertical placement
// ---------------------------------------------------------------------------
place(MARGIN);
const maxLevels = planFans();
const stripY = 24;
const topY = 44;
const topBottom = topY + topH;
const chTop = topBottom + 20;
const CH_STEP = 16;
const procY = round((maxLevels ? chTop + (maxLevels - 1) * CH_STEP : topBottom) + 58);
const labelBandY = procY - 24;
const arrowY = round(procY + Math.min(20, procH / 3));
const glyphTop = arrowY + 14;
const dataTop = procY + procH;
const dataBottom = dataTop + dataH;
const bufferBottom = Math.max(0, ...buffers.map((buffer) => glyphTop + 28 + 6 + (buffer.labelLines.length + buffer.metricLines.length) * LH(F.small)));
const contentBottom = Math.max(dataBottom + 16, bufferBottom);
const yUp = round(contentBottom + 14 + F.ctx);
const yDown = yUp + 28;
const timelineBottom = yDown + 8 + F.ctx;

// Totals box (bottom-right) — every value computed, never authored.
const hoursNote = (value) => (metrics.whpd ? t('vsm.totals.basis', { value, hours: num(metrics.whpd) }) : value);
const totalsLines = office
  ? [
      t('vsm.totals.lead', { value: dur(metrics.totalLt, metrics.units.lt) }),
      t('vsm.totals.pt', { value: dur(metrics.totalPt, metrics.units.pt) }),
      t('vsm.totals.ratio', { value: hoursNote(pct(metrics.activityRatio)) }),
      ...(Number.isFinite(metrics.rolledCa) ? [t('vsm.totals.rolled', { value: pct(metrics.rolledCa) })] : []),
    ]
  : [
      t('vsm.totals.lead', { value: dur(metrics.leadDays, 'd') }),
      t('vsm.totals.va', { value: dur(metrics.vaS, 's') }),
      ...(Number.isFinite(metrics.flowEfficiency) ? [t('vsm.totals.flow', { value: pct(metrics.flowEfficiency) })] : []),
      ...(metrics.taktS ? [t('vsm.totals.takt', { value: dur(metrics.taktS, 's') })] : []),
      t('vsm.totals.inventory', { value: dur(metrics.inventoryDays, 'd') }),
    ];
const totalsTitle = t('vsm.totals.title');
const totalsW = Math.ceil(Math.max(textW(totalsTitle, F.ctx + 1), ...totalsLines.map((line) => textW(line, F.ctx))) + 28);
const totalsH = 24 + (totalsLines.length + 1) * LH(F.ctx);
const totalsY = timelineBottom + 16;
let viewH = Math.max(meta.viewBox?.[1] || 0, totalsY + totalsH + 22);

// First screen: widen toward ~2:1 but never past the legible width.
const legibleW = Math.floor((930 * F.ctx) / 6.1);
const targetW = Math.min(Math.ceil(viewH * TARGET_ASPECT), Math.max(naturalW, legibleW));
const viewW = Math.max(naturalW, targetW);
const { chainLeft, chainRight } = place(MARGIN + round((viewW - naturalW) / 2));
infoProblems.length = 0;
planFans();

// Top band sanity: boxes must not collide.
const topProblems = [...infoProblems];
for (let index = 1; index < topOrder.length; index += 1) {
  const a = topOrder[index - 1];
  const b = topOrder[index];
  if (a.x + a.w + 24 > b.x) topProblems.push(`Top band is too crowded between "${a.id}" and "${b.id}" — with ${N} block${N === 1 ? '' : 's'} there is no room for ${controls.length} control node${controls.length === 1 ? '' : 's'}; add blocks, drop a control or raise meta.node_width.`);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const channelY = (level) => chTop + level * CH_STEP;
const LABEL_H = F.ctx + 8;
function labelBox(text, cx, cy, extra = 0) {
  const width = Math.ceil(textW(text, F.ctx) + 14 + extra);
  return { x: round(cx - width / 2), y: round(cy - LABEL_H / 2), width, height: LABEL_H };
}

for (const flow of material) {
  let points;
  let label;
  if (flow === materialIn) {
    points = [[flow.topPort, topBottom], [flow.topPort, arrowY], [chain[0].x, arrowY]];
    label = { cx: flow.topPort, cy: round((topBottom + labelBandY - LABEL_H) / 2 + 6) };
  } else if (flow === materialOut) {
    points = [[chain[N - 1].x + procW, arrowY], [flow.topPort, arrowY], [flow.topPort, topBottom]];
    label = { cx: flow.topPort, cy: round((topBottom + labelBandY - LABEL_H) / 2 + 6) };
  } else {
    points = [[flow.fromNode.x + procW, arrowY], [flow.toNode.x, arrowY]];
  }
  edges.push({ flow, points: dedupe(points), label: flow.label && label ? label : undefined, glyphAt: label });
}
for (const flow of topToProcess) {
  const top = topOf(flow);
  const downward = topIndex.has(flow.from);
  const port = flow.topPort;
  const tx = flow.procPort;
  let points = Math.abs(port - tx) < 0.5
    ? [[port, topBottom], [port, procY]]
    : [[port, topBottom], [port, channelY(flow.level)], [tx, channelY(flow.level)], [tx, procY]];
  if (!downward) points = points.slice().reverse();
  edges.push({ flow, points: dedupe(points), label: { cx: tx, cy: labelBandY } });
}
// Top-to-top: side to side at the band's centre; a pair drawn in both
// directions is split ±7px, and non-adjacent pairs go over the top.
const topCy = round(topY + ROOF + (topH - ROOF) / 2);
let overTop = 0;
for (const flow of topToTop) {
  const a = flow.fromNode;
  const b = flow.toNode;
  const reverse = topToTop.some((other) => other.from === flow.to && other.to === flow.from);
  const offset = reverse ? (topIndex.get(a.id) < topIndex.get(b.id) ? -7 : 7) : 0;
  const adjacent = Math.abs(topIndex.get(a.id) - topIndex.get(b.id)) === 1;
  let points;
  let labelAt;
  if (adjacent) {
    const leftToRight = a.cx < b.cx;
    const y = topCy + offset;
    const x1 = leftToRight ? a.x + a.w : a.x;
    const x2 = leftToRight ? b.x : b.x + b.w;
    points = [[x1, y], [x2, y]];
    labelAt = { cx: round((x1 + x2) / 2), cy: y };
    if (flow.label && Math.abs(x2 - x1) < labelBox(flow.label, 0, 0, flow.kind === 'electronic' ? 12 : 0).width + 16) {
      topProblems.push(`Label "${flow.label}" of ${flow.from} → ${flow.to} is wider than the gap between the two boxes — shorten it.`);
    }
  } else {
    overTop += 1;
    if (overTop > 1) topProblems.push(`Only one information flow may skip a top-band neighbour (${flow.from} → ${flow.to}); route it through the control node instead.`);
    const y = topY - 12;
    points = [[a.cx + 12, topY], [a.cx + 12, y], [b.cx - 12, y], [b.cx - 12, topY]];
    labelAt = { cx: round((a.cx + b.cx) / 2), cy: y };
  }
  edges.push({ flow, points: dedupe(points), label: labelAt });
}
if (topProblems.length) throwDiagnosticProblems('VSM layout validation failed', topProblems, { subject: { diagramType: 'vsm' } });
edges.sort((a, b) => a.flow.index - b.flow.index);
for (const edge of edges) {
  edge.d = polylinePath(edge.points);
  if (edge.label) {
    const text = edge.flow.label;
    const extra = edge.flow.kind === 'electronic' ? 12 : edge.flow.kind === 'shipment' ? 24 : 0;
    if (text) edge.labelRect = labelBox(text, edge.label.cx, edge.label.cy, extra);
  }
}

// ---------------------------------------------------------------------------
// Render: nodes
// ---------------------------------------------------------------------------
const labelOf = (node) => node?.label || t('vsm.chain.start');
const wasteText = (node) => (node.waste?.length ? t('vsm.waste.list', { value: node.waste.map((id) => t(`vsm.waste.${id}`)).join(', ') }) : undefined);

function processPassport(node) {
  const index = node.chainIndex + 1;
  let context;
  let tag;
  if (office) {
    context = t('vsm.context.process', { index, count: N, wait: dur(node.waitLt, metrics.units.lt), share: pct(node.ltShare) });
    tag = node.data.slice(0, 3).map((line) => line.text).join(' · ');
  } else {
    context = metrics.taktS
      ? t('vsm.context.processMfg', { index, count: N, ct: dur(node.ct_s, 's'), takt: dur(metrics.taktS, 's') })
      : t('vsm.context.processPlain', { index, count: N });
    tag = node.data.slice(0, 3).map((line) => line.text).join(' · ');
  }
  return { kind: 'vsm-process', sublabel: [node.role, node.description].filter(Boolean).join(' — ') || undefined, tag, context };
}

function renderProcess(node) {
  const slot = VSM_KIND_PALETTE['vsm-process'];
  const passport = processPassport(node);
  const labelBlock = node.labelLines.length * LH(F.label);
  const roleBlock = node.roleLines.length * LH(F.ctx);
  const top = procY + (procH - labelBlock - roleBlock) / 2;
  const label = renderLines(node.labelLines, { x: node.cx, y: top + labelBlock / 2 + F.label * 0.35, fontSize: F.label, lineHeight: LH(F.label), weight: 700, attrs: 'data-node-label=""' });
  const role = node.roleLines.length
    ? `\n          ${renderLines(node.roleLines, { x: node.cx, y: top + labelBlock + roleBlock / 2 + F.ctx * 0.35, fontSize: F.ctx, lineHeight: LH(F.ctx), className: 't-muted', attrs: 'data-detail="context"' })}`
    : '';
  const data = node.data.map((line, index) => `<text data-detail="context" x="${round(node.x + 8)}" y="${round(dataTop + 6 + (index + 0.72) * LH(F.ctx))}" class="${line.alert ? 't-security' : 't-primary'}" font-size="${F.ctx}"${line.alert ? ' font-weight="700"' : ''}>${esc(line.text)}</text>`).join('\n          ');
  const stroke = node.pacemaker ? 2.8 : 1.6;
  return `        <g ${focusNodeAttrs(node.id, node.label, passport, locale)}>
          ${focusNodeTitle(node.label, passport)}
          <rect x="${node.x}" y="${procY}" width="${procW}" height="${round(procH + dataH)}" rx="4" class="c-mask"/>
          <rect x="${node.x}" y="${procY}" width="${procW}" height="${procH}" rx="4" class="c-${slot}"${animateAttr(meta, 'node', node.chainIndex + 1)} stroke-width="${stroke}"/>
          <rect x="${node.x}" y="${dataTop}" width="${procW}" height="${dataH}" rx="2" class="c-external" stroke-width="1"/>
          ${label}${role}
          ${data}
        </g>`;
}

function renderTop(node) {
  const kind = kindOf(node);
  const slot = VSM_KIND_PALETTE[kind];
  const context = t(`vsm.context.${node.kind}`);
  const passport = {
    kind,
    sublabel: [node.role, node.description].filter(Boolean).join(' — ') || undefined,
    tag: node.delivery || (node.kind === 'customer' ? demandText() : undefined) || undefined,
    context,
  };
  const factory = node.kind !== 'control';
  const bodyTop = topY + (factory ? ROOF : 0);
  const shape = factory
    ? `<path d="${factoryPath(node.x, topY, node.w, topH, ROOF)}" class="c-mask"/>
          <path d="${factoryPath(node.x, topY, node.w, topH, ROOF)}" class="c-${slot}"${animateAttr(meta, 'node', 0)} stroke-width="1.6" stroke-linejoin="round"/>`
    : `<rect x="${node.x}" y="${topY}" width="${node.w}" height="${topH}" rx="6" class="c-mask"/>
          <rect x="${node.x}" y="${topY}" width="${node.w}" height="${topH}" rx="6" class="c-${slot}"${animateAttr(meta, 'node', 0)} stroke-width="1.6"/>`;
  const labelBlock = node.labelLines.length * LH(F.label);
  const subBlock = node.subLines.length * LH(F.ctx);
  const start = bodyTop + (topY + topH - bodyTop - labelBlock - subBlock) / 2;
  const label = renderLines(node.labelLines, { x: node.cx, y: start + labelBlock / 2 + F.label * 0.35, fontSize: F.label, lineHeight: LH(F.label), weight: 700, attrs: 'data-node-label=""' });
  const sub = node.subLines.length
    ? `\n          ${renderLines(node.subLines, { x: node.cx, y: start + labelBlock + subBlock / 2 + F.ctx * 0.35, fontSize: F.ctx, lineHeight: LH(F.ctx), className: 't-muted', attrs: 'data-detail="context"' })}`
    : '';
  return `        <g ${focusNodeAttrs(node.id, node.label, passport, locale)}>
          ${focusNodeTitle(node.label, passport)}
          ${shape}
          ${label}${sub}
        </g>`;
}

function bufferGlyph(buffer, cx, slot) {
  if (buffer.kind === 'supermarket') {
    return `<rect x="${round(cx - 17)}" y="${glyphTop - 1}" width="34" height="30" class="c-mask"/>
          <path d="${supermarketPath(cx, glyphTop)}" class="c-${slot}"${animateAttr(meta, 'node', buffer.gap.index + 1)} stroke-width="1.8"/>`;
  }
  if (buffer.kind === 'fifo') {
    return `<rect x="${round(cx - 26)}" y="${glyphTop + 4}" width="52" height="20" class="c-mask"/>
          <rect x="${round(cx - 26)}" y="${glyphTop + 4}" width="52" height="20" rx="2" class="c-${slot}"${animateAttr(meta, 'node', buffer.gap.index + 1)} stroke-width="1.4"/>
          <text x="${cx}" y="${round(glyphTop + 18)}" class="t-messagebus" font-size="10" font-weight="700" text-anchor="middle" aria-hidden="true">FIFO →</text>`;
  }
  return `<polygon points="${trianglePoints(cx, glyphTop)}" class="c-mask"/>
          <polygon points="${trianglePoints(cx, glyphTop)}" class="c-${slot}"${animateAttr(meta, 'node', buffer.gap.index + 1)} stroke-width="1.6" stroke-linejoin="round"/>
          <text x="${cx}" y="${round(glyphTop + 24)}" class="t-${slot}" font-size="12" font-weight="800" text-anchor="middle" aria-hidden="true">I</text>`;
}

function renderBuffer(buffer) {
  const kind = kindOf(buffer);
  const slot = VSM_KIND_PALETTE[kind];
  const cx = buffer.gap.cx;
  const from = labelOf(buffer.gap.upstream);
  const to = labelOf(buffer.gap.downstream);
  const owner = buffer.owner ? byId.get(buffer.owner).label : undefined;
  const passport = {
    kind,
    sublabel: [buffer.description, owner ? `${t('viewer.kind.vsm-process')}: ${owner}` : ''].filter(Boolean).join(' — ') || undefined,
    tag: buffer.metricLines.join(' · ') || undefined,
    context: !office && metrics.leadDays > 0 ? t('vsm.context.bufferShare', { from, to, share: pct(buffer.leadShare) }) : t('vsm.context.buffer', { from, to }),
  };
  let y = glyphTop + 28 + 6 + F.small;
  const label = buffer.labelLines.map((line) => {
    const text = `<text data-node-label="" x="${cx}" y="${round(y)}" class="t-primary" font-size="${F.small}" font-weight="600" text-anchor="middle">${esc(line)}</text>`;
    y += LH(F.small);
    return text;
  }).join('\n          ');
  const metricsText = buffer.metricLines.map((line) => {
    const text = `<text data-detail="context" x="${cx}" y="${round(y)}" class="t-muted" font-size="${F.ctx}" text-anchor="middle">${esc(line)}</text>`;
    y += LH(F.ctx);
    return text;
  }).join('\n          ');
  return `        <g ${focusNodeAttrs(buffer.id, buffer.label, passport, locale)}>
          ${focusNodeTitle(buffer.label, passport)}
          ${bufferGlyph(buffer, cx, slot)}
          ${label}
          ${metricsText}
        </g>`;
}

function renderKaizens() {
  const perTarget = new Map();
  return kaizens.map((kaizen) => {
    const target = byId.get(kaizen.target);
    const slotIndex = perTarget.get(target.id) || 0;
    perTarget.set(target.id, slotIndex + 1);
    const cx = target.kind === 'process' ? target.x + procW - 16 - slotIndex * 36 : target.gap.cx + 34 + slotIndex * 8;
    const cy = target.kind === 'process' ? dataTop : glyphTop + 12 + slotIndex * 30;
    const passport = {
      kind: 'vsm-kaizen',
      sublabel: kaizen.description || undefined,
      tag: wasteText(kaizen),
      context: t('vsm.context.kaizen', { target: target.label }),
    };
    return `        <g ${focusNodeAttrs(kaizen.id, kaizen.label, passport, locale)}>
          ${focusNodeTitle(`${kaizen.code} ${kaizen.label}`, passport)}
          <polygon points="${starPoints(cx, cy, 19, 12.5)}" class="c-mask"/>
          <polygon points="${starPoints(cx, cy, 19, 12.5)}" class="c-${VSM_KIND_PALETTE['vsm-kaizen']}"${animateAttr(meta, 'node', N + 2)} stroke-width="1.5" stroke-linejoin="round"/>
          <text data-node-label="" x="${round(cx)}" y="${round(cy + F.ctx * 0.35)}" class="t-security" font-size="${F.ctx}" font-weight="800" text-anchor="middle">${esc(kaizen.code)}</text>
        </g>`;
  }).join('\n\n');
}

// ---------------------------------------------------------------------------
// Render: flows
// ---------------------------------------------------------------------------
function midOfLongest(points) {
  let best = { length: -1 };
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index - 1];
    const [x2, y2] = points[index];
    const length = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (length > best.length) best = { length, x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  return best;
}

function pullBack(points, distance) {
  const out = points.map((point) => point.slice());
  const last = out.at(-1);
  const prev = out.at(-2);
  const length = Math.abs(last[0] - prev[0]) + Math.abs(last[1] - prev[1]);
  if (length > distance) {
    last[0] -= Math.sign(last[0] - prev[0]) * distance;
    last[1] -= Math.sign(last[1] - prev[1]) * distance;
  }
  return out;
}

function renderEdge(edge, order) {
  const { flow } = edge;
  const isInfo = flow.channel === 'info';
  const electronic = flow.kind === 'electronic';
  const cls = isInfo && electronic ? 'a-emphasis' : 'a-default';
  const marker = flow.kind === 'push' ? 'vsm-push-head' : electronic ? 'arrowhead-emphasis' : 'arrowhead';
  const width = isInfo ? (electronic ? 1.5 : 1.3) : 1.6;
  const parts = [];
  if (flow.kind === 'push') {
    parts.push(`<path d="${polylinePath(pullBack(edge.points, 12))}" fill="none" stroke="url(#vsm-hatch)" stroke-width="10" aria-hidden="true"/>`);
  }
  parts.push(`<path ${focusEdgeAttrs(flow.from, flow.to, flow.label, flow.index, flow.id)} data-composition-points="${edge.points.map((point) => point.join(',')).join(';')}" d="${edge.d}" class="${cls}"${animateAttr(meta, 'edge', order)} stroke-width="${width}" fill="none" marker-end="url(#${marker})"/>`);
  const mid = midOfLongest(edge.points);
  if (['pull', 'withdrawal'].includes(flow.kind)) {
    const segment = flow === materialOut ? { x: (edge.points[0][0] + edge.points[1][0]) / 2, y: arrowY } : mid;
    parts.push(pullGlyph(segment.x, segment.y));
  }
  if (flow.kind === 'fifo' && !gaps.some((gap) => gap.flow === flow && gap.buffer)) {
    parts.push(`<text x="${round(mid.x)}" y="${round(mid.y - 7)}" class="t-messagebus" font-size="10" font-weight="700" text-anchor="middle" aria-hidden="true">FIFO</text>`);
  }
  if (edge.labelRect) {
    const rect = edge.labelRect;
    const icon = electronic ? 12 : flow.kind === 'shipment' ? 24 : 0;
    const glyph = electronic
      ? lightning(rect.x + 10, rect.y + rect.height / 2, 5)
      : flow.kind === 'shipment' ? truck(rect.x + 5, rect.y + rect.height / 2 - 5.5) : '';
    parts.push(`<g data-detail="context" ${focusEdgeAttrs(flow.from, flow.to, flow.label, flow.index, flow.id)}>
            <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="4" class="c-mask"/>
            ${glyph}
            <text x="${round(rect.x + icon + (rect.width - icon) / 2)}" y="${round(rect.y + rect.height / 2 + F.ctx * 0.35)}" class="t-muted" font-size="${F.ctx}" text-anchor="middle">${esc(flow.label)}</text>
          </g>`);
  } else if (electronic || flow.kind === 'shipment') {
    const at = edge.glyphAt || mid;
    parts.push(`<g aria-hidden="true"><rect x="${round(at.x ?? at.cx) - 12}" y="${round(at.y ?? at.cy) - 9}" width="24" height="18" rx="4" class="c-mask"/>${electronic ? lightning(at.x ?? at.cx, at.y ?? at.cy, 5) : truck((at.x ?? at.cx) - 10, (at.y ?? at.cy) - 5.5)}</g>`);
  }
  return `        ${parts.join('\n        ')}`;
}

// ---------------------------------------------------------------------------
// Render: timeline, totals, header, legend
// ---------------------------------------------------------------------------
function timelineSteps() {
  const steps = [];
  gaps.forEach((gap, index) => {
    if (office) {
      if (index < N) steps.push({ x1: gap.x, x2: gap.x + gapW, up: true, text: t('vsm.data.lt', { value: dur(chain[index].lt, metrics.units.lt) }) });
    } else if (gap.buffer && gap.buffer.days > 0) {
      steps.push({ x1: gap.x, x2: gap.x + gapW, up: true, text: `${num(gap.buffer.days)} d` });
    } else if (index > 0 && index < N) {
      steps.push({ x1: gap.x, x2: gap.x + gapW, up: false });
    }
    if (index < N) {
      const node = chain[index];
      steps.push({ x1: node.x, x2: node.x + procW, up: false, text: office ? t('vsm.data.pt', { value: dur(node.pt, metrics.units.pt) }) : t('vsm.data.ct', { value: dur(node.ct_s, 's') }), alert: node.overTakt });
    }
  });
  return steps;
}

function renderTimeline() {
  const steps = timelineSteps();
  const points = [];
  for (const step of steps) {
    const y = step.up ? yUp : yDown;
    points.push([step.x1, y], [step.x2, y]);
  }
  const d = polylinePath(dedupe(points));
  const labels = steps.filter((step) => step.text).map((step) => {
    const y = step.up ? yUp - 7 : yDown + F.ctx + 4;
    return `<text data-detail="context" x="${round((step.x1 + step.x2) / 2)}" y="${round(y)}" class="${step.alert ? 't-security' : step.up ? 't-cloud' : 't-backend'}" font-size="${F.ctx}" font-weight="600" text-anchor="middle">${esc(step.text)}</text>`;
  });
  return `        <g aria-hidden="true">
          <path d="${d}" class="a-default" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
          ${labels.join('\n          ')}
        </g>`;
}

function renderTotals() {
  const x = chainRight - totalsW;
  const lines = totalsLines.map((line, index) => `<text data-detail="context" x="${round(x + 14)}" y="${round(totalsY + 14 + (index + 2) * LH(F.ctx))}" class="t-primary" font-size="${F.ctx}">${esc(line)}</text>`);
  return `        <g aria-hidden="true">
          <rect x="${round(x)}" y="${round(totalsY)}" width="${totalsW}" height="${round(totalsH)}" rx="6" class="c-mask"/>
          <rect x="${round(x)}" y="${round(totalsY)}" width="${totalsW}" height="${round(totalsH)}" rx="6" class="c-backend" stroke-width="1.4"/>
          <text data-detail="context" x="${round(x + 14)}" y="${round(totalsY + 10 + LH(F.ctx))}" class="t-backend" font-size="${F.ctx + 1}" font-weight="700">${esc(totalsTitle)}</text>
          ${lines.join('\n          ')}
        </g>`;
}

function renderHeader() {
  const parts = [t('vsm.header', { state: t(`vsm.state.${metrics.state}`).toUpperCase(), stream: meta.value_stream || meta.title })];
  if (meta.demand) parts.push(t('vsm.header.demand', { value: demandText() }));
  if (meta.champion) parts.push(t('vsm.header.champion', { value: meta.champion }));
  if (meta.date) parts.push(meta.date);
  return `        <text data-detail="context" x="${chainLeft}" y="${stripY}" class="t-dim" font-size="${F.ctx}" font-weight="600">${esc(parts.join(' · '))}</text>`;
}

const FLOW_LEGEND = { push: 'push-flow', pull: 'pull-flow', withdrawal: 'pull-flow', fifo: 'fifo-flow', shipment: 'shipment-flow', manual: 'manual-info', electronic: 'electronic-info' };
const LEGEND_CATALOG = [
  'vsm-supplier', 'vsm-customer', 'vsm-control', 'vsm-process', 'vsm-inventory', 'vsm-queue', 'vsm-supermarket', 'vsm-fifo', 'vsm-kaizen',
].map((kind) => ({ kind, label: t(`legend.vsm.${kind}`) }))
  .concat(['push-flow', 'pull-flow', 'fifo-flow', 'shipment-flow', 'manual-info', 'electronic-info'].map((kind) => ({ kind, label: t(`legend.vsm.${kind}`), interactive: false, swatchWidth: 20 })));

function legendSwatch(entry) {
  const { x, baseline: b } = entry;
  const y = b - 4;
  switch (entry.kind) {
    case 'vsm-supplier':
    case 'vsm-customer': return `<path d="${factoryPath(x, b - 11, 14, 12, 4)}" class="c-external" stroke-width="1"/>`;
    case 'vsm-control': return `<rect x="${x}" y="${b - 9}" width="14" height="10" rx="2" class="c-database" stroke-width="1"/>`;
    case 'vsm-process': return `<rect x="${x}" y="${b - 9}" width="14" height="10" rx="1" class="c-backend" stroke-width="1"/>`;
    case 'vsm-inventory':
    case 'vsm-queue': return `<polygon points="${trianglePoints(x + 7, b - 11, 7, 12)}" class="c-cloud" stroke-width="1"/>`;
    case 'vsm-supermarket': return `<path d="${supermarketPath(x + 7, b - 10, 7, 11)}" class="c-messagebus" stroke-width="1"/>`;
    case 'vsm-fifo': return `<rect x="${x}" y="${b - 8}" width="14" height="8" class="c-messagebus" stroke-width="1"/>`;
    case 'vsm-kaizen': return `<polygon points="${starPoints(x + 7, y, 7, 4.5)}" class="c-security" stroke-width="1"/>`;
    case 'push-flow': return `<path d="M ${x} ${y} H ${x + 14}" stroke="url(#vsm-hatch)" stroke-width="7" fill="none"/><polygon points="${x + 13},${y - 5} ${x + 20},${y} ${x + 13},${y + 5}" class="m-default"/>`;
    case 'pull-flow': return `<path d="M ${x} ${y} H ${x + 20}" class="a-default" stroke-width="1.4"/><circle cx="${x + 10}" cy="${y}" r="4" class="c-mask"/><circle cx="${x + 10}" cy="${y}" r="3.5" class="a-default" stroke-width="1.2"/>`;
    case 'fifo-flow': return `<rect x="${x}" y="${y - 4}" width="20" height="8" class="c-messagebus" stroke-width="1"/>`;
    case 'shipment-flow': return truck(x, y - 6);
    case 'manual-info': return `<path d="M ${x} ${y} H ${x + 18}" class="a-default" stroke-width="1.3"/><polygon points="${x + 16},${y - 3} ${x + 20},${y} ${x + 16},${y + 3}" class="m-default"/>`;
    default: return `<path d="M ${x} ${y} H ${x + 18}" class="a-emphasis" stroke-width="1.3"/>${lightning(x + 9, y, 4)}`;
  }
}

function renderLegend() {
  const present = new Set([...model.nodes.map(kindOf), ...vsm.flows.map((flow) => FLOW_LEGEND[flow.kind])]);
  const entries = resolveLegend(meta.legend, LEGEND_CATALOG, present);
  return renderResolvedLegend({
    entries,
    locale,
    layout: {
      x: chainLeft,
      baselineY: viewH - 26,
      width: Math.max(200, chainRight - totalsW - chainLeft - 32),
      minTitleY: totalsY,
      unfit: meta.legend === undefined ? 'hide' : 'error',
      diagramType: 'vsm',
    },
    renderSwatch: legendSwatch,
  });
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
function summaryCards() {
  const cards = [];
  if (meta.summary !== false) {
    const head = [t('vsm.summary.state', { state: t(`vsm.state.${metrics.state}`), variant: t(`vsm.variant.${metrics.variant}`) })];
    if (meta.champion) head.push(t('vsm.summary.champion', { value: meta.champion }));
    const items = [head.join(' · ')];
    const demand = [];
    if (meta.demand && metrics.dailyDemand) demand.push(t('vsm.summary.demand', { value: demandText(), daily: num(metrics.dailyDemand) }));
    if (metrics.taktS) demand.push(t('vsm.totals.takt', { value: seconds(metrics.taktS) }));
    if (demand.length) items.push(demand.join(' · '));
    const totals = totalsLines.filter((line) => !metrics.taktS || line !== t('vsm.totals.takt', { value: dur(metrics.taktS, 's') }));
    for (let index = 0; index < totals.length; index += 2) items.push(totals.slice(index, index + 2).join(' · '));
    if (office) {
      const longest = chain.reduce((best, node) => (node.waitLt > best.waitLt ? node : best));
      items.push(t('vsm.summary.longestWait', { label: longest.label, value: dur(longest.waitLt, metrics.units.lt) }));
      if (Number.isFinite(metrics.rolledCa)) {
        const lowest = chain.reduce((best, node) => (node.pct_ca < best.pct_ca ? node : best));
        items.push(t('vsm.summary.lowestCa', { label: lowest.label, value: `${num(lowest.pct_ca)}%` }));
      }
    } else {
      const hotspots = [];
      const slowest = chain.reduce((best, node) => (node.ct_s > best.ct_s ? node : best));
      if (metrics.taktS) hotspots.push(t('vsm.summary.longestCt', { label: slowest.label, value: dur(slowest.ct_s, 's'), takt: dur(metrics.taktS, 's') }));
      const stocked = buffers.filter((buffer) => buffer.days > 0);
      if (stocked.length) {
        const largest = stocked.reduce((best, buffer) => (buffer.days > best.days ? buffer : best));
        hotspots.push(t('vsm.summary.largestStock', { label: largest.label, value: dur(largest.days, 'd') }));
      }
      if (hotspots.length) items.push(hotspots.join(' · '));
    }
    cards.push({ dot: 'emerald', title: t('vsm.summary.title'), items });
  }
  if (kaizens.length) {
    cards.push({
      dot: 'rose',
      title: t('vsm.kaizen.title'),
      items: kaizens.map((kaizen) => t('vsm.kaizen.item', { code: kaizen.code, label: kaizen.label, target: byId.get(kaizen.target).label })),
    });
  }
  return [...(vsm.cards || []), ...cards];
}

function renderSvg() {
  return `      <svg viewBox="0 0 ${round(viewW)} ${round(viewH)}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'vsm')}
${renderDefinitions()}
${vsmDefinitions()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Title block -->
${renderHeader()}

        <!-- Timeline ladder and totals -->
${renderTimeline()}
${renderTotals()}

        <!-- Work and information flows -->
${edges.map(renderEdge).join('\n')}

        <!-- Top band: supplier, control, customer -->
${topNodes.map(renderTop).join('\n\n')}

        <!-- Process blocks with data boxes -->
${chain.map(renderProcess).join('\n\n')}

        <!-- Buffers between blocks -->
${buffers.map(renderBuffer).join('\n\n')}

        <!-- Kaizen bursts -->
${renderKaizens()}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({
  outPath,
  template,
  diagramType: 'vsm',
  meta,
  svg: renderSvg(),
  cards: summaryCards(),
});
