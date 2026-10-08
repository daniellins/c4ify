// Helpers shared by the three planning-map renderers (impactmap, storymap,
// sipoc). They sit next to the impact map because the renderer contract keeps
// shared/ coordinator-owned; nothing here is type-specific.

import { round, unitsFor, wrapText } from './business.mjs';

// Fit a label into `width` px: prefer the base size on two lines, one
// half-step smaller, then a third line, and only then shrink toward the
// legibility floor. Returns null when even the floor on `maxLines` overflows,
// so the caller can reject the node with a precise message.
export function fitLabel(text, width, { font, floor, maxLines = 3, reserved = 0 }) {
  const attempts = [];
  for (let size = font; size >= floor - 0.001; size = round(size - 0.5)) attempts.push(size);
  if (!attempts.length) attempts.push(floor);
  const order = [
    ...attempts.slice(0, 2).map((size) => [size, Math.min(2, maxLines)]),
    [attempts[0], maxLines],
    ...attempts.slice(2).map((size) => [size, Math.min(2, maxLines)]),
    ...attempts.slice(1).map((size) => [size, maxLines]),
  ];
  for (const [size, lines] of order) {
    const wrapped = wrapText(text, unitsFor(width - reserved, size), lines);
    if (!wrapped.overflow) return { font: size, lines: wrapped.lines };
  }
  return null;
}

// Does a text fit one line of `width` px at `font`?
export function fitsLine(text, width, font, padding = 12) {
  return !wrapText(text, unitsFor(width, font, padding), 1).overflow;
}

// Short verb-phrase heuristic for step/activity labels. Portuguese verbs are
// recognised by their infinitive, gerund or common imperative endings; English
// by a list of common verbs plus the gerund. It is a SOFT rule, so a false
// negative only costs a waiver.
const EN_VERBS = new Set([
  'add', 'analyze', 'approve', 'ask', 'browse', 'build', 'buy', 'cancel', 'change', 'check', 'choose', 'close', 'collect', 'compare', 'complete', 'configure',
  'confirm', 'connect', 'create', 'cut', 'define', 'deliver', 'deploy', 'design', 'download', 'draft', 'edit', 'enter', 'find', 'fix', 'freeze', 'get', 'give',
  'go', 'import', 'install', 'invite', 'issue', 'log', 'make', 'manage', 'monitor', 'open', 'order', 'pay', 'pick', 'plan', 'prepare', 'publish', 'read',
  'receive', 'register', 'release', 'remove', 'report', 'request', 'review', 'roll', 'run', 'search', 'see', 'select', 'send', 'set', 'share', 'show', 'sign',
  'start', 'submit', 'take', 'test', 'track', 'update', 'upload', 'use', 'validate', 'verify', 'view', 'withdraw', 'write',
]);
// -or only for the pôr family, so nouns such as setor, gestor or bloqueador stay nouns.
const PT_VERB_ENDING = /^([a-zà-ú]{2,}(ar|er|ir|ando|endo|indo)|(com|dis|pro|re|ex|su|im|de)?p[oô]r)$/;

export function startsWithVerb(label, locale) {
  const first = String(label).trim().split(/\s+/)[0].toLowerCase().normalize('NFC').replace(/[^a-zà-ú-]/g, '');
  if (!first) return false;
  if (PT_VERB_ENDING.test(first)) return true;
  if (locale === 'pt-BR') return false;
  return EN_VERBS.has(first) || /^[a-z]{3,}ing$/.test(first);
}

// Every card is a vertical stack: an optional tag row, the wrapped label, and
// optional context lines. Returns the height and the baselines to draw.
export function cardGeometry({ y, lines, font, tagRow = false, extraLines = 0, extraFont = 9, padTop = 9, padBottom = 9, minHeight = 0 }) {
  const lineH = font * 1.25;
  const extraH = extraFont * 1.35;
  const tagH = tagRow ? extraFont + 7 : 0;
  const content = tagH + lines.length * lineH + extraLines * extraH;
  const height = Math.max(minHeight, Math.ceil(padTop + content + padBottom));
  const top = y + (height - content) / 2;
  const tagY = top + extraFont;
  // renderLines centers baselines on this y; +0.35em centers the glyphs.
  const labelCenter = top + tagH + (lines.length * lineH) / 2 + font * 0.35;
  const extraYs = Array.from({ length: extraLines }, (_, index) => top + tagH + lines.length * lineH + extraFont + 3 + index * extraH);
  return { height, tagY: round(tagY), labelCenter: round(labelCenter), extraYs: extraYs.map(round) };
}
