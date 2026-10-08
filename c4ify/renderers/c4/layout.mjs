// Row/column assignment for one C4 view (pure; unit-tested directly).
//
// Authors give semantics, not coordinates. A C4 view reads top-down: the
// actors that start the conversation on top, the scope in the middle (inside
// its boundary for container/component views), and what the scope depends on
// at the bottom. Inside the scope, elements are ranked by the longest path of
// in-scope relationships, data stores sink to the last inner row, and every
// row is ordered by the barycenter of its neighbours to keep arrows short and
// uncrossed. `view.placement` overrides any element's { row, col }.

const STORE = /\b(sql|postgres(?:ql)?|mysql|mariadb|oracle|mongo(?:db)?|redis|cassandra|dynamo(?:db)?|elasticsearch|opensearch|database|banco de dados|db|s3|blob|bucket|data lake|warehouse)\b/i;

const QUEUE = /\b(rabbitmq|kafka|sqs|sns|pub\/?sub|queue|fila|event ?hubs?|service bus|nats|activemq|kinesis)\b/i;

// Infrastructure the applications share: drawn in the last inner row.
export function isInfrastructure(element) {
  return isStore(element) || element.shape === 'queue' || QUEUE.test(element.technology || '');
}

export function isStore(element) {
  return element.shape === 'database' || (element.tags || []).some((tag) => /^(database|db|store)$/i.test(tag))
    || (element.type !== 'person' && element.type !== 'softwareSystem' && STORE.test(element.technology || ''));
}

export function assignRows(view, resolved, maxPerRow = 4) {
  const coreIds = new Set(resolved.core.map((element) => element.id));
  const edges = resolved.relationships;
  const wrap = (row) => {
    const chunks = [];
    for (let start = 0; start < row.length; start += maxPerRow) chunks.push(row.slice(start, start + maxPerRow));
    return chunks;
  };

  if (view.type === 'systemLandscape') {
    const rows = [
      ...wrap(resolved.elements.filter((element) => element.type === 'person')),
      ...wrap(resolved.elements.filter((element) => element.type !== 'person' && !element.external)),
      ...wrap(resolved.elements.filter((element) => element.type !== 'person' && element.external)),
    ];
    return finish(view, { top: [], core: rows, side: [], bottom: [] }, edges, false);
  }

  const outside = resolved.elements.filter((element) => !coreIds.has(element.id));
  const callsIn = new Set(edges.filter((edge) => coreIds.has(edge.to) && !coreIds.has(edge.from)).map((edge) => edge.from));
  const calledBy = new Set(edges.filter((edge) => coreIds.has(edge.from) && !coreIds.has(edge.to)).map((edge) => edge.to));
  // Initiators (people, upstream systems) go on top; everything the scope
  // calls goes below, or, in container/component views, beside the boundary
  // at the height of its callers so those arrows never cross the stores and
  // queues in the boundary's last row. People always read as initiators.
  const top = outside.filter((element) => element.type === 'person' || (callsIn.has(element.id) && !calledBy.has(element.id)));
  const downstream = outside.filter((element) => !top.includes(element));
  const core = rankCore(resolved.core, edges, coreIds).flatMap(wrap);
  const zoomed = view.type === 'container' || view.type === 'component';
  let side = [];
  let bottom = downstream;
  if (zoomed && core.length > 1 && downstream.length) {
    const rowOf = new Map(core.flatMap((row, index) => row.map((element) => [element.id, index])));
    const callerRow = (element) => {
      const rows = edges.filter((edge) => edge.to === element.id && rowOf.has(edge.from)).map((edge) => rowOf.get(edge.from));
      return rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : core.length - 1;
    };
    // Called only from the last boundary row: straight down is shortest.
    const fromLastRow = (element) => edges.filter((edge) => edge.to === element.id && rowOf.has(edge.from)).every((edge) => rowOf.get(edge.from) === core.length - 1);
    const ordered = downstream.filter((element) => !fromLastRow(element)).sort((left, right) => callerRow(left) - callerRow(right));
    side = ordered.slice(0, core.length);
    bottom = [...ordered.slice(core.length), ...downstream.filter(fromLastRow)];
    // A contiguous block of boundary rows centred on the callers.
    const mean = side.reduce((sum, element) => sum + callerRow(element), 0) / side.length;
    const first = Math.min(core.length - side.length, Math.max(0, Math.round(mean - (side.length - 1) / 2)));
    side = side.map((element, index) => ({ element, row: first + index }));
  }
  return finish(view, { top: wrap(top), core, side, bottom: wrap(bottom) }, edges, zoomed);
}

