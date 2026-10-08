// Layout search for one C4 view.
//
// A layout candidate is { direction, maxPerRow, elementWidth, gapBoost }. Each
// is laid out, routed and labelled, then judged by every composition gate at
// once (element overlaps, text fit, routes through elements, crossings,
// shared corridors, border runs, rhythm, label clearance) plus a first-screen
// fit estimate. The first candidate with no problem that fits 1440×900 wins;
// otherwise the one with the fewest problems is kept and its problems are
// reported together, so an author never fixes one stage only to meet the next.

import { withDiagnosticRecordingSuppressed } from '../shared/diagnostics.mjs';
import {
  cleanAmbiguousCorridorProblems,
  cleanBorderRunProblems,
  cleanCrossingProblems,
  cleanEndpointSideProblems,
  cleanFlowProblems,
  cleanLabelRouteClearanceProblems,
  cleanRouteRhythmProblems,
  rectsOverlap,
} from '../shared/geometry.mjs';
import { assignRows } from './layout.mjs';
import { createRouter } from './routing.mjs';
import { buildScene, preferredDirection } from './scene.mjs';
import { createLabeler, segmentLength } from './labels.mjs';

const GAP_BOOSTS = [0, 28, 56, 84];
const ROW_WIDTHS = [4, 6, 8];
const ELEMENT_WIDTHS = [220, 260];

// Calibrated on visual-check receipts: views of about 1.7:1 or wider fit a
// 1440×900 screen with the header; two navigation rows and each extra card
// need a little more width.
export function fitTarget(viewCount, cardCount) {
  return 1.7 + (viewCount > 6 ? 0.1 : 0) + 0.06 * cardCount;
}

function relationsFor(view, resolved) {
  const routeHints = view.routes || [];
  return resolved.relationships.map((relationship) => {
    const hint = routeHints.find((route) => route.from === relationship.from && route.to === relationship.to) || {};
    const { from: _from, to: _to, ...geometry } = hint;
    return {
      ...geometry,
      id: relationship.id,
      from: relationship.from,
      to: relationship.to,
      label: relationship.description,
      // "+N": this arrow also stands for N other relationships of the model.
      description: relationship.count > 1 ? `${relationship.description} (+${relationship.count - 1})` : relationship.description,
      technology: relationship.technology,
      variant: relationship.async ? 'dashed' : 'default',
      count: relationship.count,
    };
  });
}

function layoutFor(context, candidate, layoutRows) {
  const { view, resolved, t, typeName, viewIndex, glossaryEntries } = context;
  const scene = buildScene({ view, resolved, layoutRows, candidate, t, typeName, viewIndex, glossaryEntries });
  const relations = relationsFor(view, resolved);
  const router = createRouter(scene.boxes, relations);
  const labeler = createLabeler({ boxes: scene.boxes, boundary: scene.boundary, relations, router, fonts: scene.fonts });
  const { labels, failures } = labeler.placeAll();
  return { candidate, scene, relations, router, labels, failures, titleRect: labeler.titleRect };
}

