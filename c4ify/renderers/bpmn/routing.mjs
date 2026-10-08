// Orthogonal routes, flow labels and the defect score the route search
// minimises. Weights: anything the renderer would reject (a route through a
// shape or label, overlapping labels) dominates; composition defects the
// showcase checker rejects (proper crossings, shared corridors, cramped
// turns, frame border runs) come next; shared ports and bends only break ties.

import { dedupe, round } from '../shared/business.mjs';
import { collectAmbiguousCorridors, collectRouteRhythmIssues, rectsOverlap, segmentIntersectsRect } from '../shared/geometry.mjs';
import { textUnits } from '../shared/utils.mjs';
import { isActivity } from './rules.mjs';

const W = { shape: 1000, nodeLabel: 500, labelOverlap: 500, crossing: 150, corridor: 150, rhythm: 120, border: 200, clearance: 120, sharedInOut: 30, sharedPort: 6, bend: 3, channel: 12 };

function port(node, side, x) {
  const { box } = node;
  switch (side) {
    case 'left': return [box.x, node.cy];
    case 'right': return [box.x + box.width, node.cy];
    case 'top': return [x ?? node.cx, box.y];
    default: return [x ?? node.cx, box.y + box.height];
  }
}

// Message flows share a side with a sequence flow on an activity: move the
// message a quarter of the box aside so the two never overlap.
function messageX(ctx, flow, node, side) {
  if (!isActivity(node)) return node.cx;
  const dirs = ctx.used.get(node.id).get(side) || [];
  const messages = ctx.model.flows.filter((item) => item.type === 'message' && ((item.from === node.id && ctx.plans.get(item).exit === side) || (item.to === node.id && ctx.plans.get(item).entry === side)));
  const index = messages.indexOf(flow);
  const shared = dirs.some((dir) => dir !== 'msg');
  const offsets = shared ? [0.25, -0.25, 0.4] : [0, 0.25, -0.25];
  return round(node.cx + node.box.width * (offsets[index] ?? 0));
}

function messageRoute(ctx, flow, plan) {
  const a = flow.fromNode;
  const b = flow.toNode;
  const ax = a ? messageX(ctx, flow, a, plan.exit) : null;
  const bx = b ? messageX(ctx, flow, b, plan.entry) : null;
  const sx = ax ?? bx ?? round(plan.aPool.x + plan.aPool.w / 2);
  const ex = bx ?? ax ?? sx;
  const start = a ? port(a, plan.exit, sx) : [sx, plan.exit === 'bottom' ? plan.aPool.y + plan.aPool.h : plan.aPool.y];
  const end = b ? port(b, plan.entry, ex) : [ex, plan.entry === 'top' ? plan.bPool.y : plan.bPool.y + plan.bPool.h];
  if (Math.abs(start[0] - end[0]) < 0.5) return [start, end];
  const midY = plan.exit === 'bottom' ? plan.aPool.y + plan.aPool.h + ctx.poolGap / 2 : plan.aPool.y - ctx.poolGap / 2;
  return [start, [start[0], midY], [end[0], midY], end];
}

export function routeFlows(ctx) {
  const routes = [];
  for (const [flow, plan] of ctx.plans) {
    const a = flow.fromNode;
    const b = flow.toNode;
    let points;
    if (plan.kind === 'message') points = messageRoute(ctx, flow, plan);
    else if (plan.mode === 'straight' || plan.mode === 'straight-v') points = [port(a, plan.exit), port(b, plan.entry)];
    else if (plan.mode === 'drop') {
      const start = port(a, 'bottom');
      const inside = start[0] >= b.box.x + 8 && start[0] <= b.box.x + b.box.width - 8;
      if (inside) points = [start, port(b, 'top', start[0])];
      else {
        const midY = round((start[1] + b.box.y) / 2);
        points = [start, [start[0], midY], [b.cx, midY], port(b, 'top')];
      }
    } else if (plan.mode === 'v') {
      const start = port(a, plan.exit);
      const end = port(b, plan.entry);
      points = [start, [start[0], end[1]], end];
    } else if (plan.mode === 'h') {
      const start = port(a, plan.exit);
      const end = port(b, plan.entry);
      points = [start, [end[0], start[1]], end];
    } else if (plan.mode === 'z') {
      const col = a.colValue;
      const gx = round(ctx.colLeft[col] + ctx.colW[col] + ctx.gapPx(col) / 2);
      const start = port(a, 'right');
      const end = port(b, 'left');
      points = [start, [gx, start[1]], [gx, end[1]], end];
    } else {
      const cy = ctx.channelY.get(flow);
      const start = port(a, plan.exit);
      const end = port(b, plan.entry);
      points = [start, [start[0], cy], [end[0], cy], end];
    }
    routes.push({ flow, plan, points: dedupe(points) });
  }
  return routes;
}

