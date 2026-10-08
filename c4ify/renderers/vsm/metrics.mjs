// VSM structure, methodology rules and metric computation (no geometry).
// Rule ids and formulas come from references/theory-vsm.md §3 and §6:
// HARD rules go through advisories.fail, SOFT rules through advisories.warn.

import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { uniqueIdProblems } from '../shared/business.mjs';

export const TOP_KINDS = new Set(['supplier', 'customer', 'control']);
export const BUFFER_KINDS = new Set(['inventory', 'queue', 'supermarket', 'fifo']);
const MATERIAL_KINDS = new Set(['push', 'pull', 'fifo', 'withdrawal', 'shipment']);
const INFO_KINDS = new Set(['manual', 'electronic']);
const CHAIN_KINDS = new Set(['supplier', 'process', 'customer']);
const OFFICE_FIELDS = ['pt', 'lt', 'pct_ca'];
const MFG_FIELDS = ['ct_s', 'co_min', 'uptime_pct', 'operators', 'shifts', 'epe', 'scrap_pct'];
const PERIOD_DAYS = { day: 1 };
export const MAX_BLOCKS = 10;
const MAX_CONTROLS = 3;

function structuralFail(problems) {
  if (problems.length) throwDiagnosticProblems('VSM structure validation failed', problems, { code: 'method/hard-rule', subject: { diagramType: 'vsm' } });
}

function dailyDemandOf(demand, fail) {
  if (!demand) return undefined;
  if (demand.period === 'day') return demand.qty;
  if (!demand.working_days) {
    fail('R-VSM-06', `meta.demand is per ${demand.period} but has no working_days — declare the working days in that period so demand, takt and inventory days share one period.`);
    return undefined;
  }
  return demand.qty / demand.working_days;
}

// Tolerances from R-VSM-08: ±0.5 % of the value (never tighter than the
// displayed precision), ±0.1 day for days, ±0.5 percentage point for ratios.
function mismatch(authored, computed, kind) {
  if (!Number.isFinite(authored) || !Number.isFinite(computed)) return false;
  const tolerance = kind === 'pct' ? 0.5 : kind === 'days' ? Math.max(0.1, Math.abs(computed) * 0.005) : Math.max(0.05, Math.abs(computed) * 0.005);
  return Math.abs(authored - computed) > tolerance;
}

