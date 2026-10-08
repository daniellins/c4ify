// BPMN validation rules R-BPMN-01..31 from references/theory-bpmn.md §5.
// HARD rules (spec violations) go to advisories.fail; SOFT rules (Method and
// Style, Camunda) go to advisories.warn with the same rule id.

const ACTIVITY = new Set(['task', 'subprocess', 'call-activity']);
const DATA = new Set(['data-object', 'data-store']);

export const isActivity = (node) => Boolean(node && ACTIVITY.has(node.kind));
export const isData = (node) => Boolean(node && DATA.has(node.kind));
export const isArtifact = (node) => Boolean(node && (node.kind === 'annotation' || DATA.has(node.kind)));
export const isFlowNode = (node) => Boolean(node && !isArtifact(node));

const PT_NOT_VERBS = new Set(['lugar', 'mulher', 'gestor', 'setor', 'valor', 'favor', 'fornecedor', 'setor', 'nível', 'colaborador', 'coordenador', 'solicitador', 'par', 'mar', 'bar', 'ser', 'lar', 'car']);
const GENERIC_VERBS = new Set(['handle', 'process', 'manage', 'do', 'deal', 'tratar', 'processar', 'gerenciar', 'fazer', 'lidar', 'cuidar']);
const EN_NOMINAL = /(tion|sion|ment|ance|ence|ness|ity|ing|ure)$/i;

function firstWord(text) {
  return String(text || '').trim().split(/\s+/)[0].toLowerCase().normalize('NFC').replace(/[^\p{L}-]/gu, '');
}

function looksLikePtInfinitive(word) {
  return word.length > 3 && /(ar|er|ir|or|ôr)$/.test(word) && !PT_NOT_VERBS.has(word);
}

function startsWithVerb(label, locale) {
  const word = firstWord(label);
  if (!word) return false;
  if (locale === 'pt-BR') return looksLikePtInfinitive(word);
  return !EN_NOMINAL.test(word);
}

function messageLooksLikeAction(label, locale) {
  const word = firstWord(label);
  if (!word) return false;
  if (locale === 'pt-BR') return looksLikePtInfinitive(word);
  return ['send', 'receive', 'notify', 'submit', 'request', 'ask', 'reply', 'inform'].includes(word);
}

// Conformance rank of each element (theory §2 "Conf." column plus the v1
// Analytic subset that makes up the bizify "descriptive+" palette).
const RANK = { D: 0, 'D+': 1, A: 2, F: 3 };
const DECLARED = { descriptive: 0, 'descriptive+': 1, analytic: 2 };
const RANK_NAME = ['descriptive', 'descriptive+', 'analytic', 'full'];

function nodeRank(node) {
  if (node.kind === 'task') {
    if (['manual', 'script', 'business-rule'].includes(node.taskType)) return RANK.F;
    if (['send', 'receive'].includes(node.taskType)) return RANK['D+'];
  }
  if (node.marker) return RANK.A;
  if (node.kind === 'gateway') {
    if (node.gateway === 'inclusive') return RANK['D+'];
    if (node.gateway === 'event-based') return RANK.A;
  }
  if (node.kind === 'event') {
    const trig = node.trigger;
    if (node.isBoundary) {
      return ['timer', 'message', 'error'].includes(trig) ? RANK['D+'] : RANK.A;
    }
    if (node.event === 'start') return ['none', 'message', 'timer'].includes(trig) ? RANK.D : RANK.A;
    if (node.event === 'end') return ['none', 'message', 'terminate'].includes(trig) ? RANK.D : RANK.A;
    if (!node.throwing && ['message', 'timer'].includes(trig)) return RANK['D+'];
    return RANK.A;
  }
  return RANK.D;
}

// Walk back from a join's incoming branch through single-predecessor chains
// until a split gateway (or an ambiguous point) is found.
function branchOrigin(model, startId) {
  const seen = new Set();
  let cursor = model.nodeById.get(startId);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    if (cursor.kind === 'gateway' && model.seqOut.get(cursor.id).length > 1) return cursor;
    const preds = model.seqIn.get(cursor.id);
    if (preds.length !== 1) return null;
    cursor = model.nodeById.get(preds[0].from);
  }
  return null;
}