// ---------------------------------------------------------------------------
// Flow labels: beside the first long-enough segment for gates, in the pool
// gap for messages. A label that finds no room reports how much it needs.
// ---------------------------------------------------------------------------
export function placeFlowLabels(ctx, routes) {
  const { font } = ctx;
  const labels = [];
  const missing = [];
  for (const route of routes) {
    const { flow, points, plan } = route;
    if (!flow.label || flow.type === 'association') continue;
    const w = Math.ceil(textUnits(flow.label) * font * 0.6 + 10);
    const h = Math.ceil(font + 7);
    const segments = points.slice(0, -1).map((start, index) => ({ start, end: points[index + 1], index }));
    let rect = null;
    if (flow.type === 'message') {
      const vertical = [...segments].filter(({ start, end }) => Math.abs(end[0] - start[0]) < 0.5)
        .sort((l, r) => Math.abs(r.end[1] - r.start[1]) - Math.abs(l.end[1] - l.start[1]));
      if (vertical.length) {
        const gapY = plan.exit === 'bottom' ? plan.aPool.y + plan.aPool.h + ctx.poolGap / 2 : plan.aPool.y - ctx.poolGap / 2;
        rect = { x: vertical[0].start[0] + 6, y: round(gapY - h / 2), width: w, height: h };
      }
    } else {
      const offset = flow.default || flow.conditional ? 20 : 9;
      for (const { start, end } of segments) {
        const horizontal = Math.abs(end[1] - start[1]) < 0.5;
        const length = horizontal ? Math.abs(end[0] - start[0]) : Math.abs(end[1] - start[1]);
        const dir = horizontal ? Math.sign(end[0] - start[0]) : Math.sign(end[1] - start[1]);
        if (horizontal) {
          if (length < w + offset + 14) continue;
          const x = dir > 0 ? start[0] + offset : start[0] - offset - w;
          rect = { x: round(x), y: round(start[1] - h - 3), width: w, height: h };
        } else {
          if (length < h + offset + 12) continue;
          const top = dir > 0 ? start[1] + offset : start[1] - offset - h;
          rect = { x: round(start[0] + 5), y: round(top), width: w, height: h };
        }
        break;
      }
      if (!rect) {
        const first = segments[0];
        const horizontal = Math.abs(first.end[1] - first.start[1]) < 0.5;
        const text = `Flow label "${flow.label}" (${flow.from} -> ${flow.to}) has no segment long enough — shorten the label or move the nodes apart.`;
        if (horizontal) {
          const length = Math.abs(first.end[0] - first.start[0]);
          const gapCol = first.end[0] > first.start[0] ? flow.fromNode.colValue : flow.fromNode.colValue - 1;
          missing.push({ text, gapCol, px: Math.ceil(w + offset + 14 - length) });
        } else {
          const length = Math.abs(first.end[1] - first.start[1]);
          const node = flow.fromNode;
          const up = first.end[1] < first.start[1];
          missing.push({ text, rowKey: `${node.lane}|${node.rowValue}`, rowSide: up ? 'rowUp' : 'rowDown', px: Math.ceil(h + offset + 12 - length) });
        }
        continue;
      }
    }
    if (!rect) {
      missing.push({ text: `Message label "${flow.label}" (${flow.from} -> ${flow.to}) has no vertical segment in the pool gap — attach the message to an activity above or below the other pool.` });
      continue;
    }
    labels.push({ flow, route, rect, text: flow.label });
  }
  return { labels, missing };
}

