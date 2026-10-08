// Relationship label placement for one C4 view.
//
// A label carries the relationship's intent and, on its last line, the
// technology in brackets. Placement is a small search: on each usable route
// segment (the preferred one first), at a few positions along it, centred on
// the line or beside it. The first candidate clear of elements, labels placed
// earlier, the boundary frame and title, and every other route wins. Authored
// labelAt/labelDx/labelDy/labelSegment are honoured as given.

import { rectsOverlap, segmentIntersectsRect } from '../shared/geometry.mjs';
import { round, wrapText } from '../shared/method.mjs';
import { textUnits } from '../shared/utils.mjs';
import { boundaryTitleRect } from './scene.mjs';

const ROOMY_SEGMENT = 44;
const VERTICAL_LABEL_UNITS = 30;

export function segmentLength(segment) {
  return Math.hypot(segment.end[0] - segment.start[0], segment.end[1] - segment.start[1]);
}

function segmentsOf(points) {
  return points.slice(0, -1).map((start, position) => ({ start, end: points[position + 1], position }));
}

export function createLabeler({ boxes, boundary, relations, router, fonts }) {
  const pathFor = (relation) => router.pathFor(relation);
  const titleRect = boundary ? boundaryTitleRect(boundary, fonts) : null;
  const frameEdges = boundary ? (() => {
    const { x, y, width, height } = boundary;
    return [[[x, y], [x + width, y]], [[x + width, y], [x + width, y + height]], [[x, y + height], [x + width, y + height]], [[x, y], [x, y + height]]];
  })() : [];

  // The end of a route that no other relationship shares: the segment
  // entering a target fed by several sources is shared, the one leaving each
  // source is not, and vice versa.
  function preferredSegment(relation) {
    const segments = segmentsOf(pathFor(relation).points);
    if (Number.isInteger(relation.labelSegment)) return segments[Math.min(relation.labelSegment, segments.length - 1)];
    if (segments.length === 1) return segments[0];
    const { source, target } = router.sharedEnds(relation);
    const first = segments[0];
    const last = segments.at(-1);
    const roomy = (segment) => segmentLength(segment) >= ROOMY_SEGMENT;
    if (target > 1 && source <= 1 && roomy(first)) return first;
    if (source > 1 && target <= 1 && roomy(last)) return last;
    const interior = segments.length > 2 ? segments.slice(1, -1) : segments;
    const candidates = [last, first, ...interior].filter(roomy);
    const pool = candidates.length ? candidates : segments;
    return pool.reduce((best, segment) => (segmentLength(segment) > segmentLength(best) ? segment : best), pool[0]);
  }

  // Wrapped to the room the segment offers: a horizontal run limits width.
  function textFor(relation, segment) {
    const horizontal = segment && Math.abs(segment.end[1] - segment.start[1]) < 0.5;
    const techUnits = relation.technology ? textUnits(`[${relation.technology}]`) : 0;
    const maxUnits = horizontal ? Math.max(10, Math.floor((segmentLength(segment) - 20) / (fonts.label * 0.62))) : Math.max(VERTICAL_LABEL_UNITS, techUnits);
    const wrapped = wrapText(relation.description || '', maxUnits, 3);
    const lines = wrapped.lines;
    if (relation.technology) lines.push(`[${relation.technology}]`);
    const width = Math.max(36, Math.max(...lines.map((line) => textUnits(line))) * fonts.label * 0.62 + 12);
    const height = lines.length * fonts.label * 1.25 + 6;
    const fits = !wrapped.overflow && !(relation.technology && textUnits(lines.at(-1)) > maxUnits + 2);
    return { lines, width, height, horizontal, fits };
  }

  // Away from an end other relationships share (0 = start, 1 = end).
  function biasFor(relation, segment) {
    const points = pathFor(relation).points;
    const { source, target } = router.sharedEnds(relation);
    const touchesStart = segment.position === 0;
    const touchesEnd = segment.position === points.length - 2;
    if (touchesStart && source > 1 && !(touchesEnd && target > 1)) return 0.7;
    if (touchesEnd && target > 1 && !(touchesStart && source > 1)) return 0.3;
    return 0.5;
  }

  function isClear(rect, relation, placed) {
    for (const box of boxes.values()) if (rectsOverlap(rect, box, 4)) return false;
    for (const other of placed) if (rectsOverlap(rect, other, 4)) return false;
    if (titleRect && rectsOverlap(rect, titleRect, 4)) return false;
    if (frameEdges.some(([start, end]) => segmentIntersectsRect({ start, end }, rect, 3))) return false;
    for (const other of relations) {
      if (other === relation) continue;
      const points = pathFor(other).points;
      for (let index = 0; index < points.length - 1; index += 1) {
        if (segmentIntersectsRect({ start: points[index], end: points[index + 1] }, rect, 5)) return false;
      }
    }
    return true;
  }

  function candidatesOn(relation, segment) {
    const text = textFor(relation, segment);
    const along = [...new Set([biasFor(relation, segment), 0.5, 0.3, 0.7])];
    const normal = text.horizontal ? [0, -(text.height / 2 + 5), text.height / 2 + 5] : [0, text.width / 2 + 6, -(text.width / 2 + 6)];
    return normal.flatMap((offset) => along.map((position) => {
      const [x, y] = pointAlong(segment, position, text.horizontal ? text.width : text.height);
      const cx = x + (text.horizontal ? 0 : offset) + (relation.labelDx || 0);
      const cy = y + (text.horizontal ? offset : 0) + (relation.labelDy || 0);
      return { rect: rectAt(text, cx, cy), text, segment };
    }));
  }

  function place(relation, placed) {
    if (relation.labelAt) {
      const text = textFor(relation, preferredSegment(relation));
      return { rect: rectAt(text, relation.labelAt[0] + (relation.labelDx || 0), relation.labelAt[1] + (relation.labelDy || 0)), placed: true, fits: text.fits };
    }
    const preferred = preferredSegment(relation);
    const others = segmentsOf(pathFor(relation).points)
      .filter((segment) => segment.position !== preferred.position && segmentLength(segment) >= 30)
      .sort((left, right) => segmentLength(right) - segmentLength(left));
    const candidates = [preferred, ...others].flatMap((segment) => candidatesOn(relation, segment));
    const winner = candidates.find((candidate) => candidate.text.fits && isClear(candidate.rect, relation, placed));
    if (winner) return { rect: winner.rect, placed: true, fits: true };
    const fallback = candidates[0];
    if (!fallback) return { rect: { x: 0, y: 0, width: 0, height: 0, lines: [], cx: 0, cy: 0 }, placed: false, fits: false, segment: null };
    return { rect: fallback.rect, placed: false, fits: fallback.text.fits, segment: fallback.segment };
  }

  // Labels with the fewest free spots go first, so a crowded corridor is not
  // filled by a label that had alternatives elsewhere.
  function placeAll() {
    const freedom = new Map(relations.map((relation) => [relation, relation.labelAt ? 0 : candidateCount(relation)]));
    const order = [...relations].sort((left, right) => freedom.get(left) - freedom.get(right));
    const labels = new Map();
    const failures = [];
    for (const relation of order) {
      const result = place(relation, [...labels.values()]);
      labels.set(relation, result.rect);
      if (!result.placed) failures.push({ relation, fits: result.fits, segment: result.segment });
    }
    return { labels, failures };
  }

  function candidateCount(relation) {
    const preferred = preferredSegment(relation);
    const segments = [preferred, ...segmentsOf(pathFor(relation).points).filter((segment) => segment.position !== preferred.position && segmentLength(segment) >= 30)];
    return segments.flatMap((segment) => candidatesOn(relation, segment))
      .filter((candidate) => candidate.text.fits && isClear(candidate.rect, relation, [])).length;
  }

  return { placeAll, titleRect };
}

function rectAt(text, cx, cy) {
  return { x: round(cx - text.width / 2), y: round(cy - text.height / 2), width: round(text.width), height: round(text.height), lines: text.lines, cx: round(cx), cy: round(cy) };
}

function pointAlong(segment, bias, extent) {
  const total = segmentLength(segment);
  const margin = Math.min(total / 2, extent / 2 + 8);
  const distance = Math.min(total - margin, Math.max(margin, total * bias));
  const ratio = total ? distance / total : 0.5;
  return [segment.start[0] + (segment.end[0] - segment.start[0]) * ratio, segment.start[1] + (segment.end[1] - segment.start[1]) * ratio];
}
