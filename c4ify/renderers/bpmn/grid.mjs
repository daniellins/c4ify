// Grid assignment for BPMN: columns from the longest sequence path (back
// edges ignored), a gateway branch into an adjacent lane "drops" into the
// gateway's own column (drawn as a straight vertical, the way people sketch a
// decision that hands work to the lane below or above), empty columns
// collapse, and rows inside a lane stack nodes that share a column.

import { isArtifact, isFlowNode } from './rules.mjs';

export const MAX_ROW = 5;

function backEdges(model) {
  const { nodes, seqOut, boundariesOf } = model;
  const flowNodes = nodes.filter(isFlowNode);
  const back = new Set();
  const state = new Map();
  const visit = (id) => {
    state.set(id, 1);
    for (const flow of seqOut.get(id)) {
      const seen = state.get(flow.to);
      if (seen === 1) back.add(flow);
      else if (!seen) visit(flow.to);
    }
    for (const boundary of boundariesOf.get(id) || []) if (!state.get(boundary.id)) visit(boundary.id);
    state.set(id, 2);
  };
  for (const node of flowNodes.filter((item) => item.event === 'start')) if (!state.get(node.id)) visit(node.id);
  for (const node of flowNodes) if (!state.get(node.id)) visit(node.id);
  return back;
}

// A decision branch that hands work to the adjacent lane shares the gateway's
// column: one branch per gateway, never into a join, never from a parallel or
// event-based gateway (their branches read best side by side).
function dropFlows(model, back) {
  const drops = new Set();
  const laneOrder = new Map();
  for (const pool of model.pools) pool.lanes.forEach((lane, index) => laneOrder.set(lane.id, index));
  for (const node of model.nodes) {
    if (node.kind !== 'gateway' || node.gateway === 'parallel' || node.gateway === 'event-based') continue;
    const outs = model.seqOut.get(node.id);
    if (outs.length < 2) continue;
    const candidates = outs.filter((flow) => {
      const target = flow.toNode;
      return !back.has(flow)
        && !Number.isInteger(target.col)
        && !isArtifact(target)
        && target.pool === node.pool
        && target.lane !== node.lane
        && Math.abs(laneOrder.get(target.lane) - laneOrder.get(node.lane)) === 1
        && model.seqIn.get(target.id).length === 1
        && !model.happyFlows.has(flow);
    });
    if (candidates.length) drops.add(candidates[0]);
  }
  return drops;
}

export function assignColumns(model) {
  const { nodes, nodeById, seqIn } = model;
  const back = backEdges(model);
  const drops = dropFlows(model, back);
  const memo = new Map();
  const colOf = (node) => {
    if (node.isBoundary) return colOf(nodeById.get(node.attachedTo));
    if (Number.isInteger(node.col)) return node.col;
    if (memo.has(node.id)) return memo.get(node.id);
    memo.set(node.id, 1);
    let col = 1;
    for (const flow of seqIn.get(node.id)) {
      if (!back.has(flow)) col = Math.max(col, colOf(flow.fromNode) + (drops.has(flow) ? 0 : 1));
    }
    memo.set(node.id, col);
    return col;
  };
  const flowNodes = nodes.filter(isFlowNode);
  for (const node of flowNodes) node.colValue = colOf(node);
  for (const node of nodes.filter(isArtifact)) {
    node.partner ||= associationPartner(model, node);
    node.colValue = Number.isInteger(node.col) ? node.col : node.partner?.colValue || 1;
  }
  // Collapse columns nobody occupies (explicit "col" values keep their order).
  const used = [...new Set(nodes.map((node) => node.colValue))].sort((a, b) => a - b);
  const remap = new Map(used.map((col, index) => [col, index + 1]));
  for (const node of nodes) node.colValue = remap.get(node.colValue);
  return { back, drops };
}

function associationPartner(model, node) {
  const link = model.flows.find((flow) => flow.type === 'association' && (flow.from === node.id || flow.to === node.id));
  return link ? model.nodeById.get(link.from === node.id ? link.to : link.from) : undefined;
}

export function assignRows(model, problems) {
  const occupied = new Map();
  const key = (node, row) => `${node.lane}|${node.colValue}|${row}`;
  const take = (node, row) => {
    occupied.set(key(node, row), node);
    node.rowValue = row;
  };
  const placeable = model.nodes.filter((node) => !node.isBoundary && node.lane);
  for (const node of placeable.filter((item) => Number.isInteger(item.row))) {
    const other = occupied.get(key(node, node.row));
    if (other) problems.push(`"${node.id}" and "${other.id}" both sit in lane "${node.lane}", column ${node.colValue}, row ${node.row} — give one of them another "row" or "col".`);
    take(node, node.row);
  }
  const auto = placeable.filter((item) => !Number.isInteger(item.row));
  const happy = model.happyPath.map((id) => model.nodeById.get(id)).filter((node) => node && auto.includes(node));
  const ordered = [...happy, ...auto.filter((node) => !happy.includes(node) && !isArtifact(node)), ...auto.filter(isArtifact)];
  for (const node of ordered) {
    let row = isArtifact(node) && node.partner && node.partner.lane === node.lane ? (node.partner.rowValue ?? 0) + 1 : 0;
    while (occupied.has(key(node, row)) && row <= MAX_ROW) row += 1;
    if (row > MAX_ROW) {
      problems.push(`No free row for "${node.id}" in lane "${node.lane}", column ${node.colValue} — set "col" explicitly or split the lane.`);
      row = MAX_ROW;
    }
    take(node, row);
  }
  for (const node of model.nodes.filter((item) => item.isBoundary)) node.rowValue = model.nodeById.get(node.attachedTo).rowValue;
}