export function compositionProblems(layout, { viewIndex, profile }) {
  const { scene, relations, router, labels, failures } = layout;
  const pathFor = (relation) => router.pathFor(relation);
  const endpointIds = new Set(scene.boxes.keys());
  const frames = scene.boundary ? [{ ...scene.boundary, kind: 'boundary', radius: 12 }] : [];
  const routeHint = `set fromSide/toSide, route or via for this pair in views[${viewIndex}].routes, hide it with exclude_relationships, or move an element with placement`;
  const common = { relations, endpointIds, pathFor, diagramType: 'c4', relationCollection: 'relationships', profile, routeHint };
  const problems = [
    ...scene.problems,
    ...cleanEndpointSideProblems({ ...common, fromSideFor: (relation) => router.endpointSide(relation, 'source'), toSideFor: (relation) => router.endpointSide(relation, 'target') }),
    ...cleanFlowProblems({ ...common, obstacles: scene.boxes.values(), obstacleKind: 'element' }),
    ...cleanCrossingProblems(common),
    ...cleanAmbiguousCorridorProblems(common),
    ...cleanBorderRunProblems({ ...common, frames }),
    ...cleanRouteRhythmProblems(common),
  ];
  for (const failure of failures) {
    const where = failure.fits
      ? 'has no free spot clear of elements, other labels and routes'
      : failure.segment ? `does not fit its ${Math.round(segmentLength(failure.segment))}px segment` : 'does not fit at its labelAt point';
    problems.push(`The label "${failure.relation.description}" (${failure.relation.from} → ${failure.relation.to}) ${where}; set labelAt or labelDx/labelDy for this pair in views[${viewIndex}].routes, raise layout.gap_x/gap_y, or move an element with placement.`);
  }
  const labelRects = relations.map((relation, relationIndex) => ({ relation, relationIndex, label: relation.label, ...labels.get(relation) }));
  for (const rect of labelRects) {
    if (failures.some((failure) => failure.relation === rect.relation)) continue;
    for (const box of scene.boxes.values()) {
      if (rectsOverlap(rect, box, -2)) {
        problems.push(`The label "${rect.label}" (${rect.relation.from} → ${rect.relation.to}) overlaps "${box.id}"; adjust labelAt/labelDx/labelDy for this pair in views[${viewIndex}].routes.`);
      }
    }
  }
  problems.push(...cleanLabelRouteClearanceProblems({ ...common, labels: labelRects }));
  return problems;
}

function* candidates(view, resolved) {
  const authored = view.layout || {};
  const rowWidths = authored.max_per_row ? [authored.max_per_row] : ROW_WIDTHS;
  const elementWidths = authored.element_width ? [authored.element_width] : ELEMENT_WIDTHS;
  const rowsCache = new Map();
  for (const gapBoost of GAP_BOOSTS) {
    for (const maxPerRow of rowWidths) {
      if (!rowsCache.has(maxPerRow)) rowsCache.set(maxPerRow, assignRows(view, resolved, maxPerRow));
      const layoutRows = rowsCache.get(maxPerRow);
      const preferred = preferredDirection(layoutRows.cells, { elementWidth: 220, gapX: authored.gap_x || 120, gapY: authored.gap_y || 100 });
      const directions = authored.direction ? [authored.direction] : [preferred, preferred === 'TB' ? 'LR' : 'TB'];
      for (const direction of directions) {
        for (const elementWidth of elementWidths) yield { candidate: { direction, maxPerRow, elementWidth, gapBoost }, layoutRows };
      }
    }
  }
}

function fitOf(scene, target) {
  const ratio = scene.viewW / scene.viewH;
  return { ratio, fits: ratio >= target };
}

export function targetFor(view, viewCount, cardCount) {
  return view.layout?.fit === 'scroll' ? 0 : fitTarget(viewCount, cardCount);
}

// context: { view, viewIndex, resolved, t, typeName, glossaryEntries, profile, target }
export function composeView(context) {
  const { view, resolved, profile, viewIndex, target } = context;
  let best = null;
  withDiagnosticRecordingSuppressed(() => {
    for (const { candidate, layoutRows } of candidates(view, resolved)) {
      const layout = layoutFor(context, candidate, layoutRows);
      const problems = compositionProblems(layout, { viewIndex, profile });
      const { fits } = fitOf(layout.scene, target);
      const score = problems.length * 2 + (fits ? 0 : 1);
      if (!best || score < best.score) best = { layout, layoutRows, score };
      if (score === 0) break;
    }
  });
  // Re-run the gates on the winner with diagnostic recording on, so the
  // receipt carries structured diagnostics for exactly this layout.
  const layout = layoutFor(context, best.layout.candidate, best.layoutRows);
  const problems = compositionProblems(layout, { viewIndex, profile });
  return { layout, problems, ...fitOf(layout.scene, target) };
}
