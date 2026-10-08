// Lane planning for SIPOC links. Every link crosses exactly one gap between
// two adjacent column frames: out of the source card, along one vertical lane
// inside the gap, into the target card. Lanes are chosen by a bounded
// backtracking search so no two unrelated links cross or share a corridor —
// the same test the artifact checker applies (links sharing an endpoint are
// exempt there, so they are exempt here).

import { round } from '../shared/business.mjs';

const LANE_MARGIN = 12;
const LANE_STEP = 8;
const MIN_INTERIOR = 16;
const EPS = 0.01;
const SEARCH_BUDGET = 200000;

function segments(points) {
  return points.slice(0, -1).map((point, index) => [point, points[index + 1]]);
}

function sorted(a, b) {
  return a <= b ? [a, b] : [b, a];
}

function segmentsConflict(s, u) {
  const sHorizontal = Math.abs(s[0][1] - s[1][1]) < EPS;
  const uHorizontal = Math.abs(u[0][1] - u[1][1]) < EPS;
  if (sHorizontal !== uHorizontal) {
    const [h, v] = sHorizontal ? [s, u] : [u, s];
    const [hx0, hx1] = sorted(h[0][0], h[1][0]);
    const [vy0, vy1] = sorted(v[0][1], v[1][1]);
    const x = v[0][0];
    const y = h[0][1];
    return x > hx0 + EPS && x < hx1 - EPS && y > vy0 + EPS && y < vy1 - EPS;
  }
  const axis = sHorizontal ? 0 : 1;
  const fixed = sHorizontal ? 1 : 0;
  if (Math.abs(s[0][fixed] - u[0][fixed]) > EPS) return false;
  const [a0, a1] = sorted(s[0][axis], s[1][axis]);
  const [b0, b1] = sorted(u[0][axis], u[1][axis]);
  return Math.min(a1, b1) - Math.max(a0, b0) > EPS;
}

function sharesEndpoint(a, b) {
  return a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to;
}

function routesConflict(a, pointsA, b, pointsB) {
  if (sharesEndpoint(a, b)) return false;
  return segments(pointsA).some((s) => segments(pointsB).some((u) => segmentsConflict(s, u)));
}

// gap = { key, x0, x1, relations: [{ from, to, fromItem, toItem, start:[x], end:[x] }] }
// Sets relation.points on success; returns { problem } when no plan exists.
export function planLanes(gap) {
  const middle = (gap.x0 + gap.x1) / 2;
  const lanes = [];
  for (let x = gap.x0 + LANE_MARGIN; x <= gap.x1 - LANE_MARGIN + EPS; x += LANE_STEP) lanes.push(round(x));
  lanes.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));

  const placed = [];
  const flexible = [];
  for (const relation of gap.relations) {
    const a = relation.fromItem;
    const b = relation.toItem;
    const ya = round(a.y + a.height / 2);
    const yb = round(b.y + b.height / 2);
    Object.assign(relation, { ya, yb });
    if (Math.abs(ya - yb) < MIN_INTERIOR) {
      // Level cards: one straight segment through their shared height.
      const top = Math.max(a.y, b.y) + 6;
      const bottom = Math.min(a.y + a.height, b.y + b.height) - 6;
      const y = round(Math.min(Math.max((ya + yb) / 2, top), bottom));
      relation.points = [[round(relation.start[0]), y], [round(relation.end[0]), y]];
      placed.push(relation);
    } else {
      flexible.push(relation);
    }
  }
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (routesConflict(placed[i], placed[i].points, placed[j], placed[j].points)) {
        return { problem: `Straight links ${placed[i].from} → ${placed[i].to} and ${placed[j].from} → ${placed[j].to} overlap after the ${gap.key} column — reorder the items or drop one link.` };
      }
    }
  }
  // Longest spans first: they constrain the most.
  flexible.sort((a, b) => Math.abs(b.ya - b.yb) - Math.abs(a.ya - a.yb) || a.from.localeCompare(b.from));
  let budget = SEARCH_BUDGET;
  const search = (index) => {
    if (index === flexible.length) return true;
    const relation = flexible[index];
    for (const lane of lanes) {
      budget -= 1;
      if (budget < 0) return false;
      const points = [[round(relation.start[0]), relation.ya], [lane, relation.ya], [lane, relation.yb], [round(relation.end[0]), relation.yb]];
      if (placed.every((other) => !routesConflict(relation, points, other, other.points))) {
        relation.points = points;
        placed.push(relation);
        if (search(index + 1)) return true;
        placed.pop();
      }
    }
    return false;
  };
  if (!search(0)) {
    const list = flexible.map((relation) => `${relation.from} → ${relation.to}`).join(', ');
    return { problem: `The links after the ${gap.key} column (${list}) cannot be routed without crossings — reorder the items so linked cards sit level, or remove links that repeat what the column order already says.` };
  }
  return {};
}