export function assignRanks(model) {
  for (const pool of model.pools) pool.lanes.forEach((lane, index) => { lane.order = index; });
  for (const node of model.nodes.filter((item) => !item.isBoundary)) {
    const lane = model.laneById.get(node.lane);
    const pool = model.poolById.get(node.pool);
    node.vrank = pool.index * 100 + (lane?.order || 0) * 10 + (node.rowValue || 0);
  }
  for (const node of model.nodes.filter((item) => item.isBoundary)) node.vrank = model.nodeById.get(node.attachedTo).vrank + 0.5;
}

// ---------------------------------------------------------------------------
// Route candidates per flow (sides and shape only; coordinates come later).
// The first candidate is the conventional one; the search keeps it unless an
// alternative removes a collision, crossing or shared corridor.
// ---------------------------------------------------------------------------
export function flowCandidates(model, back) {
  const out = new Map();
  for (const flow of model.flows) {
    const a = flow.fromNode;
    const b = flow.toNode;
    if (flow.type === 'message') {
      const aPool = a ? model.poolById.get(a.pool) : flow.fromPool;
      const bPool = b ? model.poolById.get(b.pool) : flow.toPool;
      const down = aPool.index < bPool.index;
      out.set(flow, [{ kind: 'message', exit: down ? 'bottom' : 'top', entry: down ? 'top' : 'bottom', aPool, bPool }]);
      continue;
    }
    const dcol = b.colValue - a.colValue;
    const dv = Math.sign(b.vrank - a.vrank);
    const toward = dv > 0 ? 'bottom' : 'top';
    const facing = dv > 0 ? 'top' : 'bottom';
    if (flow.type === 'association') {
      let plan;
      if (dcol === 0) plan = { mode: 'straight-v', exit: toward, entry: facing };
      else if (dv === 0) plan = { mode: 'straight', exit: dcol > 0 ? 'right' : 'left', entry: dcol > 0 ? 'left' : 'right' };
      else plan = { mode: 'h', exit: dcol > 0 ? 'right' : 'left', entry: facing };
      out.set(flow, [{ kind: 'assoc', ...plan }]);
      continue;
    }
    const lower = a.vrank >= b.vrank ? a : b;
    const upper = a.vrank >= b.vrank ? b : a;
    const below = { mode: 'channel', exit: 'bottom', entry: 'bottom', channelNode: lower, side: 'below' };
    const above = { mode: 'channel', exit: 'top', entry: 'top', channelNode: upper, side: 'above' };
    const list = [];
    if (a.isBoundary) {
      if (dcol > 0 && dv > 0) list.push({ mode: 'v', exit: 'bottom', entry: 'left' });
      if (dcol === 0 && dv > 0) list.push({ mode: 'drop', exit: 'bottom', entry: 'top' });
      if (dcol > 0 && dv === 0) list.push({ ...below, channelNode: b });
      list.push({ ...below, channelNode: a.vrank >= b.vrank ? model.nodeById.get(a.attachedTo) : b });
    } else if (dcol > 0 && !back.has(flow)) {
      if (dv === 0) list.push({ mode: 'straight', exit: 'right', entry: 'left' }, below, above);
      else {
        const v = { mode: 'v', exit: toward, entry: 'left' };
        const h = { mode: 'h', exit: 'right', entry: facing };
        const z = { mode: 'z', exit: 'right', entry: 'left' };
        if (flow.route === 'horizontal-first') list.push(h);
        else if (flow.route === 'vertical-first') list.push(v);
        else list.push(...(a.kind === 'gateway' ? [v, h, z] : [h, v, z]));
      }
    } else if (dcol === 0 && dv !== 0) {
      list.push({ mode: 'straight-v', exit: toward, entry: facing });
    } else {
      // Backward flow (rework loop): around the rows, never by reordering lanes.
      if (dv !== 0 && dcol < 0) {
        list.push({ mode: 'h', exit: 'left', entry: facing });
        list.push({ mode: 'v', exit: toward, entry: 'right' });
      }
      if (dv <= 0) list.push(above, below);
      else list.push(below, above);
    }
    out.set(flow, list.map((plan) => ({ kind: 'sequence', ...plan })));
  }
  return out;
}
