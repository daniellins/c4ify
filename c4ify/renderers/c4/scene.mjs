// Geometry of one C4 view for one layout candidate: fonts, element boxes, the
// scope boundary, the glossary band and the canvas. Pure: problems are
// returned, not thrown, so the renderer can compare candidates and retry.

import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { rectsOverlap } from '../shared/geometry.mjs';
import { fitAspect, round } from '../shared/method.mjs';
import { textUnits } from '../shared/utils.mjs';
import { kindOf } from './resolve.mjs';
import { isStore } from './layout.mjs';

export const MARGIN = 40;
export const PAD = 26;
export const TITLE_BAND = 22;
const LEGEND_BAND = 78;
const ESTIMATED_BOX_HEIGHT = 120;
const GLOSSARY_LINE = 1.45;

// Preferred orientation: top-down reads best, but a view with four or more
// layers and few columns becomes a strip too tall for a laptop screen; such
// views prefer left to right (layers become columns).
export function preferredDirection(cells, dims) {
  const layerCount = Math.max(...[...cells.values()].map((cell) => cell.row)) + 1;
  const slotCount = Math.max(...[...cells.values()].map((cell) => cell.col)) + 1;
  const tbAspect = (slotCount * (dims.elementWidth + dims.gapX)) / (layerCount * (ESTIMATED_BOX_HEIGHT + dims.gapY));
  const lrAspect = (layerCount * (dims.elementWidth + dims.gapX)) / (slotCount * (ESTIMATED_BOX_HEIGHT + dims.gapY));
  return layerCount >= 4 && tbAspect < 1.5 && lrAspect > tbAspect ? 'LR' : 'TB';
}

function fontsFor(viewW) {
  const floor = round(minimumReadableSourceTextPx(viewW) + 0.15);
  return { floor, name: Math.max(12.5, floor + 1.5), detail: Math.max(9.2, floor), label: Math.max(8.6, floor), glossary: Math.max(9, floor) };
}

// Word wrap that can also break a word longer than a line (service ids such as
// "productcatalogservice", package names) at camelCase, digits or - _ . /
// boundaries, and as a last resort anywhere. Pieces of one word are joined
// without a space when they share a line.
const SOFT_BREAK = /(?<=[a-z0-9])(?=[A-Z])|(?<=[-_./])/;
function splitWord(word, units) {
  if (textUnits(word) <= units) return [word];
  const parts = word.split(SOFT_BREAK).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const part of parts.length > 1 ? parts : [...word]) {
    if (current && textUnits(current + part) > units) {
      chunks.push(current);
      current = '';
    }
    current += part;
    while (textUnits(current) > units) {
      chunks.push(current.slice(0, units));
      current = current.slice(units);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function wrapText(text, units, maxLines) {
  const tokens = String(text ?? '').trim().split(/\s+/).filter(Boolean)
    .flatMap((word) => splitWord(word, units).map((piece, index) => ({ piece, glue: index > 0 })));
  const lines = [];
  let current = '';
  for (const { piece, glue } of tokens) {
    const candidate = current ? `${current}${glue ? '' : ' '}${piece}` : piece;
    if (!current || textUnits(candidate) <= units) current = candidate;
    else {
      lines.push(current);
      current = piece;
    }
  }
  if (current) lines.push(current);
  return { lines: lines.slice(0, maxLines), overflow: lines.length > maxLines };
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
  return Math.ceil(layerY.at(-1) + layerHeight.at(-1) + (inBoundary(layerCount - 1) ? PAD : 0) + MARGIN);
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
  return Math.ceil(Math.max(...all.map((box) => box.y + box.height)) + (hasBoundary && !sideIds.size ? PAD : 0) + MARGIN);
}

function boundaryFor(resolved, boxes, label) {
  const members = [...boxes.values()].filter((box) => resolved.core.some((element) => element.id === box.id));
  const x1 = Math.min(...members.map((box) => box.x)) - PAD;
  const y1 = Math.min(...members.map((box) => box.y)) - PAD - TITLE_BAND;
  const x2 = Math.max(...members.map((box) => box.x + box.width)) + PAD;
  const y2 = Math.max(...members.map((box) => box.y + box.height)) + PAD;
  return { id: resolved.boundary.id, label, members: new Set(members.map((box) => box.id)), x: round(x1), y: round(y1), width: round(x2 - x1), height: round(y2 - y1) };
}

// view.placement means the visual cell: { row, col } as the reader sees it.
// Cells are stored as { row: layer, col: slot }, so left-to-right swaps them.
function placedCells(view, cells, sideIds, direction) {
  const result = new Map(cells);
  const side = new Set(sideIds);
  for (const [id, cell] of Object.entries(view.placement || {})) {
    if (!result.has(id)) continue;
    result.set(id, direction === 'LR' ? { row: cell.col, col: cell.row } : { row: cell.row, col: cell.col });
    side.delete(id);
  }
  return { cells: result, sideIds: side };
}

// Glossary lines drawn inside the SVG, under the legend, so the explanation
// travels with exports and never pushes the page below the fold.
function glossaryLines(entries, width, fonts, t) {
  if (!entries.length) return [];
  const units = Math.max(20, Math.floor(width / (fonts.glossary * 0.62)));
  const text = `${t('c4.glossary.title')}: ${entries.map(([term, meaning]) => t('c4.glossary.item', { term, meaning })).join(' · ')}`;
  return wrapText(text, units, 6).lines;
}

// candidate: { direction, elementWidth, gapBoost }; layoutRows from assignRows.
export function buildScene({ view, resolved, layoutRows, candidate, t, typeName, viewIndex, glossaryEntries = [] }) {
  const dims = {
    elementWidth: candidate.elementWidth,
    gapX: (view.layout?.gap_x || 120) + candidate.gapBoost,
    gapY: (view.layout?.gap_y || 100) + candidate.gapBoost,
  };
  const { direction } = candidate;
  const { cells, sideIds } = placedCells(view, layoutRows.cells, layoutRows.sideIds, direction);
  const hasBoundary = Boolean(resolved.boundary);
  const layerCount = Math.max(...[...cells.values()].map((cell) => cell.row)) + 1;
  const slotCount = Math.max(...[...cells.values()].map((cell) => cell.col)) + 1;
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
  const inBoundary = (layer) => hasBoundary && layoutRows.boundaryRows.has(layer);
  const context = { layerCount, inBoundary, hasBoundary, sideIds, ...dims };
  const contentH = direction === 'TB' ? placeTopDown(all, context) : placeLeftRight(all, context);
  const glossary = glossaryLines(glossaryEntries, viewW - MARGIN * 2, fonts, t);
  const glossaryH = glossary.length ? Math.ceil(glossary.length * fonts.glossary * GLOSSARY_LINE + 10) : 0;
  let viewH = contentH + LEGEND_BAND + glossaryH;
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
  return { boxes, boundary, viewW, viewH, fonts, direction, glossary, glossaryH, problems };
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
