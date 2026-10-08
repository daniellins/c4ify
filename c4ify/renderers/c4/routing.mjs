// Orthogonal relationship routing, ported from Archify 2.17.0-dev.1
// (renderers/architecture/render-architecture.mjs, `routeClearsComponents` …
// `pathFor`). The algorithm is unchanged; it is wrapped in a factory so one
// router serves one view, and obstacles are the view's element boxes only:
// routes may cross boundary frames (perpendicularly, enforced by the border-run
// gate) but never an unrelated element.

import {
  anchor,
  automaticPortRhythmBridge,
  automaticPortSpread,
  chosenSide,
  defaultFromSide,
  defaultToSide,
  normalizeRoutePoints,
  routeHonorsEndpointSides,
  roundedPath,
  segmentIntersectsRect,
} from '../shared/geometry.mjs';

const OUTWARD_SIDE_VECTOR = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};
const AUTOMATIC_PORT_CORNER_GUTTER = 16;
const AUTOMATIC_PORT_ALIGNMENT_DELTA = 16;

function outwardStub(point, side, distance = 24) {
  const [dx, dy] = OUTWARD_SIDE_VECTOR[side] || [0, 0];
  return [point[0] + dx * distance, point[1] + dy * distance];
}

function collinearBacktrack(a, b, c) {
  const first = [b[0] - a[0], b[1] - a[1]];
  const second = [c[0] - b[0], c[1] - b[1]];
  const cross = first[0] * second[1] - first[1] * second[0];
  const dot = first[0] * second[0] + first[1] * second[1];
  return Math.abs(cross) <= 0.0001 && dot < -0.0001;
}

function sideAwareBridgeCandidates(start, end, fromSide, toSide) {
  const startStub = outwardStub(start, fromSide);
  const endStub = outwardStub(end, toSide);
  const rawCandidates = [];
  const minimumBridge = 16;
  const verticalSides = new Set(['top', 'bottom']);
  const horizontalSides = new Set(['left', 'right']);
  if (verticalSides.has(fromSide) && verticalSides.has(toSide) && Math.abs(start[0] - end[0]) < minimumBridge) {
    for (const channelX of [Math.max(start[0], end[0]) + minimumBridge, Math.min(start[0], end[0]) - minimumBridge]) {
      rawCandidates.push([startStub, [channelX, startStub[1]], [channelX, endStub[1]], endStub]);
    }
  }
  if (horizontalSides.has(fromSide) && horizontalSides.has(toSide) && Math.abs(start[1] - end[1]) < minimumBridge) {
    for (const channelY of [Math.max(start[1], end[1]) + minimumBridge, Math.min(start[1], end[1]) - minimumBridge]) {
      rawCandidates.push([startStub, [startStub[0], channelY], [endStub[0], channelY], endStub]);
    }
  }
  rawCandidates.push(
    [startStub, [endStub[0], startStub[1]], endStub],
    [startStub, [startStub[0], endStub[1]], endStub],
  );
  return rawCandidates.map((candidate) => normalizeRoutePoints([start, ...candidate, end]))
    .filter((points) => points.length >= 2)
    .filter((points) => !collinearBacktrack(points[0], points[1], points[2] || points[1]))
    .filter((points) => !collinearBacktrack(points.at(-3) || points.at(-2), points.at(-2), points.at(-1)))
    .filter((points) => routeHonorsEndpointSides(points, fromSide, toSide))
    .map((points) => points.slice(1, -1));
}

function portHasCornerClearance(rect, side, point) {
  if (side === 'left' || side === 'right') {
    const inset = Math.min(AUTOMATIC_PORT_CORNER_GUTTER, rect.height / 2);
    return point[1] >= rect.y + inset && point[1] <= rect.y + rect.height - inset;
  }
  if (side === 'top' || side === 'bottom') {
    const inset = Math.min(AUTOMATIC_PORT_CORNER_GUTTER, rect.width / 2);
    return point[0] >= rect.x + inset && point[0] <= rect.x + rect.width - inset;
  }
  return false;
}