// ---------------------------------------------------------------------------
// Defect score
// ---------------------------------------------------------------------------
const segmentsOf = (points) => points.slice(0, -1).map((start, index) => ({ start, end: points[index + 1] }));
const name = (flow) => `${flow.id ? `"${flow.id}" ` : ''}("${flow.from}" -> "${flow.to}")`;
const sharesEnd = (p, q) => [p.from, p.to].some((id) => id === q.from || id === q.to);

function properCross(s, t) {
  const sh = Math.abs(s.start[1] - s.end[1]) < 0.5;
  const th = Math.abs(t.start[1] - t.end[1]) < 0.5;
  if (sh === th) return false;
  const [h, v] = sh ? [s, t] : [t, s];
  const y = h.start[1];
  const x = v.start[0];
  const [x1, x2] = [Math.min(h.start[0], h.end[0]), Math.max(h.start[0], h.end[0])];
  const [y1, y2] = [Math.min(v.start[1], v.end[1]), Math.max(v.start[1], v.end[1])];
  return x > x1 + 0.5 && x < x2 - 0.5 && y > y1 + 0.5 && y < y2 - 0.5;
}

function exempt(flow, node) {
  if (node.id === flow.from || node.id === flow.to) return true;
  const ends = [flow.fromNode, flow.toNode].filter(Boolean);
  return ends.some((end) => (end.isBoundary && end.attachedTo === node.id) || (node.isBoundary && node.attachedTo === end.id));
}

function frameBorders(model) {
  const borders = [];
  for (const pool of model.pools) {
    const frames = [pool, ...pool.lanes.filter((lane) => !lane.implicit)];
    for (const frame of frames) {
      if (!Number.isFinite(frame.y)) continue;
      borders.push({ axis: 'h', at: frame.y, from: frame.x, to: frame.x + frame.w });
      borders.push({ axis: 'h', at: frame.y + frame.h, from: frame.x, to: frame.x + frame.w });
      borders.push({ axis: 'v', at: frame.x, from: frame.y, to: frame.y + frame.h });
      borders.push({ axis: 'v', at: frame.x + frame.w, from: frame.y, to: frame.y + frame.h });
    }
  }
  return borders;
}

