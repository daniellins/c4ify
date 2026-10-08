#!/usr/bin/env node
// Writes the viewer CSS that colors business node kinds in the overview map
// and the Semantic Lens. Each renderer declares kind -> palette slot in
// renderers/<type>/palette.mjs; the slots are the seven color families every
// preset and theme already defines, so no preset needs new variables.
// Usage: node scripts/generate-kind-palette.mjs [--check]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'assets/template.html');
const TYPES = ['wbs', 'bpmn', 'vsm', 'impactmap', 'storymap', 'sipoc'];
const SLOTS = new Set(['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external']);
const START = '    /* BIZIFY:KIND_PALETTE_START */';
const END = '    /* BIZIFY:KIND_PALETTE_END */';

const bySlot = new Map([...SLOTS].map((slot) => [slot, new Set()]));
for (const type of TYPES) {
  const file = path.join(root, 'renderers', type, 'palette.mjs');
  if (!fs.existsSync(file)) continue;
  const module = await import(pathToFileURL(file).href);
  const palette = Object.values(module).find((value) => value && typeof value === 'object') || {};
  for (const [kind, slot] of Object.entries(palette)) {
    if (!SLOTS.has(slot)) throw new Error(`${type} kind "${kind}" maps to unknown palette slot "${slot}"`);
    if (!/^[a-z][a-z0-9-]*$/.test(kind)) throw new Error(`${type} kind "${kind}" is not a CSS-safe identifier`);
    bySlot.get(slot).add(kind);
  }
}

const lines = [START];
for (const [slot, kinds] of bySlot) {
  if (!kinds.size) continue;
  const list = [...kinds].sort();
  lines.push(`    ${list.map((kind) => `.overview-map-node[data-kind="${kind}"]`).join(',\n    ')} { fill: var(--${slot}-stroke); stroke: var(--${slot}-stroke); }`);
  lines.push(`    ${list.map((kind) => `.semantic-lens-kind[data-kind="${kind}"]`).join(',\n    ')} { --lens-color: var(--${slot}-stroke); }`);
}
lines.push(END);
const block = lines.join('\n');

let template = fs.readFileSync(templatePath, 'utf8');
const existing = template.indexOf(START);
let next;
if (existing >= 0) {
  const endIndex = template.indexOf(END, existing);
  next = template.slice(0, existing) + block + template.slice(endIndex + END.length);
} else {
  // Insert right after the built-in Semantic Lens kind rules.
  const anchor = '    .semantic-lens-kind:hover,';
  const at = template.indexOf(anchor);
  if (at < 0) throw new Error('template anchor for kind palette not found');
  next = `${template.slice(0, at)}${block}\n${template.slice(at)}`;
}

if (process.argv.includes('--check')) {
  if (next !== template) {
    console.error('kind palette CSS is stale — run node scripts/generate-kind-palette.mjs');
    process.exit(1);
  }
  console.log('kind palette CSS is current');
} else {
  fs.writeFileSync(templatePath, next);
  console.log(`kind palette CSS written (${[...bySlot.values()].reduce((n, set) => n + set.size, 0)} kinds)`);
}