// boxes: Map id → { id, x, y, width, height, cx, cy }
// relations: [{ from, to, fromSide?, toSide?, route?, via?, labelAt? … }]
export function createRouter(boxes, relations) {
  function routeClearsComponents(conn, points, clearance = 2) {
    const endpointIds = new Set([conn.from, conn.to]);
    for (const box of boxes.values()) {
      if (endpointIds.has(box.id)) continue;
      for (let index = 0; index < points.length - 1; index += 1) {
        if (segmentIntersectsRect({ start: points[index], end: points[index + 1] }, box, clearance)) return false;
      }
    }
    return true;
  }

  function routeClearsEndpointComponents(points, from, to) {
    const lastSegment = points.length - 2;
    for (let index = 0; index <= lastSegment; index += 1) {
      const segment = { start: points[index], end: points[index + 1] };
      if (index > 0 && segmentIntersectsRect(segment, from)) return false;
      if (index < lastSegment && segmentIntersectsRect(segment, to)) return false;
    }
    return true;
  }

  function alignFacingPorts(conn, from, to, start, end, fromSide, toSide, ports) {
    const hasExplicitGeometry = conn.via || (conn.route && conn.route !== 'auto') || conn.labelAt;
    const horizontallyFacing = (fromSide === 'right' && toSide === 'left') || (fromSide === 'left' && toSide === 'right');
    const verticallyFacing = (fromSide === 'bottom' && toSide === 'top') || (fromSide === 'top' && toSide === 'bottom');
    if (hasExplicitGeometry || (!horizontallyFacing && !verticallyFacing)) return { start, end };
    const fromSpread = Boolean(ports?.from);
    const toSpread = Boolean(ports?.to);
    if (fromSpread && toSpread) return { start, end };
    const hasExplicitSides = (conn.fromSide && conn.fromSide !== 'auto') || (conn.toSide && conn.toSide !== 'auto');
    if (!fromSpread && !toSpread && hasExplicitSides) return { start, end };
    const alignmentDelta = horizontallyFacing ? Math.abs(start[1] - end[1]) : Math.abs(start[0] - end[0]);
    if (alignmentDelta >= AUTOMATIC_PORT_ALIGNMENT_DELTA) return { start, end };
    const alignEndToStart = horizontallyFacing ? { start, end: [end[0], start[1]] } : { start, end: [start[0], end[1]] };
    const alignStartToEnd = horizontallyFacing ? { start: [start[0], end[1]], end } : { start: [end[0], start[1]], end };
    const candidates = fromSpread ? [alignEndToStart] : toSpread ? [alignStartToEnd] : [alignEndToStart, alignStartToEnd];
    for (const candidate of candidates) {
      const points = [candidate.start, candidate.end];
      if (portHasCornerClearance(from, fromSide, candidate.start)
          && portHasCornerClearance(to, toSide, candidate.end)
          && routeHonorsEndpointSides(points, fromSide, toSide)
          && routeClearsEndpointComponents(points, from, to)
          && routeClearsComponents(conn, points)) {
        return candidate;
      }
    }
    return { start, end };
  }

  function routeVia(conn, from, to, start, end, fromSide, toSide) {
    if (conn.via) return conn.via;
    switch (conn.route || 'auto') {
      case 'straight':
        return [];
      case 'orthogonal-h': {
        const midX = (start[0] + end[0]) / 2;
        return [[midX, start[1]], [midX, end[1]]];
      }
      case 'orthogonal-v': {
        const midY = (start[1] + end[1]) / 2;
        return [[start[0], midY], [end[0], midY]];
      }
      default: {
        const deltaX = Math.abs(start[0] - end[0]);
        const deltaY = Math.abs(start[1] - end[1]);
        if ((deltaX < 4 || deltaY < 4) && routeHonorsEndpointSides([start, end], fromSide, toSide)) return [];
        const rhythmBridge = automaticPortRhythmBridge(start, end, fromSide, toSide, {
          accept: (points) => routeClearsEndpointComponents(points, from, to) && routeClearsComponents(conn, points),
        });
        if (rhythmBridge) return rhythmBridge.slice(1, -1);
        const minimumStub = 8;
        const fromVerticalSide = start[1] === from.y || start[1] === from.y + from.height;
        const toVerticalSide = end[1] === to.y || end[1] === to.y + to.height;
        if (fromVerticalSide && toVerticalSide && deltaX < minimumStub * 2) {
          for (const channelX of [Math.max(start[0], end[0]) + minimumStub * 2, Math.min(start[0], end[0]) - minimumStub * 2]) {
            const candidate = [[channelX, start[1]], [channelX, end[1]]];
            const points = [start, ...candidate, end];
            if (routeHonorsEndpointSides(points, fromSide, toSide) && routeClearsComponents(conn, points)) return candidate;
          }
        }
        const fromHorizontalSide = start[0] === from.x || start[0] === from.x + from.width;
        const toHorizontalSide = end[0] === to.x || end[0] === to.x + to.width;
        if (fromHorizontalSide && toHorizontalSide && deltaY < minimumStub * 2) {
          for (const channelY of [Math.max(start[1], end[1]) + minimumStub * 2, Math.min(start[1], end[1]) - minimumStub * 2]) {
            const candidate = [[start[0], channelY], [end[0], channelY]];
            const points = [start, ...candidate, end];
            if (routeHonorsEndpointSides(points, fromSide, toSide) && routeClearsComponents(conn, points)) return candidate;
          }
        }
        const midX = (start[0] + end[0]) / 2;
        const horizontalFirst = [[midX, start[1]], [midX, end[1]]];
        const midY = (start[1] + end[1]) / 2;
        const verticalFirst = [[start[0], midY], [end[0], midY]];
        const candidates = [horizontalFirst, verticalFirst];
        const sideSafe = candidates.filter((candidate) => routeHonorsEndpointSides([start, ...candidate, end], fromSide, toSide));
        const sideAware = sideAwareBridgeCandidates(start, end, fromSide, toSide);
        const nearParallelPorts = (
          ((fromSide === 'top' || fromSide === 'bottom') && (toSide === 'top' || toSide === 'bottom') && deltaX < minimumStub * 2)
          || ((fromSide === 'left' || fromSide === 'right') && (toSide === 'left' || toSide === 'right') && deltaY < minimumStub * 2)
        );
        const ordered = [
          ...(nearParallelPorts ? sideAware : sideSafe),
          ...(nearParallelPorts ? sideSafe : sideAware),
          ...candidates.filter((candidate) => !sideSafe.includes(candidate)),
        ];
        for (const candidate of ordered) {
          const points = [start, ...candidate, end];
          if (routeClearsEndpointComponents(points, from, to) && routeClearsComponents(conn, points)) return candidate;
        }
        return sideSafe[0] || sideAware[0] || horizontalFirst;
      }
    }
  }

  // C4 views read top-down (users above, stores below), so vertical neighbours
  // connect bottom → top; Archify's default prefers left/right whenever the
  // centres differ at all, which sends rows of arrows sideways.
  function c4Sides(from, to) {
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const verticalGap = dy > 0 ? to.y - (from.y + from.height) : from.y - (to.y + to.height);
    if (verticalGap > 24 && Math.abs(dx) < (from.width + to.width) / 2 + 40) {
      return dy > 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
    }
    if (verticalGap > 24 && Math.abs(dy) > Math.abs(dx) * 0.35) {
      return dy > 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
    }
    return { fromSide: defaultFromSide(from, to), toSide: defaultToSide(from, to) };
  }

  // Side choice is obstacle-aware: try the reading-order sides first, then
  // facing sides, then same-side gutters (out, along the gap, back in); keep
  // the first pair whose provisional route touches no unrelated element.
  const SIDE_PAIRS = [
    ['bottom', 'top'], ['top', 'bottom'], ['right', 'left'], ['left', 'right'],
    ['right', 'top'], ['left', 'top'], ['bottom', 'left'], ['bottom', 'right'],
    ['right', 'right'], ['left', 'left'], ['bottom', 'bottom'], ['top', 'top'],
  ];
  const sidesCache = new Map();
  function connectionSides(conn) {
    if (sidesCache.has(conn)) return sidesCache.get(conn);
    const from = boxes.get(conn.from);
    const to = boxes.get(conn.to);
    const preferred = c4Sides(from, to);
    const fixedFrom = conn.fromSide && conn.fromSide !== 'auto' ? conn.fromSide : null;
    const fixedTo = conn.toSide && conn.toSide !== 'auto' ? conn.toSide : null;
    let chosen = { fromSide: fixedFrom || preferred.fromSide, toSide: fixedTo || preferred.toSide };
    if (!conn.via && (!fixedFrom || !fixedTo)) {
      const pairs = [[preferred.fromSide, preferred.toSide], ...SIDE_PAIRS]
        .filter(([fromSide, toSide]) => (!fixedFrom || fromSide === fixedFrom) && (!fixedTo || toSide === fixedTo));
      for (const [fromSide, toSide] of pairs) {
        const start = anchor(from, fromSide);
        const end = anchor(to, toSide);
        const points = [start, ...routeVia(conn, from, to, start, end, fromSide, toSide), end];
        if (routeHonorsEndpointSides(points, fromSide, toSide)
            && routeClearsEndpointComponents(points, from, to)
            && routeClearsComponents(conn, points, 6)) {
          chosen = { fromSide, toSide };
          break;
        }
      }
    }
    sidesCache.set(conn, chosen);
    return chosen;
  }

  const automaticPorts = automaticPortSpread(relations, boxes, {
    maxSpacing: 40,
    sideFor: (conn, endpoint) => connectionSides(conn)[endpoint === 'source' ? 'fromSide' : 'toSide'],
  });
  const cache = new Map();

  function pathFor(conn) {
    if (cache.has(conn)) return cache.get(conn);
    const from = boxes.get(conn.from);
    const to = boxes.get(conn.to);
    const ports = automaticPorts.get(conn);
    const { fromSide, toSide } = connectionSides(conn);
    const baseStart = ports?.from || anchor(from, fromSide);
    const baseEnd = ports?.to || anchor(to, toSide);
    const { start, end } = alignFacingPorts(conn, from, to, baseStart, baseEnd, fromSide, toSide, ports);
    const points = [start, ...routeVia(conn, from, to, start, end, fromSide, toSide), end];
    const routed = { d: roundedPath(points, 8), points };
    cache.set(conn, routed);
    return routed;
  }

  function endpointSide(conn, endpoint) {
    const field = endpoint === 'source' ? 'fromSide' : 'toSide';
    if (conn[field] && conn[field] !== 'auto') return conn[field];
    return connectionSides(conn)[field];
  }

  // How many routed relationships leave/enter each element side; a label sits
  // on the end of its route that no other relationship shares.
  function sharedEnds(conn) {
    const { fromSide, toSide } = connectionSides(conn);
    let source = 0;
    let target = 0;
    for (const other of relations) {
      const sides = connectionSides(other);
      if ((other.from === conn.from && sides.fromSide === fromSide) || (other.to === conn.from && sides.toSide === fromSide)) source += 1;
      if ((other.to === conn.to && sides.toSide === toSide) || (other.from === conn.to && sides.fromSide === toSide)) target += 1;
    }
    return { source, target };
  }

  return { pathFor, endpointSide, sharedEnds };
}
