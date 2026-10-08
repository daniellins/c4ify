// Layout for BPMN: pools stacked top to bottom, lanes as horizontal bands in
// authored order, columns and rows from ./grid.mjs. Geometry is derived from
// content: column widths from the widest node, gaps widen only where a flow
// label needs room, rows fit their tallest node plus any loop channels. The
// font is searched so the smallest label stays legible on a 1440 px screen,
// and every flow picks the route candidate with the lowest defect score
// (collisions, crossings, shared corridors, cramped turns, shared ports).

import { DESKTOP_READER_DIAGRAM_WIDTH, minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { round, unitsFor, wrapText } from '../shared/business.mjs';
import { textUnits } from '../shared/utils.mjs';
import { BOUNDARY_R, DATA_OBJECT, DATA_STORE, EVENT_R, GATEWAY_R } from './shapes.mjs';
import { isActivity } from './rules.mjs';
import { assignColumns, assignRanks, assignRows, flowCandidates } from './grid.mjs';
import { placeFlowLabels, routeFlows, scoreLayout } from './routing.mjs';

export const L = {
  margin: 20,
  top: 16,
  padX: 14,
  colGap: 22,
  rowPad: 12,
  legendBand: 58,
  annotationW: 132,
  channel: 16,
  emptyRow: 36,
};
// The viewer fits the SVG into the first screen: at 1440x900 the diagram
// gets about 1350 px of width and 540 px of height once the header, guided
// views and summary card are placed. Projected text = font x the smaller of
// the two scales; the target keeps the smallest label >= 8 px there.
const SCREEN = { w: 1350, h: 540 };
const TARGET_PROJECTED = 8.4;
// Narrower than this the adaptive reader cannot widen to fit the first
// screen and the page scrolls: open the gaps instead.
const MIN_ASPECT = 1.9;
const FONTS = [11, 11.5, 12, 12.5, 13, 13.5, 14];
const SEARCH_FONT = 12.5;
const MAX_LABEL_RETRIES = 4;

export const measure = (text, font) => textUnits(text) * font * 0.6;
const shapeW = (node) => (node.kind === 'event' ? EVENT_R * 2 : node.kind === 'gateway' ? GATEWAY_R * 2 : node.kind === 'data-store' ? DATA_STORE.w : DATA_OBJECT.w);
const shapeH = (node) => (node.kind === 'event' ? EVENT_R * 2 : node.kind === 'gateway' ? GATEWAY_R * 2 : node.kind === 'data-store' ? DATA_STORE.h : DATA_OBJECT.h);

// Narrowest wrap with at most `maxLines` lines; two lines win when they cost
// at most three extra characters of width.
function tightWrap(text, maxLines, minUnits = 6, maxUnits = 40) {
  let best3 = null;
  let best2 = null;
  for (let units = minUnits; units <= maxUnits; units += 1) {
    const wrapped = wrapText(text, units, maxLines);
    if (wrapped.overflow) continue;
    const width = Math.max(...wrapped.lines.map((line) => textUnits(line)));
    if (!best3) best3 = { units: Math.max(units, width), lines: wrapped.lines };
    if (wrapped.lines.length <= 2 && !best2) best2 = { units: Math.max(units, width), lines: wrapped.lines };
    if (best2) break;
  }
  if (!best3) return null;
  return best2 && best2.units - best3.units <= 3 ? best2 : best3;
}

// ---------------------------------------------------------------------------
// Geometry for one font and one choice of route candidates.
// ---------------------------------------------------------------------------
function geometry(model, plans, font, extra) {
  const hard = [];
  const { nodes, pools, meta } = model;
  const lh = round(font * 1.25);
  const head = Math.ceil(lh * 2 + 8);
  const gapPx = (col) => L.colGap + (extra.gap.get(col) || 0) + (col >= 1 ? extra.widen : 0);

  const used = new Map(nodes.map((node) => [node.id, new Map()]));
  const touch = (id, side, dir) => {
    const sides = used.get(id);
    sides.set(side, [...(sides.get(side) || []), dir]);
  };
  for (const [flow, plan] of plans) {
    if (plan.kind === 'message') continue;
    if (flow.fromNode) touch(flow.from, plan.exit, 'out');
    if (flow.toNode) touch(flow.to, plan.entry, 'in');
  }
  for (const [flow, plan] of plans) {
    if (plan.kind !== 'message') continue;
    if (flow.fromNode) touch(flow.from, plan.exit, 'msg');
    if (flow.toNode) touch(flow.to, plan.entry, 'msg');
  }

  // Activity width: the narrowest box that holds every activity label in
  // three lines (meta.task_width is a floor).
  let taskUnits = 9;
  for (const node of nodes.filter(isActivity)) {
    const fit = tightWrap(node.label, 3, 6);
    if (!fit) hard.push(`Label "${node.label}" of "${node.id}" does not fit three lines — shorten it.`);
    else taskUnits = Math.max(taskUnits, fit.units);
  }
  const taskW = Math.max(meta.task_width || 0, Math.ceil(taskUnits * font * 0.6 + 16));

  let taskH = 56;
  for (const node of nodes) {
    node.labelSide = undefined;
    node.labelRect = undefined;
    if (!node.label) { node.lines = []; node.labelW = 0; continue; }
    if (isActivity(node)) {
      const wrapped = wrapText(node.label, unitsFor(taskW, font, 14), 3);
      if (wrapped.overflow) hard.push(`Label "${node.label}" of "${node.id}" does not fit three lines in a ${taskW}px activity — shorten it.`);
      node.lines = wrapped.lines;
      const bottom = node.kind !== 'task' || node.marker ? 18 : 8;
      const topPad = node.kind === 'task' && node.taskType !== 'none' ? 16 : 8;
      taskH = Math.max(taskH, Math.ceil(topPad + node.lines.length * lh + bottom + 4));
    } else if (node.kind === 'annotation') {
      const wrapped = wrapText(node.label, unitsFor(L.annotationW, font, 12), 4);
      if (wrapped.overflow) hard.push(`Annotation "${node.id}" is longer than four lines — shorten it.`);
      node.lines = wrapped.lines;
    } else if (node.isBoundary) {
      const width = taskW + L.colGap / 2 - (24 + BOUNDARY_R + 4);
      const wrapped = wrapText(node.label, unitsFor(width, font, 2), 2);
      if (wrapped.overflow) hard.push(`Boundary label "${node.label}" of "${node.id}" does not fit two lines under its activity — shorten it ("4 h elapsed").`);
      node.lines = wrapped.lines;
    } else {
      const fit = tightWrap(node.label, 3, 6, 18);
      if (!fit) hard.push(`Label "${node.label}" of "${node.id}" does not fit three lines of 18 characters — shorten it.`);
      node.lines = fit ? fit.lines : [node.label];
    }
    node.labelW = Math.ceil(Math.max(0, ...node.lines.map((line) => measure(line, font))) + 4);
  }
  if (hard.length) return { hard };

  // Vertical extents around each node's centre line.
  const hostDown = new Map();
  for (const node of nodes.filter((item) => item.isBoundary)) {
    const need = taskH / 2 + Math.max(BOUNDARY_R + 2, 6 + node.lines.length * lh);
    hostDown.set(node.attachedTo, Math.max(hostDown.get(node.attachedTo) || 0, need));
  }
  const soft = [];
  for (const node of nodes.filter((item) => !item.isBoundary)) {
    const sides = used.get(node.id);
    const labelH = node.lines.length * lh;
    if (isActivity(node)) {
      node.up = taskH / 2;
      node.down = Math.max(taskH / 2, hostDown.get(node.id) || 0);
      continue;
    }
    if (node.kind === 'annotation') {
      node.boxH = labelH + 12;
      node.up = node.boxH / 2;
      node.down = node.boxH / 2;
      continue;
    }
    node.up = shapeH(node) / 2;
    node.down = shapeH(node) / 2;
    if (!labelH) continue;
    const order = node.kind === 'gateway' ? ['above', 'below'] : ['below', 'above'];
    node.labelSide = order.find((side) => !sides.has(side === 'above' ? 'top' : 'bottom'));
    if (!node.labelSide) {
      soft.push({ weight: 1000, text: `"${node.id}" has flows on its top and bottom, leaving no room for its label — move a neighbour to another row or column.` });
      node.labelSide = order[0];
    }
    if (node.labelSide === 'above') node.up += 6 + labelH;
    else node.down += 6 + labelH;
  }

  // Columns: widest footprint; a side label may spill into half of each gap.
  const maxCol = Math.max(1, ...nodes.map((node) => node.colValue || 1));
  const colW = Array(maxCol + 1).fill(0);
  for (const node of nodes) {
    if (node.isBoundary) continue;
    let width;
    if (isActivity(node)) width = taskW;
    else if (node.kind === 'annotation') width = L.annotationW;
    else width = Math.max(shapeW(node), node.labelW - (gapPx(node.colValue - 1) + gapPx(node.colValue)) / 2 + 8);
    colW[node.colValue] = Math.max(colW[node.colValue], width);
  }

  // Rows and channels.
  const rowKey = (laneId, row) => `${laneId}|${row}`;
  const rows = new Map();
  for (const node of nodes.filter((item) => !item.isBoundary && item.lane)) {
    const key = rowKey(node.lane, node.rowValue);
    const row = rows.get(key) || { up: 0, down: 0, above: [], below: [] };
    row.up = Math.max(row.up, node.up + (extra.rowUp.get(key) || 0));
    row.down = Math.max(row.down, node.down + (extra.rowDown.get(key) || 0));
    rows.set(key, row);
  }
  for (const [flow, plan] of plans) {
    if (plan.mode !== 'channel') continue;
    const row = rows.get(rowKey(plan.channelNode.lane, plan.channelNode.rowValue));
    row[plan.side].push(flow);
  }
  const span = (flow) => Math.abs(flow.fromNode.colValue - flow.toNode.colValue);
  const channelY = new Map();

  let y = L.top;
  const blackBoxH = Math.ceil(lh + 20);
  const poolGap = Math.ceil(font + 7 + 18);
  for (const pool of pools) {
    pool.y = y;
    if (pool.blackBox) {
      pool.h = blackBoxH;
      y += pool.h + poolGap;
      continue;
    }
    for (const lane of pool.lanes) {
      lane.y = y;
      const laneNodes = nodes.filter((node) => node.lane === lane.id && !node.isBoundary);
      const maxRow = Math.max(0, ...laneNodes.map((node) => node.rowValue));
      const items = [];
      let height = 0;
      for (let index = 0; index <= maxRow; index += 1) {
        const row = rows.get(rowKey(lane.id, index));
        if (!row) { items.push({ top: height, h: L.emptyRow }); height += L.emptyRow; continue; }
        const aboveH = row.above.length ? row.above.length * L.channel + 4 : 0;
        const belowH = row.below.length ? row.below.length * L.channel + 4 : 0;
        const h = L.rowPad * 2 + aboveH + row.up + row.down + belowH;
        items.push({ row, top: height, h, aboveH });
        height += h;
      }
      if (lane.label) {
        let fits = wrapText(lane.label, unitsFor(height, font, 14), 2);
        while (fits.overflow && height < 480) {
          height += 8;
          fits = wrapText(lane.label, unitsFor(height, font, 14), 2);
        }
        lane.lines = fits.lines;
      } else lane.lines = [];
      const slack = (height - items.reduce((sum, item) => sum + item.h, 0)) / 2;
      for (const item of items) {
        if (!item.row) continue;
        const row = item.row;
        row.center = y + slack + item.top + L.rowPad + item.aboveH + row.up;
        [...row.above].sort((p, q) => span(p) - span(q)).forEach((flow, slot) => channelY.set(flow, round(row.center - row.up - 4 - L.channel * (slot + 0.5))));
        [...row.below].sort((p, q) => span(p) - span(q)).forEach((flow, slot) => channelY.set(flow, round(row.center + row.down + 4 + L.channel * (slot + 0.5))));
      }
      lane.h = height;
      y += height;
    }
    pool.h = y - pool.y;
    const poolFit = wrapText(pool.label, unitsFor(pool.h, font, 14), 2);
    if (poolFit.overflow) hard.push(`Pool label "${pool.label}" does not fit its ${Math.round(pool.h)}px band — shorten it.`);
    pool.lines = poolFit.lines;
    y += poolGap;
  }
  if (hard.length) return { hard };
  const viewH = Math.max(y - poolGap + L.legendBand, meta.viewBox?.[1] || 0);

  // x positions.
  const contentLeft = L.margin + head * 2;
  const colLeft = Array(maxCol + 2).fill(0);
  colLeft[1] = contentLeft + L.padX + extra.widen / 2;
  for (let col = 2; col <= maxCol; col += 1) colLeft[col] = colLeft[col - 1] + colW[col - 1] + gapPx(col - 1);
  const contentRight = colLeft[maxCol] + colW[maxCol] + L.padX + extra.widen / 2;
  const viewW = Math.max(contentRight + L.margin, meta.viewBox?.[0] || 0, 640);
  const center = (col) => round(colLeft[col] + colW[col] / 2);
  const poolW = round(viewW - L.margin * 2);
  for (const pool of pools) {
    Object.assign(pool, { x: L.margin, w: poolW });
    for (const lane of pool.lanes) Object.assign(lane, { x: L.margin + head, w: poolW - head });
  }

  for (const node of nodes.filter((item) => !item.isBoundary)) {
    const row = rows.get(rowKey(node.lane, node.rowValue));
    node.cx = center(node.colValue);
    node.cy = round(row.center);
    node.rowInfo = row;
    let w;
    let h;
    if (isActivity(node)) [w, h] = [taskW, taskH];
    else if (node.kind === 'annotation') [w, h] = [L.annotationW, node.boxH];
    else [w, h] = [shapeW(node), shapeH(node)];
    node.box = { x: round(node.cx - w / 2), y: round(node.cy - h / 2), width: w, height: h };
  }
  for (const [hostId, boundaries] of model.boundariesOf) {
    const host = model.nodeById.get(hostId);
    boundaries.forEach((node, index) => {
      node.cx = round(host.box.x + 24 + index * 34);
      node.cy = round(host.box.y + host.box.height);
      node.rowInfo = host.rowInfo;
      node.box = { x: node.cx - BOUNDARY_R, y: node.cy - BOUNDARY_R, width: BOUNDARY_R * 2, height: BOUNDARY_R * 2 };
    });
  }
  for (const node of nodes) {
    if (!node.lines.length || isActivity(node)) continue;
    const h = node.lines.length * lh;
    if (node.isBoundary) {
      node.labelRect = { x: node.cx + BOUNDARY_R + 4, y: node.box.y + node.box.height - BOUNDARY_R + 4, width: node.labelW, height: h };
    } else if (node.kind === 'annotation') {
      node.labelRect = { ...node.box };
    } else {
      const top = node.labelSide === 'above' ? node.box.y - 6 - h : node.box.y + node.box.height + 6;
      node.labelRect = { x: round(node.cx - node.labelW / 2), y: round(top), width: node.labelW, height: h };
    }
  }

  const ctx = { model, plans, used, channelY, colLeft, colW, gapPx, font, lh, poolGap };
  const routes = routeFlows(ctx);
  const { labels, missing } = placeFlowLabels(ctx, routes);
  const scored = scoreLayout(ctx, routes, labels);
  return {
    hard: [],
    soft: [...soft, ...scored.issues],
    score: soft.reduce((sum, item) => sum + item.weight, 0) + scored.score + missing.length * 400,
    missing,
    crossings: scored.crossings,
    viewW: round(viewW),
    viewH: round(viewH),
    font,
    lh,
    head,
    taskW,
    taskH,
    routes,
    labels,
    maxCol,
    poolGap,
  };
}

// Label room: widen the gap (or row) a label failed to fit in, then retry.
function evaluate(model, plans, font) {
  const extra = { gap: new Map(), rowUp: new Map(), rowDown: new Map(), widen: 0 };
  let result = geometry(model, plans, font, extra);
  for (let attempt = 0; attempt < MAX_LABEL_RETRIES && result.hard.length === 0 && result.missing.length; attempt += 1) {
    for (const need of result.missing) {
      if (need.gapCol) extra.gap.set(need.gapCol, (extra.gap.get(need.gapCol) || 0) + need.px);
      if (need.rowKey) extra[need.rowSide].set(need.rowKey, (extra[need.rowSide].get(need.rowKey) || 0) + need.px);
    }
    result = geometry(model, plans, font, extra);
  }
  if (!result.hard.length && result.viewW < result.viewH * MIN_ASPECT) {
    extra.widen = Math.ceil((result.viewH * MIN_ASPECT - result.viewW) / result.maxCol);
    result = geometry(model, plans, font, extra);
  }
  result.extra = extra;
  return result;
}

function searchRoutes(model, candidates, font) {
  const choice = new Map([...candidates].map(([flow]) => [flow, 0]));
  const plansFor = () => new Map([...candidates].map(([flow, list]) => [flow, list[choice.get(flow)]]));
  let best = evaluate(model, plansFor(), font);
  if (best.hard.length) return { choice, best, plansFor: null };
  const flexible = [...candidates].filter(([, list]) => list.length > 1).map(([flow]) => flow);
  for (let pass = 0; pass < 3 && best.score > 0; pass += 1) {
    let improved = false;
    for (const flow of flexible) {
      const current = choice.get(flow);
      for (let index = 0; index < candidates.get(flow).length; index += 1) {
        if (index === choice.get(flow)) continue;
        const previous = choice.get(flow);
        choice.set(flow, index);
        const trial = evaluate(model, plansFor(), font);
        if (!trial.hard.length && trial.score < best.score - 0.001) {
          best = trial;
          improved = true;
        } else choice.set(flow, previous);
      }
      if (choice.get(flow) !== current) improved = true;
    }
    if (!improved) break;
  }
  return { choice, plansFor, best };
}

export function computeLayout(model) {
  const problems = [];
  const { back } = assignColumns(model);
  assignRows(model, problems);
  if (problems.length) return { problems };
  assignRanks(model);
  const candidates = flowCandidates(model, back);
  const { plansFor, best: searched } = searchRoutes(model, candidates, SEARCH_FONT);
  if (!plansFor) {
    const probe = evaluate(model, new Map([...candidates].map(([flow, list]) => [flow, list[0]])), SEARCH_FONT);
    return { problems: probe.hard };
  }
  const plans = plansFor();

  // Font: the smallest step that meets the projected target, else the most
  // legible one; never below the shared desktop floor.
  const projected = (result) => result.font * Math.min(1, SCREEN.w / result.viewW, SCREEN.h / result.viewH);
  let chosen = null;
  let fallback = null;
  for (const font of FONTS) {
    const result = evaluate(model, plans, font);
    if (result.hard.length) {
      if (!fallback && !chosen) fallback = result;
      continue;
    }
    const floor = minimumReadableSourceTextPx(result.viewW, DESKTOP_READER_DIAGRAM_WIDTH) + 0.2;
    if (font < floor) continue;
    if (!fallback || fallback.hard?.length || projected(result) > projected(fallback) + 0.01
      || (Math.abs(projected(result) - projected(fallback)) <= 0.01 && result.score < fallback.score)) fallback = result;
    if (projected(result) >= TARGET_PROJECTED && result.score <= searched.score + 1) {
      chosen = result;
      break;
    }
  }
  let layout = chosen || fallback;
  if (!layout) return { problems: ['No font step keeps the labels above the desktop legibility floor — split the process into sub-processes.'] };
  if (layout.hard.length) return { problems: layout.hard };
  // Re-run the winner so the model holds its geometry.
  layout = evaluate(model, plans, layout.font);
  // Collisions always fail; composition defects (crossings, corridors) fail in
  // showcase with a named repair, and stay checker warnings in standard.
  const showcase = (process.env.ARCHIFY_QUALITY_PROFILE || model.meta.quality_profile) === 'showcase';
  const soft = layout.soft.filter((item) => item.kind !== 'composition' || showcase).map((item) => item.text);
  for (const need of layout.missing) soft.push(need.text);
  return { ...layout, problems: [...new Set(soft)] };
}
