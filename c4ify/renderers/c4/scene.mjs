// Geometry of one C4 view: orientation, fonts, element boxes, the scope
// boundary and the canvas. Pure: problems are returned, not thrown, so the
// renderer can retry with more room before reporting them.

import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { textUnits } from '../shared/utils.mjs';
import { rectsOverlap } from '../shared/geometry.mjs';
import { fitAspect, round, wrapText } from '../shared/method.mjs';
import { kindOf } from './resolve.mjs';
import { isStore } from './layout.mjs';

export const MARGIN = 40;
export const PAD = 26;
export const TITLE_BAND = 22;
const LEGEND_BAND = 78;
const ESTIMATED_BOX_HEIGHT = 120;

// Orientation: top-down reads best, but a view with four or more layers and
// few columns becomes a strip too tall for a laptop screen at a legible size;
// such views flow left to right instead (layers become columns).
function chooseDirection(view, layerCount, slotCount, dims) {
  if (view.layout?.direction) return view.layout.direction;
  const tbAspect = (slotCount * (dims.elementWidth + dims.gapX)) / (layerCount * (ESTIMATED_BOX_HEIGHT + dims.gapY));
  const lrAspect = (layerCount * (dims.elementWidth + dims.gapX)) / (slotCount * (ESTIMATED_BOX_HEIGHT + dims.gapY));
  return layerCount >= 4 && tbAspect < 1.5 && lrAspect > tbAspect ? 'LR' : 'TB';
}

function fontsFor(viewW) {
  const floor = round(minimumReadableSourceTextPx(viewW) + 0.15);
  return { floor, name: Math.max(12.5, floor + 1.5), detail: Math.max(9.2, floor), label: Math.max(8.6, floor) };
}

function measureBox(element, { fonts, elementWidth, typeName, t }) {
  const units = (font) => Math.max(6, Math.floor((elementWidth - 18) / (font * 0.62)));
  const name = wrapText(element.name, units(fonts.name), 2);
  const typeText = element.technology
    ? t('c4.type.withTech', { type: typeName(element), technology: element.technology })
    : t('c4.type.plain', { type: typeName(element) });
  const typeLines = wrapText(typeText, units(fonts.detail), 2);
  const description = element.description ? wrapText(element.description, units(fonts.detail), 4) : { lines: [], overflow: false };
  const overflow = [['name', name, 2], ['technology', typeLines, 2], ['description', description, 4]]
    .filter(([, fitted]) => fitted.overflow)
    .map(([field, , limit]) => ({ field, limit }));
  const glyph = element.type === 'person' ? 18 : 0;
  const cap = element.shape === 'database' || isStore(element) ? 12 : 0;
  const contentH = 14 + glyph + cap + name.lines.length * fonts.name * 1.22 + 5 + typeLines.lines.length * fonts.detail * 1.25
    + (description.lines.length ? 7 + description.lines.length * fonts.detail * 1.3 : 0) + 12;
  return {
    id: element.id,
    element,
    kind: kindOf(element),
    nameLines: name.lines,
    typeLines: typeLines.lines,
    descriptionLines: description.lines,
    glyph,
    cap,
    width: elementWidth,
    contentH: Math.max(86, Math.ceil(contentH)),
    overflow,
  };
}

function placeTopDown(all, { layerCount, inBoundary, gapX, gapY, elementWidth }) {
  const layerHeight = Array.from({ length: layerCount }, (_value, layer) => Math.max(0, ...all.filter((box) => box.cell.row === layer).map((box) => box.contentH)));
  const layerY = [];
  let cursor = MARGIN + (inBoundary(0) ? PAD + TITLE_BAND : 0);
  for (let layer = 0; layer < layerCount; layer += 1) {
    if (layer > 0) {
      cursor += layerHeight[layer - 1] + gapY;
      if (inBoundary(layer) !== inBoundary(layer - 1)) cursor += PAD;
    }
    layerY.push(cursor);
  }
  for (const box of all) {
    box.x = round(MARGIN + PAD + box.cell.col * (elementWidth + gapX));
    box.y = round(layerY[box.cell.row]);
    box.height = layerHeight[box.cell.row];
  }
  return Math.ceil(layerY.at(-1) + layerHeight.at(-1) + (inBoundary(layerCount - 1) ? PAD : 0) + MARGIN + LEGEND_BAND);
}

function placeLeftRight(all, { layerCount, inBoundary, gapX, gapY, elementWidth, hasBoundary, sideIds }) {
  const height = Math.max(...all.map((box) => box.contentH));
  const slotGap = Math.max(64, gapY - 20);
  const layerX = [];
  let cursor = MARGIN + PAD;
  for (let layer = 0; layer < layerCount; layer += 1) {
    if (layer > 0) {
      cursor += elementWidth + gapX;
      if (inBoundary(layer) !== inBoundary(layer - 1)) cursor += PAD;
    }
    layerX.push(cursor);
  }
  const top = MARGIN + (hasBoundary ? PAD + TITLE_BAND : 0);
  // The side column of a top-down view becomes a row under the boundary;
  // leave the frame a clear corridor on both sides of its edge.
  const sideGap = sideIds.size ? PAD * 2 : 0;
  for (const box of all) {
    box.x = round(layerX[box.cell.row]);
    box.y = round(top + box.cell.col * (height + slotGap) + (sideIds.has(box.id) ? sideGap : 0));
    box.height = height;
  }
  return Math.ceil(Math.max(...all.map((box) => box.y + box.height)) + (hasBoundary && !sideIds.size ? PAD : 0) + MARGIN + LEGEND_BAND);
}

