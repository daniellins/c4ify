// Shared helpers for the business diagram renderers (wbs, bpmn, vsm,
// impactmap, storymap, sipoc). Geometry stays in each renderer; this module
// owns the cross-cutting contracts: methodology advisories with waivers,
// bounded text wrapping, locale-aware numbers, and orthogonal connectors.

import { esc, textUnits } from './utils.mjs';
import { polylinePath } from './geometry.mjs';
import { throwDiagnosticProblems } from './diagnostics.mjs';

// ---------------------------------------------------------------------------
// Methodology advisories
// ---------------------------------------------------------------------------
// HARD rules (spec or standard violations) are thrown by the renderer. SOFT
// rules (style and practice guidance) become advisories: the artifact checker
// counts them as composition warnings, so a showcase delivery must resolve
// them or waive them explicitly with a reason in meta.waivers.

export function createAdvisories(meta = {}) {
  const waivers = Array.isArray(meta.waivers) ? meta.waivers : [];
  const entries = [];
  const hard = [];

  function waiverFor(rule, subject) {
    return waivers.find((waiver) => waiver.rule === rule
      && (!waiver.subject || waiver.subject === subject));
  }

  return {
    // SOFT finding. `subject` is the semantic id the finding is about.
    warn(rule, message, subject) {
      const waiver = waiverFor(rule, subject);
      entries.push({
        rule,
        message,
        ...(subject ? { subject } : {}),
        ...(waiver ? { waived: true, waiverReason: waiver.reason } : {}),
      });
    },
    // HARD finding. Collected so every violation is reported in one run.
    fail(rule, message) {
      hard.push(`[${rule}] ${message}`);
    },
    throwIfHard(prefix, diagramType) {
      if (hard.length) throwDiagnosticProblems(prefix, hard, { code: 'method/hard-rule', subject: { diagramType } });
    },
    list() {
      return entries.slice();
    },
    render() {
      const json = JSON.stringify(entries);
      return `        <metadata id="bizify-advisories">${esc(json)}</metadata>`;
    },
  };
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
// Greedy word wrap measured in text units (CJK counts double). Returns at most
// `maxLines` lines; `overflow` tells validation the text did not fit, so the
// renderer can reject it instead of silently truncating meaning.
export function wrapText(text, maxUnits, maxLines = 2) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textUnits(candidate) <= maxUnits || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  const overflow = lines.length > maxLines || lines.some((line) => textUnits(line) > maxUnits);
  return { lines: lines.slice(0, maxLines), overflow };
}

// Units that fit in `width` px at `fontSize` for the bundled monospace font.
export function unitsFor(width, fontSize, padding = 12) {
  return Math.max(4, Math.floor((width - padding) / (fontSize * 0.6)));
}

export function renderLines(lines, { x, y, fontSize, lineHeight = fontSize * 1.25, className = 't-primary', weight, anchor = 'middle', attrs = '' }) {
  const top = y - ((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, index) => `<text${attrs ? ` ${attrs}` : ''} x="${round(x)}" y="${round(top + index * lineHeight)}" class="${className}" font-size="${fontSize}"${weight ? ` font-weight="${weight}"` : ''} text-anchor="${anchor}">${esc(line)}</text>`).join('\n          ');
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------
const NUMBER_LOCALE = { en: 'en-US', 'pt-BR': 'pt-BR' };

export function formatNumber(value, locale, digits = 0) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(NUMBER_LOCALE[locale] || 'en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(ratio, locale, digits = 1) {
  if (!Number.isFinite(ratio)) return '';
  return `${formatNumber(ratio * 100, locale, digits)}%`;
}

export function round(value) {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------
// Orthogonal elbow from a bottom port down to a top port (tree connectors).
export function elbowDown(from, to, midY) {
  const y = midY ?? from[1] + (to[1] - from[1]) / 2;
  const points = dedupe([from, [from[0], y], [to[0], y], to]);
  return { points, d: polylinePath(points) };
}

// Orthogonal elbow from a right port to a left port (left-to-right flows).
export function elbowRight(from, to, midX) {
  const x = midX ?? from[0] + (to[0] - from[0]) / 2;
  const points = dedupe([from, [x, from[1]], [x, to[1]], to]);
  return { points, d: polylinePath(points) };
}

// Spine connector: down a vertical spine at `spineX`, then right into `to`.
export function spineRight(from, to, spineX) {
  const points = dedupe([from, [spineX, from[1]], [spineX, to[1]], to]);
  return { points, d: polylinePath(points) };
}

export function dedupe(points) {
  const out = [];
  for (const point of points) {
    const previous = out.at(-1);
    if (!previous || Math.abs(previous[0] - point[0]) > 0.01 || Math.abs(previous[1] - point[1]) > 0.01) {
      out.push([round(point[0]), round(point[1])]);
    }
  }
  if (out.length < 2) out.push(out[0]);
  return out;
}

// ---------------------------------------------------------------------------
// First-screen aspect
// ---------------------------------------------------------------------------
// The standalone viewer fits the diagram to the reading width, so a tall,
// narrow viewBox overflows a 1440×900 screen. Widen toward TARGET_ASPECT by
// centering the content, capped where the smallest text stays legible.
export const TARGET_ASPECT = 2.05;
const READER_DIAGRAM_WIDTH = 930;
const MIN_PROJECTED_PX = 6.1;

export function fitAspect({ items, edges = [], viewW, viewH, minFont }) {
  const legibleW = Math.floor(READER_DIAGRAM_WIDTH * minFont / MIN_PROJECTED_PX);
  const targetW = Math.min(Math.ceil(viewH * TARGET_ASPECT), Math.max(viewW, legibleW));
  if (targetW <= viewW) return { viewW, shifted: 0 };
  const dx = round((targetW - viewW) / 2);
  for (const item of items) {
    item.x = round(item.x + dx);
    if (Number.isFinite(item.cx)) item.cx = round(item.cx + dx);
  }
  for (const edge of edges) {
    edge.points = edge.points.map(([x, y]) => [round(x + dx), y]);
    edge.d = polylinePath(edge.points);
  }
  return { viewW: targetW, shifted: dx };
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------
export function childrenIndex(items, parentKey = 'parent') {
  const index = new Map();
  for (const item of items) {
    const parent = item[parentKey] ?? null;
    if (!index.has(parent)) index.set(parent, []);
    index.get(parent).push(item);
  }
  return index;
}

export function uniqueIdProblems(items, collection) {
  const seen = new Set();
  const problems = [];
  items.forEach((item, index) => {
    if (seen.has(item.id)) problems.push(`/${collection}/${index}/id duplicates id ${JSON.stringify(item.id)}.`);
    seen.add(item.id);
  });
  return problems;
}