function reachable(model, seeds, forward = true) {
  const seen = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    const id = queue.shift();
    const next = forward
      ? [...model.seqOut.get(id).map((flow) => flow.to), ...(model.boundariesOf.get(id) || []).map((node) => node.id)]
      : [...model.seqIn.get(id).map((flow) => flow.from), ...(model.nodeById.get(id)?.isBoundary ? [model.nodeById.get(id).attachedTo] : [])];
    for (const nextId of next) {
      if (!seen.has(nextId)) {
        seen.add(nextId);
        queue.push(nextId);
      }
    }
  }
  return seen;
}

function flowSubject(flow) {
  return flow.id || `${flow.from}->${flow.to}`;
}

export function checkRules(model, advisories) {
  const { fail, warn } = advisories;
  const { nodes, flows, nodeById, seqIn, seqOut, locale } = model;
  const name = (id) => nodeById.get(id)?.label || id;

  // --- Flow endpoint rules ------------------------------------------------
  for (const flow of flows) {
    const a = flow.fromNode;
    const b = flow.toNode;
    if (flow.type === 'sequence') {
      if (!a || !b) {
        fail('R-BPMN-01', `Sequence flow "${flowSubject(flow)}" touches pool "${flow.fromPool?.id === flow.from ? flow.from : flow.to}" — sequence flow stays inside a pool; use a message flow to reach a participant.`);
        continue;
      }
      if ([a, b].some((node) => node.kind === 'annotation')) fail('R-BPMN-23', `Sequence flow "${flowSubject(flow)}" touches an annotation — link annotations with an association.`);
      if ([a, b].some(isData)) fail('R-BPMN-24', `Sequence flow "${flowSubject(flow)}" touches data "${[a, b].find(isData).id}" — sequence flow is execution order; attach data with an association.`);
      if (a.pool !== b.pool) fail('R-BPMN-01', `Sequence flow "${name(a.id)}" -> "${name(b.id)}" crosses from pool "${a.pool}" to "${b.pool}" — use a message flow between pools.`);
      if (b.event === 'start') fail('R-BPMN-05', `Start event "${name(b.id)}" has an incoming sequence flow from "${name(a.id)}".`);
      if (a.event === 'end') fail('R-BPMN-07', `End event "${name(a.id)}" has an outgoing sequence flow to "${name(b.id)}".`);
      if (b.isBoundary) fail('R-BPMN-11', `Boundary event "${name(b.id)}" has an incoming sequence flow — boundary events are triggered on their activity.`);
    } else if (flow.type === 'message') {
      for (const node of [a, b].filter(Boolean)) {
        if (node.kind === 'annotation') fail('R-BPMN-23', `Message flow "${flowSubject(flow)}" touches annotation "${node.id}".`);
        else if (isData(node)) fail('R-BPMN-24', `Message flow "${flowSubject(flow)}" touches data "${node.id}" — use an association.`);
        else if (node.kind === 'gateway') fail('R-BPMN-04', `Message flow "${flowSubject(flow)}" touches gateway "${name(node.id)}" — gateways never send or receive messages; anchor it on a task, message event or pool.`);
        else if (node.kind === 'event' && node.trigger !== 'message') fail('R-BPMN-04', `Message flow "${flowSubject(flow)}" touches event "${name(node.id)}" whose trigger is "${node.trigger}" — only message events carry message flows.`);
      }
      if (a?.event === 'start') fail('R-BPMN-06', `Start event "${name(a.id)}" has an outgoing message flow.`);
      const poolA = a ? a.pool : flow.from;
      const poolB = b ? b.pool : flow.to;
      if (poolA === poolB) fail('R-BPMN-03', `Message flow "${flowSubject(flow)}" connects two objects of pool "${poolA}" — use lanes and a sequence flow inside one pool.`);
    } else {
      if (!a || !b) {
        fail('R-BPMN-24', `Association "${flowSubject(flow)}" references a pool — associations link data or annotations to flow elements.`);
        continue;
      }
      if (!isArtifact(a) && !isArtifact(b)) fail('R-BPMN-24', `Association "${flowSubject(flow)}" links two flow nodes — use a sequence flow for order, an association only for data or annotations.`);
    }
  }

  // --- Default / conditional flows (R-13, R-14, R-15) ----------------------
  for (const node of nodes.filter(isFlowNode)) {
    const outs = seqOut.get(node.id);
    const defaults = outs.filter((flow) => flow.default);
    if (defaults.length > 1) fail('R-BPMN-14', `"${name(node.id)}" has ${defaults.length} default flows — at most one per source.`);
    for (const flow of outs) {
      if (flow.default && !(isActivity(node) || (node.kind === 'gateway' && ['exclusive', 'inclusive'].includes(node.gateway)))) {
        fail('R-BPMN-14', `Default flow "${flowSubject(flow)}" leaves "${name(node.id)}" — default flows leave only exclusive/inclusive gateways or activities.`);
      }
      if (flow.conditional) {
        if (!isActivity(node)) fail('R-BPMN-15', `Conditional flow "${flowSubject(flow)}" leaves "${name(node.id)}" — on gateways the condition is just the gate label (no mini-diamond); drop "conditional".`);
        else if (outs.length < 2) fail('R-BPMN-15', `Conditional flow "${flowSubject(flow)}" is the only outgoing flow of "${name(node.id)}" — add the alternative (or a default) flow, or use a gateway.`);
      }
      if (node.kind === 'gateway' && ['parallel', 'event-based'].includes(node.gateway) && (flow.label || flow.conditional || flow.default)) {
        fail('R-BPMN-13', `Flow "${flowSubject(flow)}" out of ${node.gateway} gateway "${name(node.id)}" carries a condition or label — all branches of this gateway are taken unconditionally.`);
      }
    }
  }

  // --- Events -------------------------------------------------------------
  for (const node of nodes.filter((item) => item.kind === 'event')) {
    if (node.isBoundary) {
      const host = nodeById.get(node.attachedTo);
      if (!isActivity(host)) {
        fail('R-BPMN-11', `Boundary event "${name(node.id)}" is attached to "${node.attachedTo}", which is not an activity (task, sub-process or call activity).`);
      } else if (host.pool !== node.pool || host.lane !== node.lane) {
        fail('R-BPMN-11', `Boundary event "${name(node.id)}" must sit in the lane of its activity "${name(host.id)}".`);
      }
      const outs = seqOut.get(node.id);
      if (!outs.length) fail('R-BPMN-11', `Boundary event "${name(node.id)}" has no outgoing sequence flow — the exception path must lead somewhere.`);
      if (outs.length > 1) warn('R-BPMN-11', `Boundary event "${name(node.id)}" has ${outs.length} outgoing flows — prefer exactly one, then a gateway.`, node.id);
    }
    if (node.trigger === 'terminate' && node.event !== 'end') fail('R-BPMN-07', `"${name(node.id)}" uses the terminate trigger, which exists only on end events.`);
    if ((node.event === 'intermediate') && !node.label) warn('R-BPMN-26', `Intermediate/boundary event "${node.id}" has no label — name what happened ("4 h elapsed").`, node.id);
  }

  // --- Gateways (R-12, R-16..R-20) -----------------------------------------
  for (const node of nodes.filter((item) => item.kind === 'gateway')) {
    const ins = seqIn.get(node.id);
    const outs = seqOut.get(node.id);
    if (!outs.length) fail('R-BPMN-12', `Gateway "${name(node.id)}" has no outgoing flow.`);
    else if (outs.length === 1 && ins.length <= 1) fail('R-BPMN-12', `Gateway "${name(node.id)}" has one incoming and one outgoing flow — it neither splits nor joins; remove it.`);
    const isSplit = outs.length > 1;
    const isJoin = ins.length > 1;
    if (isSplit && isJoin) warn('R-BPMN-20', `Gateway "${name(node.id)}" both joins (${ins.length} in) and splits (${outs.length} out) — use a join gateway followed by a split gateway.`, node.id);
    if (node.gateway === 'event-based') {
      if (outs.length < 2) fail('R-BPMN-18', `Event-based gateway "${name(node.id)}" needs at least two outgoing flows.`);
      for (const flow of outs) {
        const target = nodeById.get(flow.to);
        const ok = (target?.kind === 'event' && target.event === 'intermediate' && !target.throwing && !target.isBoundary)
          || (target?.kind === 'task' && target.taskType === 'receive');
        if (!ok) fail('R-BPMN-18', `Event-based gateway "${name(node.id)}" leads to "${name(flow.to)}" — each branch must start with a catching intermediate event or a receive task.`);
      }
    }
    if (isSplit && ['exclusive', 'inclusive'].includes(node.gateway)) {
      for (const flow of outs) {
        if (!flow.default && !flow.label) warn('R-BPMN-16', `Gate "${name(node.id)}" -> "${name(flow.to)}" has no label — label every non-default branch of an ${node.gateway} split (an answer or condition).`, node.id);
      }
    }
    const merelyJoins = isJoin && !isSplit;
    if (node.label && (['parallel', 'event-based'].includes(node.gateway) || merelyJoins)) {
      warn('R-BPMN-17', `Gateway "${node.id}" is labelled "${node.label}" — leave ${merelyJoins ? 'merge' : node.gateway} gateways unlabelled.`, node.id);
    }
    if (isSplit && ['exclusive', 'inclusive'].includes(node.gateway) && !node.label) {
      warn('R-BPMN-16', `Split gateway "${node.id}" has no question label ("Approved?").`, node.id);
    }
    if (merelyJoins) {
      const origins = ins.map((flow) => branchOrigin(model, flow.from));
      const origin = origins[0];
      if (origin && origins.every((item) => item === origin) && origin.gateway !== node.gateway) {
        const effect = origin.gateway === 'exclusive' && node.gateway === 'parallel' ? 'a deadlock' : origin.gateway === 'parallel' && node.gateway === 'exclusive' ? 'multiple triggering' : 'mismatched semantics';
        warn('R-BPMN-19', `Split "${name(origin.id)}" (${origin.gateway}) is joined by "${node.id}" (${node.gateway}) — ${effect}; match the gateway types.`, node.id);
      }
    }
  }

  // --- Per-pool process rules (R-08, R-09, R-10, R-21, R-28) ---------------
  for (const pool of model.pools.filter((item) => !item.blackBox)) {
    const members = nodes.filter((node) => node.pool === pool.id && isFlowNode(node));
    if (!members.length) continue;
    const starts = members.filter((node) => node.event === 'start');
    const ends = members.filter((node) => node.event === 'end');
    if (starts.length && !ends.length) fail('R-BPMN-08', `Pool "${pool.label}" has a start event but no end event.`);
    if (ends.length && !starts.length) fail('R-BPMN-08', `Pool "${pool.label}" has an end event but no start event.`);
    if (!starts.length && !ends.length) warn('R-BPMN-09', `Pool "${pool.label}" has no explicit start or end event — show both.`, pool.id);
    if (starts.length > 1) warn('R-BPMN-10', `Pool "${pool.label}" has ${starts.length} start events — keep one unless alternative triggers are intended.`, pool.id);
    const activities = members.filter(isActivity);
    if (activities.length > 20) fail('R-BPMN-28', `Pool "${pool.label}" has ${activities.length} activities on one level — above 20 the diagram is unreadable; collapse detail into sub-processes.`);
    else if (activities.length > 10) warn('R-BPMN-28', `Pool "${pool.label}" has ${activities.length} activities — keep about 10 per level; move detail into collapsed sub-processes.`, pool.id);
    if (starts.length) {
      const fromStart = reachable(model, starts.map((node) => node.id));
      for (const node of members.filter((item) => !fromStart.has(item.id))) {
        fail('R-BPMN-21', `"${name(node.id)}" cannot be reached from any start event of pool "${pool.label}" — connect it or remove it.`);
      }
    }
    if (ends.length) {
      const toEnd = reachable(model, ends.map((node) => node.id), false);
      for (const node of members.filter((item) => !toEnd.has(item.id))) {
        warn('R-BPMN-21', `"${name(node.id)}" has no path to an end event (dead end).`, node.id);
      }
    }
  }

  // --- Activities (R-22, R-26, R-29) ---------------------------------------
  const endNames = new Map();
  for (const node of nodes) {
    if (isActivity(node)) {
      if (!seqIn.get(node.id).length) warn('R-BPMN-22', `Activity "${name(node.id)}" has no incoming sequence flow.`, node.id);
      if (!seqOut.get(node.id).length) warn('R-BPMN-22', `Activity "${name(node.id)}" has no outgoing sequence flow.`, node.id);
      if (seqIn.get(node.id).length > 1) warn('R-BPMN-29', `Activity "${name(node.id)}" has ${seqIn.get(node.id).length} incoming flows — an implicit merge; add an explicit exclusive join gateway.`, node.id);
      const word = firstWord(node.label);
      if (GENERIC_VERBS.has(word)) warn('R-BPMN-26', `Activity "${node.label}" starts with a generic verb — say what is done to what ("Validate invoice").`, node.id);
      else if (node.kind === 'task' && !startsWithVerb(node.label, locale)) warn('R-BPMN-26', `Task "${node.label}" is not verb + object — start with the action ("${locale === 'pt-BR' ? 'Validar fatura' : 'Validate invoice'}").`, node.id);
    }
    if (node.event === 'end' && node.label) {
      const key = node.label.trim().toLowerCase();
      if (endNames.has(key) && endNames.get(key).pool === node.pool) warn('R-BPMN-26', `End events "${endNames.get(key).id}" and "${node.id}" share the name "${node.label}" — each end state gets its own name.`, node.id);
      else endNames.set(key, node);
    }
  }

  // --- Message labels (R-27) -----------------------------------------------
  for (const flow of flows.filter((item) => item.type === 'message')) {
    if (!flow.label) warn('R-BPMN-27', `Message flow "${flowSubject(flow)}" has no label — name the message ("Purchase order").`, flowSubject(flow));
    else if (messageLooksLikeAction(flow.label, locale)) warn('R-BPMN-27', `Message flow label "${flow.label}" reads as an action — name the message itself (a noun).`, flowSubject(flow));
  }

  // --- Lanes (R-30 soft) ---------------------------------------------------
  for (const pool of model.pools) {
    for (const lane of pool.lanes) {
      if (!nodes.some((node) => node.lane === lane.id && isFlowNode(node))) warn('R-BPMN-30', `Lane "${lane.label}" holds no flow node — remove it or place its work.`, lane.id);
    }
  }

  // --- Conformance palette (R-31) ------------------------------------------
  const declared = model.meta.conformance;
  if (!declared) {
    warn('R-BPMN-31', 'meta.conformance is not declared — state the palette ("descriptive", "descriptive+" or "analytic").', 'meta');
  } else {
    const limit = DECLARED[declared];
    for (const node of nodes) {
      const rank = nodeRank(node);
      if (rank > limit) warn('R-BPMN-31', `"${name(node.id)}" belongs to the ${RANK_NAME[rank]} palette, outside the declared "${declared}".`, node.id);
    }
    for (const flow of flows) {
      if (flow.default && limit < RANK['D+']) warn('R-BPMN-31', `Default flow "${flowSubject(flow)}" is outside the "descriptive" palette.`, flowSubject(flow));
      if (flow.conditional && limit < RANK.A) warn('R-BPMN-31', `Conditional flow "${flowSubject(flow)}" belongs to the analytic palette.`, flowSubject(flow));
    }
  }
}