export function analyzeVsm(spec, advisories) {
  const meta = spec.meta;
  const variant = meta.variant;
  const state = meta.state;
  const office = variant === 'office';
  const fail = (rule, message) => advisories.fail(rule, message);
  const warn = (rule, message, subject) => advisories.warn(rule, message, subject);

  // -------------------------------------------------------------------------
  // Identity and references (structural, thrown before any rule)
  // -------------------------------------------------------------------------
  const nodes = spec.nodes.map((node, index) => ({ ...node, index }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const problems = uniqueIdProblems(nodes, 'nodes');
  spec.flows.forEach((flow, index) => {
    for (const end of ['from', 'to']) {
      if (!byId.has(flow[end])) problems.push(`/flows/${index}/${end} references unknown node "${flow[end]}".`);
    }
    if (flow.from === flow.to) problems.push(`/flows/${index} connects "${flow.from}" to itself.`);
  });
  for (const node of nodes) {
    for (const field of ['before', 'after', 'owner', 'target']) {
      if (node[field] && !byId.has(node[field])) problems.push(`Node "${node.id}" field ${field} references unknown node "${node[field]}".`);
    }
  }
  structuralFail(problems);

  const ofKind = (kind) => nodes.filter((node) => node.kind === kind);
  const processes = ofKind('process');
  const customers = ofKind('customer');
  const suppliers = ofKind('supplier');
  const controls = ofKind('control');
  const buffers = nodes.filter((node) => BUFFER_KINDS.has(node.kind));
  const kaizens = ofKind('kaizen');

  // R-VSM-01: one variant and one state per map, so no field of the other variant.
  for (const node of processes) {
    const foreign = (office ? MFG_FIELDS : OFFICE_FIELDS).filter((field) => node[field] !== undefined);
    if (foreign.length) fail('R-VSM-01', `Process "${node.id}" carries ${foreign.join(', ')}, which belong to the ${office ? 'manufacturing' : 'office'} variant while meta.variant is "${variant}" — one variant per map.`);
  }

  // R-VSM-02: exactly one customer, at least one block, a single flow path.
  if (customers.length !== 1) fail('R-VSM-02', `A value stream map has exactly one customer; found ${customers.length}.`);
  if (!processes.length) fail('R-VSM-02', 'A value stream map needs at least one process block.');
  if (suppliers.length > 1) fail('R-VSM-02', `Found ${suppliers.length} suppliers — show the one that feeds the first block (merge the others into its label).`);
  if (controls.length > MAX_CONTROLS) fail('R-VSM-02', `Found ${controls.length} control/information-system nodes; at most ${MAX_CONTROLS} fit the top band — merge systems that serve the same blocks.`);
  if (processes.length > MAX_BLOCKS) fail('R-VSM-12', `${processes.length} process blocks exceed the ${MAX_BLOCKS} that stay legible in one row — map one loop per diagram or merge blocks (a VSM is the macro view).`);

  // R-VSM-10: flow channels, kinds and endpoints.
  const material = [];
  const info = [];
  spec.flows.forEach((flow, index) => {
    const entry = { ...flow, index, fromNode: byId.get(flow.from), toNode: byId.get(flow.to) };
    const fromKind = entry.fromNode.kind;
    const toKind = entry.toNode.kind;
    const name = `Flow ${flow.id ? `"${flow.id}" ` : ''}${flow.from} → ${flow.to}`;
    if (flow.channel === 'material') {
      if (!MATERIAL_KINDS.has(flow.kind)) fail('R-VSM-10', `${name} is a material/work flow, so kind must be push, pull, fifo, withdrawal or shipment (got "${flow.kind}").`);
      if (!CHAIN_KINDS.has(fromKind) || !CHAIN_KINDS.has(toKind)) fail('R-VSM-10', `${name} connects ${fromKind} to ${toKind}; material/work flows connect supplier, process and customer nodes (buffers sit on the flow through before/after).`);
      if (fromKind === 'customer' || toKind === 'supplier') fail('R-VSM-10', `${name} runs against the stream; work flows supplier → processes → customer.`);
      if (fromKind === 'supplier' && toKind === 'customer') fail('R-VSM-10', `${name} bypasses every process block.`);
      if (flow.kind === 'shipment' && fromKind !== 'supplier' && toKind !== 'customer') fail('R-VSM-10', `${name} is a shipment; shipments only enter from the supplier or leave to the customer.`);
      material.push(entry);
    } else {
      if (!INFO_KINDS.has(flow.kind)) fail('R-VSM-10', `${name} is an information flow, so kind must be manual or electronic (got "${flow.kind}").`);
      const allowed = (kind) => TOP_KINDS.has(kind) || kind === 'process';
      if (!allowed(fromKind) || !allowed(toKind)) fail('R-VSM-10', `${name} touches a ${allowed(fromKind) ? toKind : fromKind}; information flows connect control, customer, supplier and process nodes.`);
      else if (!TOP_KINDS.has(fromKind) && !TOP_KINDS.has(toKind)) fail('R-VSM-10', `${name} links two process blocks; information flows go through control, customer or supplier (use a pull or FIFO work flow between blocks).`);
      info.push(entry);
    }
  });
  advisories.throwIfHard('VSM method validation failed', 'vsm');

  // Chain: supplier? → P1 → … → Pn → customer, one material flow per step.
  const outOf = new Map();
  const into = new Map();
  for (const flow of material) {
    if (!outOf.has(flow.from)) outOf.set(flow.from, []);
    if (!into.has(flow.to)) into.set(flow.to, []);
    outOf.get(flow.from).push(flow);
    into.get(flow.to).push(flow);
  }
  const customer = customers[0];
  const supplier = suppliers[0];
  for (const node of [...processes, ...suppliers]) {
    const outgoing = outOf.get(node.id) || [];
    if (outgoing.length > 1) fail('R-VSM-02', `"${node.id}" has ${outgoing.length} outgoing work flows — parallel sub-flows are not drawn yet; map the critical (longest) path and mention the branch in the block description.`);
  }
  for (const node of [...processes, customer]) {
    const incoming = into.get(node.id) || [];
    if (incoming.length > 1) fail('R-VSM-02', `"${node.id}" receives ${incoming.length} work flows — merge the branches before this block or map the critical path only.`);
  }
  if ((into.get(customer.id) || []).length !== 1) fail('R-VSM-02', `The customer "${customer.id}" must receive the work of the last block through one material flow.`);
  const firsts = processes.filter((node) => !(into.get(node.id) || []).some((flow) => flow.fromNode.kind === 'process'));
  if (firsts.length !== 1) fail('R-VSM-02', `The work flow must start at exactly one block; ${firsts.length} blocks have no upstream block (${firsts.map((node) => node.id).join(', ')}) — connect them with material flows.`);
  if (supplier && (outOf.get(supplier.id) || []).length !== 1) fail('R-VSM-02', `Supplier "${supplier.id}" must feed the first block through one material flow.`);
  advisories.throwIfHard('VSM method validation failed', 'vsm');

  const chain = [];
  const seen = new Set();
  let cursor = firsts[0];
  while (cursor && cursor.kind === 'process' && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.push(cursor);
    cursor = (outOf.get(cursor.id) || [])[0]?.toNode;
  }
  if (cursor !== customer) fail('R-VSM-02', `The work flow from "${firsts[0].id}" ${cursor ? `loops back at "${cursor.id}"` : 'stops'} before reaching the customer — every block must be reachable customer-ward.`);
  const missing = processes.filter((node) => !seen.has(node.id));
  if (missing.length) fail('R-VSM-02', `Blocks ${missing.map((node) => `"${node.id}"`).join(', ')} are not on the work flow to the customer.`);
  const supplierFlow = supplier ? outOf.get(supplier.id)[0] : undefined;
  if (supplierFlow && supplierFlow.to !== chain[0]?.id) fail('R-VSM-02', `Supplier "${supplier.id}" feeds "${supplierFlow.to}", but the first block is "${chain[0]?.id}".`);
  advisories.throwIfHard('VSM method validation failed', 'vsm');

  chain.forEach((node, index) => { node.chainIndex = index; });
  const n = chain.length;
  // Gap k sits before block k; gap n sits after the last block.
  const gaps = Array.from({ length: n + 1 }, (_, index) => ({
    index,
    flow: index === 0 ? supplierFlow : (outOf.get(chain[index - 1].id) || [])[0],
    upstream: index === 0 ? supplier : chain[index - 1],
    downstream: index === n ? customer : chain[index],
    buffer: undefined,
  }));
  const placement = [];
  for (const buffer of buffers) {
    const anchor = buffer.before || buffer.after;
    if (!!buffer.before === !!buffer.after) { placement.push(`Buffer "${buffer.id}" needs exactly one of before/after (the process it waits in front of, or follows).`); continue; }
    const anchorNode = byId.get(anchor);
    if (anchorNode.kind !== 'process') { placement.push(`Buffer "${buffer.id}" is placed ${buffer.before ? 'before' : 'after'} "${anchor}", which is a ${anchorNode.kind}; buffers sit next to process blocks.`); continue; }
    const gap = gaps[anchorNode.chainIndex + (buffer.before ? 0 : 1)];
    if (gap.buffer) { placement.push(`Buffers "${gap.buffer.id}" and "${buffer.id}" sit in the same place of the flow — keep one buffer between two blocks.`); continue; }
    gap.buffer = buffer;
    buffer.gap = gap;
  }
  for (const node of nodes) {
    if (node.kind === 'kaizen') {
      if (!node.target) placement.push(`Kaizen "${node.id}" needs a target (the process or buffer it improves).`);
      else if (!['process', ...BUFFER_KINDS].includes(byId.get(node.target).kind)) placement.push(`Kaizen "${node.id}" targets a ${byId.get(node.target).kind}; kaizen bursts attach to a process block or a buffer.`);
    } else if (node.target) {
      placement.push(`Only kaizen nodes take a target ("${node.id}" is a ${node.kind}).`);
    }
    if (!BUFFER_KINDS.has(node.kind) && (node.before || node.after)) placement.push(`Only buffers take before/after ("${node.id}" is a ${node.kind}).`);
  }
  structuralFail(placement);

  // R-VSM-10: a buffer must agree with the flow that crosses it.
  for (const gap of gaps) {
    const { buffer, flow } = gap;
    if (buffer?.kind === 'supermarket' && flow && !['pull', 'withdrawal'].includes(flow.kind)) fail('R-VSM-10', `Supermarket "${buffer.id}" sits on a ${flow.kind} flow — downstream withdraws from a supermarket, so the flow is pull or withdrawal.`);
    if (buffer?.kind === 'fifo' && flow && flow.kind !== 'fifo') fail('R-VSM-10', `FIFO lane "${buffer.id}" sits on a ${flow.kind} flow — declare the flow kind fifo.`);
    if (flow?.kind === 'fifo' && buffer && buffer.kind !== 'fifo') fail('R-VSM-10', `The fifo flow ${flow.from} → ${flow.to} crosses ${buffer.kind} "${buffer.id}" — use a buffer of kind fifo.`);
  }
  for (const node of nodes) {
    if (node.pacemaker && node.kind !== 'process') fail('R-VSM-09', `"${node.id}" is a ${node.kind}; only a process block can be the pacemaker.`);
  }
  // R-VSM-09: a single scheduling point.
  const pacemakers = processes.filter((node) => node.pacemaker);
  if (state === 'future' && pacemakers.length > 1) fail('R-VSM-09', `A future state schedules one pacemaker; found ${pacemakers.map((node) => node.id).join(', ')}.`);

  // -------------------------------------------------------------------------
  // Time basis (R-VSM-05, R-VSM-06)
  // -------------------------------------------------------------------------
  const whpd = meta.work_hours_per_day;
  const dailyDemand = dailyDemandOf(meta.demand, fail);
  const units = { pt: meta.units?.pt, lt: meta.units?.lt };
  let factor;
  if (office) {
    if (!units.pt || !units.lt) fail('R-VSM-05', 'Office maps declare meta.units.pt and meta.units.lt (min, h or d) — PT and LT are meaningless without units.');
    const mixed = units.pt !== units.lt;
    if (mixed && !whpd) fail('R-VSM-05', `PT is in ${units.pt} and LT in ${units.lt}; declare meta.work_hours_per_day so the activity ratio uses one unit (theory §3).`);
    // Work minutes when the working day is known, otherwise the shared unit.
    if (whpd) factor = { min: 1, h: 60, d: whpd * 60 };
    else if (!mixed) factor = { min: 1, h: 1, d: 1 };
  } else {
    if ((meta.demand && !meta.available_time_s) || (!meta.demand && meta.available_time_s)) {
      fail('R-VSM-06', 'Takt needs both meta.available_time_s (available seconds per working day) and meta.demand — declare both, or neither.');
    }
  }
  const secondsPerDay = office ? (whpd ? whpd * 3600 : undefined) : (meta.available_time_s || (whpd ? whpd * 3600 : undefined));

  // -------------------------------------------------------------------------
  // Block data (R-VSM-03, 04, 05) and buffers (R-VSM-07)
  // -------------------------------------------------------------------------
  for (const node of chain) {
    if (office) {
      if (!(node.pt > 0) || !(node.lt > 0)) fail('R-VSM-03', `Office block "${node.id}" needs pt and lt greater than zero (observed process and lead time).`);
      if (node.pct_ca !== undefined && !(node.pct_ca > 0 && node.pct_ca <= 100)) fail('R-VSM-05', `%C&A of "${node.id}" is ${node.pct_ca}; it is a share of items used as-is, in (0, 100].`);
      if (units.pt && units.lt && factor && node.pt * factor[units.pt] > node.lt * factor[units.lt] + 1e-9) {
        fail('R-VSM-04', `Block "${node.id}" has PT ${node.pt} ${units.pt} longer than its LT ${node.lt} ${units.lt}; lead time includes the process time.`);
      }
    } else if (!(node.ct_s > 0)) {
      fail('R-VSM-03', `Manufacturing block "${node.id}" needs ct_s (observed cycle time in seconds) greater than zero.`);
    }
  }
  for (const buffer of buffers) {
    const hasQty = Number.isFinite(buffer.qty);
    const hasWait = Number.isFinite(buffer.wait);
    if (!hasQty && !hasWait) { fail('R-VSM-07', `${buffer.kind} "${buffer.id}" has neither qty nor wait — record what is waiting (qty) or for how long (wait).`); continue; }
    if (hasWait && !buffer.wait_unit) fail('R-VSM-05', `${buffer.kind} "${buffer.id}" declares wait without wait_unit (min, h or d).`);
    if (office) continue;
    if (hasWait) {
      if (buffer.wait_unit && buffer.wait_unit !== 'd' && !secondsPerDay) fail('R-VSM-05', `"${buffer.id}" waits in ${buffer.wait_unit}; declare meta.available_time_s or meta.work_hours_per_day to convert it to days.`);
      else if (buffer.wait_unit) buffer.days = buffer.wait_unit === 'd' ? buffer.wait : buffer.wait * (buffer.wait_unit === 'h' ? 3600 : 60) / secondsPerDay;
    } else {
      const daily = buffer.daily_demand || dailyDemand;
      if (!daily) fail('R-VSM-07', `Inventory "${buffer.id}" has qty ${buffer.qty} but no daily demand — set daily_demand on it or meta.demand, so days = qty ÷ daily demand.`);
      else buffer.days = buffer.qty / daily;
    }
  }
  advisories.throwIfHard('VSM method validation failed', 'vsm');

  // -------------------------------------------------------------------------
  // Metrics (theory §3)
  // -------------------------------------------------------------------------
  const metrics = { variant, state, whpd, dailyDemand, secondsPerDay, units };
  if (office) {
    for (const node of chain) {
      node.ptBase = node.pt * factor[units.pt];
      node.ltBase = node.lt * factor[units.lt];
      node.waitLt = (node.ltBase - node.ptBase) / factor[units.lt];
    }
    metrics.totalPtBase = chain.reduce((sum, node) => sum + node.ptBase, 0);
    metrics.totalLtBase = chain.reduce((sum, node) => sum + node.ltBase, 0);
    metrics.totalPt = metrics.totalPtBase / factor[units.pt];
    metrics.totalLt = metrics.totalLtBase / factor[units.lt];
    metrics.activityRatio = metrics.totalPtBase / metrics.totalLtBase;
    for (const node of chain) node.ltShare = node.ltBase / metrics.totalLtBase;
    if (chain.every((node) => Number.isFinite(node.pct_ca))) metrics.rolledCa = chain.reduce((product, node) => product * node.pct_ca / 100, 1);
    if (whpd && dailyDemand) metrics.taktS = whpd * 3600 / dailyDemand;
  } else {
    if (dailyDemand && meta.available_time_s) metrics.taktS = meta.available_time_s / dailyDemand;
    metrics.inventoryDays = buffers.reduce((sum, buffer) => sum + (buffer.days || 0), 0);
    metrics.vaS = chain.reduce((sum, node) => sum + node.ct_s, 0);
    metrics.leadDays = metrics.inventoryDays + (secondsPerDay ? metrics.vaS / secondsPerDay : 0);
    if (secondsPerDay && metrics.leadDays > 0) metrics.flowEfficiency = metrics.vaS / (metrics.leadDays * secondsPerDay);
    for (const buffer of buffers) buffer.leadShare = metrics.leadDays > 0 ? (buffer.days || 0) / metrics.leadDays : 0;
  }

  // R-VSM-08: authored totals must equal the computed ones.
  const totals = meta.totals || {};
  const check = (field, computed, kind, unitText) => {
    if (totals[field] === undefined) return;
    if (!Number.isFinite(computed)) { fail('R-VSM-08', `meta.totals.${field} is declared but cannot be computed for this ${variant} map — remove it.`); return; }
    if (mismatch(totals[field], computed, kind)) fail('R-VSM-08', `meta.totals.${field} is ${totals[field]} but the blocks compute ${Math.round(computed * 1000) / 1000}${unitText} — fix the block data or remove the authored total; the computed value wins.`);
  };
  if (office) {
    check('lead_time', metrics.totalLt, units.lt === 'd' ? 'days' : 'time', ` ${units.lt}`);
    check('process_time', metrics.totalPt, 'time', ` ${units.pt}`);
    check('activity_ratio_pct', metrics.activityRatio * 100, 'pct', ' %');
    check('rolled_pct_ca', metrics.rolledCa * 100, 'pct', ' %');
    check('inventory_days', undefined);
  } else {
    check('lead_time', metrics.leadDays, 'days', ' d');
    check('process_time', metrics.vaS, 'time', ' s');
    check('activity_ratio_pct', (metrics.flowEfficiency ?? Number.NaN) * 100, 'pct', ' %');
    check('inventory_days', metrics.inventoryDays, 'days', ' d');
    check('rolled_pct_ca', undefined);
  }
  check('takt_s', metrics.taktS, 'time', ' s');
  advisories.throwIfHard('VSM method validation failed', 'vsm');

  // -------------------------------------------------------------------------
  // SOFT rules
  // -------------------------------------------------------------------------
  if (!office && metrics.taktS) {
    for (const node of chain) {
      node.overTakt = node.ct_s > metrics.taktS;
      const effective = node.ct_s / ((node.uptime_pct ?? 100) / 100);
      if (node.overTakt) warn('R-VSM-11', `"${node.label}" C/T ${node.ct_s} s exceeds takt ${Math.round(metrics.taktS * 10) / 10} s — it cannot meet demand; rebalance, add capacity or mark a kaizen.`, node.id);
      else if (effective > metrics.taktS) warn('R-VSM-11', `"${node.label}" C/T ${node.ct_s} s at ${node.uptime_pct}% uptime is ${Math.round(effective * 10) / 10} s effective, above takt ${Math.round(metrics.taktS * 10) / 10} s — no uptime slack.`, node.id);
    }
  }
  if (n < 3) warn('R-VSM-12', `Only ${n} process block${n === 1 ? '' : 's'} — a value stream usually has 3 to 15; check that the map covers the stream door to door.`, chain[0].id);
  if (n > 15) warn('R-VSM-12', `${n} blocks look like a process map in disguise — merge steps into macro blocks.`, chain[0].id);
  for (const node of chain) {
    if (office && !Number.isFinite(node.pct_ca)) warn('R-VSM-13', `Block "${node.label}" has no %C&A — ask the downstream block how often its output is usable as-is.`, node.id);
    if (!office && (node.co_min === undefined || node.uptime_pct === undefined)) warn('R-VSM-13', `Data box of "${node.label}" lacks ${[node.co_min === undefined && 'C/O', node.uptime_pct === undefined && 'uptime'].filter(Boolean).join(' and ')}.`, node.id);
  }
  if (state === 'future') {
    if (!kaizens.length) warn('R-VSM-14', 'A future state without kaizen bursts does not say which improvements make it real — mark them on the blocks they change.', customer.id);
    for (const gap of gaps.slice(1, n)) {
      if (gap.flow?.kind === 'push') warn('R-VSM-14', `Push flow remains between "${gap.upstream.label}" and "${gap.downstream.label}" in the future state — use continuous flow, FIFO or a supermarket pull.`, gap.flow.id || gap.flow.to);
    }
  } else {
    for (const kaizen of kaizens) warn('R-VSM-15', `Kaizen "${kaizen.label}" is on a current-state map — move it to the future state map.`, kaizen.id);
  }
  for (const buffer of buffers) {
    if (buffer.kind === 'fifo' && !buffer.max_qty) warn('R-VSM-16', `FIFO lane "${buffer.label}" has no max_qty — a FIFO lane without a limit is just inventory.`, buffer.id);
    if (buffer.kind === 'supermarket' && !buffer.owner) warn('R-VSM-16', `Supermarket "${buffer.label}" has no owner process — name the process that replenishes it.`, buffer.id);
  }
  for (const gap of gaps) {
    if (gap.flow?.kind === 'fifo' && !gap.buffer) warn('R-VSM-16', `FIFO flow ${gap.flow.from} → ${gap.flow.to} has no fifo buffer with max_qty.`, gap.flow.id || gap.flow.to);
  }
  if (office && (metrics.activityRatio >= 0.5 || chain.every((node) => Math.abs(node.ptBase - node.ltBase) < 1e-9))) {
    warn('R-VSM-17', `Activity ratio ${Math.round(metrics.activityRatio * 1000) / 10}% is implausibly high for observed work — check that LT includes waiting (standards, not observed data).`, chain[0].id);
  }
  const titleBlock = [['value_stream', meta.value_stream], ['date', meta.date], ['champion', meta.champion], ['demand', meta.demand]].filter(([, value]) => !value).map(([field]) => field);
  if (titleBlock.length) warn('R-VSM-18', `Title block lacks meta.${titleBlock.join(', meta.')} — a VSM names the value stream, date, champion and demand rate.`, customer.id);

  return { nodes, byId, chain, gaps, buffers, kaizens, controls, supplier, customer, material, info, metrics };
}