export function scoreLayout(ctx, routes, labels) {
  const { model } = ctx;
  const issues = [];
  let score = 0;
  const add = (weight, text, kind = 'layout') => { score += weight; if (text) issues.push({ weight, text, kind }); };
  const shapes = model.nodes.map((node) => ({ node, rect: node.box }));
  const nodeLabels = model.nodes.filter((node) => node.labelRect && node.kind !== 'annotation').map((node) => ({ node, rect: node.labelRect }));
  const arrows = routes.filter((route) => route.flow.type !== 'association');

  for (const route of routes) {
    const segments = segmentsOf(route.points);
    score += (route.points.length - 2) * W.bend + (route.plan.mode === 'channel' ? W.channel : 0);
    score += segments.reduce((sum, { start, end }) => sum + Math.abs(end[0] - start[0]) + Math.abs(end[1] - start[1]), 0) / 400;
    for (const { node, rect } of shapes) {
      if (exempt(route.flow, node)) continue;
      if (!segments.some((segment) => segmentIntersectsRect(segment, rect, 3))) continue;
      if (route.flow.type === 'message') {
        const inner = route.flow.fromNode || route.flow.toNode;
        const pool = route.flow.fromPool || route.flow.toPool || route.plan.bPool;
        add(W.shape, `Message flow ${name(route.flow)} runs through "${node.id}" on its way to pool "${pool.label}" — give "${inner.id}" a "col" with no node between it and that pool (or move "${node.id}"); pools and lanes keep their authored order.`);
      } else {
        add(W.shape, `Flow ${name(route.flow)} runs through "${node.id}" — move "${node.id}" to another row/column, or set the flow's "route" to "horizontal-first"/"vertical-first".`);
      }
    }
    for (const { node, rect } of nodeLabels) {
      if (segments.some((segment) => segmentIntersectsRect(segment, rect, 2))) {
        add(W.nodeLabel, `Flow ${name(route.flow)} crosses the label of "${node.id}" — move one of them to another row or column.`);
      }
    }
  }

  // Proper crossings between unrelated flows (associations are exempt, as in
  // the showcase checker).
  const crossings = [];
  for (let i = 0; i < arrows.length; i += 1) {
    for (let j = i + 1; j < arrows.length; j += 1) {
      const [p, q] = [arrows[i], arrows[j]];
      if (sharesEnd(p.flow, q.flow)) continue;
      const hit = segmentsOf(p.points).some((s) => segmentsOf(q.points).some((t) => properCross(s, t)));
      if (!hit) continue;
      crossings.push([p.flow, q.flow]);
      const movable = [p.flow, q.flow].find((flow) => flow.type === 'sequence' && !model.happyFlows.has(flow)) || p.flow;
      add(W.crossing, `Flow ${name(p.flow)} crosses flow ${name(q.flow)} and no route candidate avoids it — keep the lane order and move "${movable.to}" (or "${movable.from}") to another "row" or "col" so ${name(movable)} runs clear.`, 'composition');
    }
  }
  const relations = arrows.map((route, index) => ({ relation: { from: route.flow.from, to: route.flow.to, id: route.flow.id }, relationIndex: index, points: route.points }));
  for (const hit of collectAmbiguousCorridors({ routedRelations: relations })) {
    add(W.corridor, `Flows ${name(arrows[hit.left.relationIndex].flow)} and ${name(arrows[hit.right.relationIndex].flow)} share a corridor — move one endpoint to another "row" or "col".`, 'composition');
  }
  for (const hit of collectRouteRhythmIssues({ routedRelations: relations })) {
    add(W.rhythm, `Flow ${name(arrows[hit.relationIndex].flow)} has a ${Math.round(hit.length)}px ${hit.position} segment — move its endpoints further apart ("col"/"row").`, 'composition');
  }
  const borders = frameBorders(model);
  for (const route of arrows) {
    for (const { start, end } of segmentsOf(route.points)) {
      const horizontal = Math.abs(start[1] - end[1]) < 0.5;
      const at = horizontal ? start[1] : start[0];
      const [lo, hi] = horizontal ? [Math.min(start[0], end[0]), Math.max(start[0], end[0])] : [Math.min(start[1], end[1]), Math.max(start[1], end[1])];
      if (borders.some((border) => border.axis === (horizontal ? 'h' : 'v') && Math.abs(border.at - at) < 0.6 && Math.min(hi, border.to) - Math.max(lo, border.from) > 0.5)) {
        add(W.border, `Flow ${name(route.flow)} runs along a lane border — move one endpoint to another row.`, 'composition');
      }
    }
  }

  // Labels: over shapes, over each other, too close to other routes.
  const allLabels = [
    ...nodeLabels.map((item) => ({ id: `label of "${item.node.id}"`, rect: item.rect, owner: item.node })),
    ...labels.map((item) => ({ id: `flow label "${item.text}"`, rect: item.rect, flow: item.flow })),
  ];
  for (let i = 0; i < allLabels.length; i += 1) {
    const item = allLabels[i];
    for (let j = i + 1; j < allLabels.length; j += 1) {
      if (rectsOverlap(item.rect, allLabels[j].rect, 2)) add(W.labelOverlap, `The ${item.id} overlaps the ${allLabels[j].id} — move one of the nodes.`);
    }
    for (const { node, rect } of shapes) {
      if (item.owner && (node === item.owner || item.owner.attachedTo === node.id)) continue;
      if (rectsOverlap(item.rect, rect, 2)) add(W.labelOverlap, `The ${item.id} overlaps "${node.id}" — move one of them to another row or column.`);
    }
    if (!item.flow) continue;
    for (const route of arrows) {
      if (route.flow === item.flow) continue;
      if (segmentsOf(route.points).some((segment) => segmentIntersectsRect(segment, item.rect, 4))) {
        add(W.clearance, `The ${item.id} sits on flow ${name(route.flow)} — move one of the nodes.`, 'composition');
      }
    }
  }

  // Shared ports (tie-breakers).
  for (const [id, sides] of ctx.used) {
    const node = model.nodeById.get(id);
    for (const dirs of sides.values()) {
      const seq = dirs.filter((dir) => dir !== 'msg');
      if (seq.includes('in') && seq.includes('out')) score += W.sharedInOut;
      else if (seq.length > 1) score += W.sharedPort * (seq.length - 1);
      if (seq.length && dirs.includes('msg') && !isActivity(node)) score += W.sharedInOut;
    }
  }
  return { score, issues, crossings };
}