function boundaryFor(resolved, boxes, label) {
  const members = [...boxes.values()].filter((box) => resolved.core.some((element) => element.id === box.id));
  const x1 = Math.min(...members.map((box) => box.x)) - PAD;
  const y1 = Math.min(...members.map((box) => box.y)) - PAD - TITLE_BAND;
  const x2 = Math.max(...members.map((box) => box.x + box.width)) + PAD;
  const y2 = Math.max(...members.map((box) => box.y + box.height)) + PAD;
  return { id: resolved.boundary.id, label, members: new Set(members.map((box) => box.id)), x: round(x1), y: round(y1), width: round(x2 - x1), height: round(y2 - y1) };
}

// gapBoost widens the gaps between elements on retries, when a relationship
// label found no free spot at the default spacing.
export function buildScene({ view, resolved, cells, boundaryRows, sideIds, t, typeName, viewIndex, gapBoost = 0 }) {
  const dims = {
    elementWidth: view.layout?.element_width || 220,
    gapX: (view.layout?.gap_x || 120) + gapBoost,
    gapY: (view.layout?.gap_y || 100) + gapBoost,
  };
  const hasBoundary = Boolean(resolved.boundary);
  const layerCount = Math.max(...[...cells.values()].map((cell) => cell.row)) + 1;
  const slotCount = Math.max(...[...cells.values()].map((cell) => cell.col)) + 1;
  const direction = chooseDirection(view, layerCount, slotCount, dims);
  const span = direction === 'TB' ? slotCount : layerCount;
  let viewW = Math.ceil(MARGIN * 2 + PAD * 2 + span * dims.elementWidth + (span - 1) * dims.gapX + (direction === 'LR' && hasBoundary ? PAD * 2 : 0));
  const fonts = fontsFor(viewW);
  const problems = [];
  const boxes = new Map();
  for (const element of resolved.elements) {
    const box = measureBox(element, { fonts, elementWidth: dims.elementWidth, typeName, t });
    for (const { field, limit } of box.overflow) {
      problems.push(`The ${field} of "${element.id}" needs more than ${limit} lines at ${dims.elementWidth}px; shorten it or raise views[${viewIndex}].layout.element_width.`);
    }
    boxes.set(element.id, { ...box, cell: cells.get(element.id) });
  }
  const all = [...boxes.values()];
  const inBoundary = (layer) => hasBoundary && boundaryRows.has(layer);
  const context = { layerCount, inBoundary, hasBoundary, sideIds, ...dims };
  let viewH = direction === 'TB' ? placeTopDown(all, context) : placeLeftRight(all, context);
  if (view.viewBox) {
    viewW = Math.max(viewW, view.viewBox[0]);
    viewH = Math.max(viewH, view.viewBox[1]);
  }
  ({ viewW } = fitAspect({ items: all, viewW, viewH, minFont: Math.min(fonts.detail, fonts.label) }));
  for (const box of all) {
    box.cx = round(box.x + box.width / 2);
    box.cy = round(box.y + box.height / 2);
  }
  const boundary = hasBoundary ? boundaryFor(resolved, boxes, `${resolved.boundary.name} ${t('c4.type.plain', { type: typeName(resolved.boundary) })}`) : null;
  problems.push(...overlapProblems(all, boundary, viewIndex));
  return { boxes, boundary, viewW, viewH, fonts, direction, problems };
}

function overlapProblems(all, boundary, viewIndex) {
  const problems = [];
  if (boundary) {
    for (const box of all) {
      if (!boundary.members.has(box.id) && rectsOverlap(box, boundary, 6)) {
        problems.push(`"${box.id}" is outside the boundary but its box overlaps it; move it with views[${viewIndex}].placement to a row outside the boundary rows.`);
      }
    }
  }
  for (const left of all) {
    for (const right of all) {
      if (left.id < right.id && rectsOverlap(left, right, 8)) {
        problems.push(`"${left.id}" and "${right.id}" overlap (cells ${left.cell.row}/${left.cell.col} and ${right.cell.row}/${right.cell.col}); give them distinct cells in views[${viewIndex}].placement.`);
      }
    }
  }
  return problems;
}

export function boundaryTitleRect(boundary, fonts) {
  const fontSize = Math.max(10, fonts.floor);
  const width = textUnits(boundary.label) * fontSize * 0.62 + 12;
  return { x: boundary.x + 6, y: boundary.y + 4, width, height: 18, fontSize };
}