// Columns: boundary rows are centred over the core width; the side column
// sits one step right of it; top and bottom rows centre over the whole width.
function finish(view, { top, core, side, bottom }, edges, zoomed) {
  const rows = [...top, ...core, ...bottom];
  const coreStart = top.length;
  const coreWidth = Math.max(0, ...core.map((row) => row.length));
  const sideCol = side.length ? coreWidth : null;
  const fixed = new Map(side.map(({ element, row }) => [element.id, { row: coreStart + row, col: sideCol }]));
  orderByBarycenter(rows, edges, fixed);
  const width = Math.max(...rows.map((row) => row.length), coreWidth + (side.length ? 1 : 0));
  const cells = new Map(fixed);
  rows.forEach((row, rowIndex) => {
    // With a side column, the boundary rows and the people above them centre
    // over the core; everything else centres over the whole canvas.
    const span = side.length && rowIndex < coreStart + core.length ? coreWidth : width;
    const offset = (span - row.length) / 2;
    row.forEach((element, index) => cells.set(element.id, { row: rowIndex, col: offset + index }));
  });
  // Rows wider than the core (people above a narrow boundary) may start left
  // of column 0; shift everything so the leftmost cell is column 0.
  const minCol = Math.min(...[...cells.values()].map((cell) => cell.col));
  if (minCol < 0) for (const [id, cell] of cells) cells.set(id, { row: cell.row, col: cell.col - minCol });
  const sideIds = new Set(fixed.keys());
  for (const [id, cell] of Object.entries(view.placement || {})) {
    if (!cells.has(id)) continue;
    cells.set(id, { row: cell.row, col: cell.col });
    sideIds.delete(id);
  }
  const boundaryRows = new Set();
  if (zoomed) for (let index = coreStart; index < coreStart + core.length; index += 1) boundaryRows.add(index);
  return { cells, boundaryRows, sideIds };
}

function pushRow(rows, elements) {
  if (elements.length) rows.push(elements);
}

// Longest-path layering over in-scope edges (cycles broken by authored order),
// with stores pinned to the last layer.
function rankCore(core, edges, coreIds) {
  const inner = edges.filter((edge) => coreIds.has(edge.from) && coreIds.has(edge.to));
  const rank = new Map(core.map((element) => [element.id, 0]));
  const position = new Map(core.map((element, index) => [element.id, index]));
  for (let pass = 0; pass < core.length; pass += 1) {
    let changed = false;
    for (const edge of inner) {
      // Back edges (to an element authored earlier and already ranked above)
      // do not push ranks, so cycles terminate.
      if (position.get(edge.to) < position.get(edge.from) && rank.get(edge.to) <= rank.get(edge.from)) continue;
      const next = rank.get(edge.from) + 1;
      if (next > rank.get(edge.to)) {
        rank.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // Elements nothing calls (workers, schedulers) are peers of the services
  // they feed: same row, beside them, never stacked above them where their
  // outbound arrows would have to cross the service.
  const infra = new Set(core.filter(isInfrastructure).map((element) => element.id));
  for (const element of core) {
    if (infra.has(element.id) || edges.some((edge) => edge.to === element.id)) continue;
    const fed = inner.filter((edge) => edge.from === element.id && !infra.has(edge.to)).map((edge) => rank.get(edge.to));
    if (fed.length) {
      rank.set(element.id, Math.min(...fed));
    } else if (inner.some((edge) => edge.from === element.id) && !edges.some((edge) => edge.to === element.id)) {
      // Feeds only infrastructure and nobody calls it: the deepest app row,
      // right above the stores and queues it uses.
      rank.set(element.id, Math.max(0, ...core.filter((other) => !infra.has(other.id) && other.id !== element.id).map((other) => rank.get(other.id))));
    }
  }
  const stores = core.filter((element) => infra.has(element.id));
  const others = core.filter((element) => !infra.has(element.id));
  const layers = [];
  for (const element of others) {
    const layer = rank.get(element.id);
    (layers[layer] ||= []).push(element);
  }
  const compact = layers.filter(Boolean);
  if (stores.length) compact.push(stores);
  return compact;
}

function orderByBarycenter(rows, edges, fixed = new Map()) {
  const neighbours = new Map();
  for (const edge of edges) {
    if (!neighbours.has(edge.from)) neighbours.set(edge.from, []);
    if (!neighbours.has(edge.to)) neighbours.set(edge.to, []);
    neighbours.get(edge.from).push(edge.to);
    neighbours.get(edge.to).push(edge.from);
  }
  const column = new Map();
  const place = (row) => row.forEach((element, index) => column.set(element.id, index - (row.length - 1) / 2));
  rows.forEach(place);
  // Fixed cells (the side column) pull their neighbours toward them.
  const centre = Math.max(1, ...rows.map((row) => row.length)) / 2;
  for (const [id, cell] of fixed) column.set(id, cell.col - centre + 0.5);
  // Two sweeps (down, then up) of the classic barycenter heuristic.
  const sweep = (order) => {
    for (const rowIndex of order) {
      const row = rows[rowIndex];
      const score = new Map(row.map((element, index) => {
        const placed = (neighbours.get(element.id) || []).filter((id) => column.has(id) && !row.some((other) => other.id === id));
        const mean = placed.length ? placed.reduce((sum, id) => sum + column.get(id), 0) / placed.length : index - (row.length - 1) / 2;
        return [element.id, mean];
      }));
      row.sort((left, right) => score.get(left.id) - score.get(right.id));
      place(row);
    }
  };
  const down = rows.map((_row, index) => index);
  sweep(down.slice(1));
  sweep(down.slice(0, -1).reverse());
}
