// Normalizes a bpmn spec into an indexed model: pools with (possibly
// implicit) lanes, typed nodes with resolved pool/lane, flows with resolved
// endpoints, sequence-flow adjacency. Reference errors are returned as
// structural problems; placement rules R-BPMN-25/30 go to advisories.fail.

import { isArtifact, isActivity } from './rules.mjs';

export function buildModel(spec, advisories) {
  const problems = [];
  const meta = spec.meta;
  const pools = spec.pools.map((pool, index) => {
    const lanes = (pool.lanes || []).map((lane) => ({ id: lane.id, label: lane.label, pool: pool.id, implicit: false }));
    return { id: pool.id, label: pool.label, blackBox: Boolean(pool.black_box), lanes, index };
  });
  const poolById = new Map(pools.map((pool) => [pool.id, pool]));
  const laneById = new Map(pools.flatMap((pool) => pool.lanes.map((lane) => [lane.id, lane])));

  const seenIds = new Map();
  const claim = (id, where) => {
    if (seenIds.has(id)) problems.push(`Id "${id}" is used by ${seenIds.get(id)} and ${where} — ids are unique across pools, lanes and nodes.`);
    else seenIds.set(id, where);
  };
  for (const pool of pools) {
    claim(pool.id, `pool "${pool.label}"`);
    for (const lane of pool.lanes) claim(lane.id, `lane "${lane.label}"`);
  }

  for (const pool of pools) {
    if (pool.blackBox && pool.lanes.length) advisories.fail('R-BPMN-25', `Black-box pool "${pool.label}" declares lanes — a black box hides its internals; remove the lanes or make it a white-box pool.`);
  }

  const nodes = spec.nodes.map((raw, index) => {
    claim(raw.id, `node "${raw.label || raw.id}"`);
    const kind = raw.kind;
    const node = {
      id: raw.id,
      index,
      kind,
      label: raw.label ? raw.label.trim() : '',
      pool: raw.pool,
      lane: raw.lane,
      col: raw.col,
      row: raw.row,
      owner: raw.owner,
      sla: raw.sla,
      note: raw.note,
      marker: raw.marker,
    };
    if (kind === 'event') {
      node.isBoundary = Boolean(raw.attached_to);
      node.attachedTo = raw.attached_to;
      node.event = raw.event || (node.isBoundary ? 'intermediate' : undefined);
      node.trigger = raw.trigger || 'none';
      node.throwing = Boolean(raw.throwing) || (node.event === 'end' && node.trigger !== 'none');
      node.interrupting = raw.interrupting !== false;
      if (!node.event) problems.push(`Event "${raw.id}" needs "event": "start", "intermediate" or "end".`);
      if (node.isBoundary && node.event !== 'intermediate') advisories.fail('R-BPMN-11', `"${raw.id}" is attached to "${raw.attached_to}" but is a ${node.event} event — boundary events are intermediate events.`);
      if (node.event === 'start' && raw.throwing) problems.push(`Start event "${raw.id}" cannot be throwing — start events catch their trigger.`);
      if (node.isBoundary && (raw.col !== undefined || raw.row !== undefined)) problems.push(`Boundary event "${raw.id}" sits on its activity's border — remove "col"/"row".`);
    } else if (raw.attached_to || raw.event || raw.trigger) {
      problems.push(`Node "${raw.id}" is a ${kind}; "event", "trigger" and "attached_to" apply to events only.`);
    }
    if (kind === 'task') node.taskType = raw.task_type || 'none';
    else if (raw.task_type) problems.push(`Node "${raw.id}" is a ${kind}; "task_type" applies to tasks only.`);
    if (kind === 'gateway') node.gateway = raw.gateway || 'exclusive';
    else if (raw.gateway) problems.push(`Node "${raw.id}" is a ${kind}; "gateway" applies to gateways only.`);
    if (raw.marker && !isActivity(node)) problems.push(`Node "${raw.id}" is a ${kind}; loop and multi-instance markers apply to activities only.`);
    if ((isActivity(node) || kind === 'annotation') && !node.label) {
      problems.push(`${kind} "${raw.id}" needs a label${isActivity(node) ? ' (verb + object, e.g. "Validar fatura")' : ''}.`);
    }
    return node;
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const flows = spec.flows.map((raw, index) => {
    const flow = {
      id: raw.id,
      index,
      from: raw.from,
      to: raw.to,
      type: raw.type || 'sequence',
      label: raw.label ? raw.label.trim() : '',
      default: Boolean(raw.default),
      conditional: Boolean(raw.conditional),
      route: raw.route || 'auto',
      fromNode: nodeById.get(raw.from),
      toNode: nodeById.get(raw.to),
      fromPool: poolById.get(raw.from),
      toPool: poolById.get(raw.to),
    };
    for (const end of ['from', 'to']) {
      if (!flow[`${end}Node`] && !flow[`${end}Pool`]) problems.push(`Flow ${flow.id ? `"${flow.id}"` : `#${index}`} references unknown ${end} "${raw[end]}" (flows connect nodes, or a pool for message flows).`);
    }
    if (flow.type !== 'sequence' && (flow.default || flow.conditional)) problems.push(`Flow ${flow.id || `#${index}`} is a ${flow.type} flow; "default" and "conditional" apply to sequence flows.`);
    if (raw.from === raw.to) problems.push(`Flow ${flow.id || `#${index}`} connects "${raw.from}" to itself.`);
    return flow;
  });

  for (const node of nodes) {
    if (node.isBoundary && !nodeById.has(node.attachedTo)) problems.push(`Boundary event "${node.id}" is attached to unknown node "${node.attachedTo}".`);
  }

  // Resolve pool and lane (R-BPMN-25, R-BPMN-30).
  const whitePools = pools.filter((pool) => !pool.blackBox);
  const resolve = (node) => {
    if (node.lane) {
      const lane = laneById.get(node.lane);
      if (!lane) {
        advisories.fail('R-BPMN-30', `Node "${node.id}" references unknown lane "${node.lane}".`);
        return;
      }
      if (node.pool && node.pool !== lane.pool) advisories.fail('R-BPMN-30', `Node "${node.id}" declares pool "${node.pool}" but lane "${node.lane}" belongs to pool "${lane.pool}".`);
      node.pool = lane.pool;
    } else if (!node.pool && whitePools.length === 1) {
      node.pool = whitePools[0].id;
    }
    const pool = poolById.get(node.pool);
    if (!pool) {
      advisories.fail('R-BPMN-30', node.pool ? `Node "${node.id}" references unknown pool "${node.pool}".` : `Node "${node.id}" declares no pool or lane — every flow node belongs to exactly one pool (and lane).`);
      return;
    }
    if (pool.blackBox) {
      advisories.fail('R-BPMN-25', `Node "${node.id}" is placed in black-box pool "${pool.label}" — a black box has no flow nodes; attach message flows to the pool itself.`);
      return;
    }
    if (!node.lane) {
      if (pool.lanes.length === 1) node.lane = pool.lanes[0].id;
      else if (pool.lanes.length > 1) advisories.fail('R-BPMN-30', `Node "${node.id}" is in pool "${pool.label}" but declares no lane — pick one of ${pool.lanes.map((lane) => lane.id).join(', ')}.`);
    }
  };
  for (const node of nodes.filter((item) => !isArtifact(item) || item.pool || item.lane)) resolve(node);
  // Artifacts without placement inherit it from their first association partner.
  for (const node of nodes.filter((item) => isArtifact(item) && !item.pool && !item.lane)) {
    const link = flows.find((flow) => flow.type === 'association' && (flow.from === node.id || flow.to === node.id));
    const partner = link && nodeById.get(link.from === node.id ? link.to : link.from);
    if (partner?.pool) {
      node.pool = partner.pool;
      node.lane = partner.lane;
      node.partner = partner;
    } else {
      resolve(node);
    }
  }

  // Pools without lanes get one implicit lane so layout is uniform.
  for (const pool of whitePools) {
    if (!pool.lanes.length) {
      const lane = { id: `${pool.id}::lane`, label: '', pool: pool.id, implicit: true };
      pool.lanes.push(lane);
      laneById.set(lane.id, lane);
      for (const node of nodes) if (node.pool === pool.id && !node.lane) node.lane = lane.id;
    }
  }

  const seqIn = new Map(nodes.map((node) => [node.id, []]));
  const seqOut = new Map(nodes.map((node) => [node.id, []]));
  for (const flow of flows) {
    if (flow.type === 'sequence' && flow.fromNode && flow.toNode) {
      seqOut.get(flow.from).push(flow);
      seqIn.get(flow.to).push(flow);
    }
  }
  const boundariesOf = new Map();
  for (const node of nodes.filter((item) => item.isBoundary && nodeById.has(item.attachedTo))) {
    if (!boundariesOf.has(node.attachedTo)) boundariesOf.set(node.attachedTo, []);
    boundariesOf.get(node.attachedTo).push(node);
  }

  const happyPath = spec.happy_path || [];
  const happyFlows = new Set();
  happyPath.forEach((id, index) => {
    if (!nodeById.has(id)) {
      problems.push(`happy_path[${index}] references unknown node "${id}".`);
      return;
    }
    if (index === 0) return;
    const flow = seqOut.get(happyPath[index - 1])?.find((item) => item.to === id);
    if (!flow) problems.push(`happy_path has no sequence flow "${happyPath[index - 1]}" -> "${id}" — the happy path must follow sequence flows.`);
    else happyFlows.add(flow);
  });

  return {
    problems,
    model: {
      meta,
      locale: meta.locale,
      pools,
      poolById,
      laneById,
      nodes,
      nodeById,
      flows,
      seqIn,
      seqOut,
      boundariesOf,
      happyPath,
      happySet: new Set(happyPath),
      happyFlows,
    },
  };
}
