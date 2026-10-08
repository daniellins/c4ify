// Re-render every bundled example from its JSON IR. Installed skills keep HTML
// beside the JSON examples; the development script passes the golden directory.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(process.argv[2] || path.join(skillRoot, 'examples'));

// Every view of every bundled model, as <model>/<view>.html so the
// navigation bar and drill-down links resolve between sibling files.
const EXAMPLES = fs.readdirSync(path.join(skillRoot, 'examples')).filter((name) => name.endsWith('.c4.json')).sort();

for (const input of EXAMPLES) {
  const model = JSON.parse(fs.readFileSync(path.join(skillRoot, 'examples', input), 'utf8'));
  const base = input.replace(/.c4.json$/, '');
  for (const view of model.views) {
    execFileSync(process.execPath, [
      path.join(skillRoot, 'renderers/c4/render-c4.mjs'),
      path.join(skillRoot, 'examples', input),
      path.join(outputRoot, base, `${view.key}.html`),
    ], { stdio: 'inherit', env: { ...process.env, C4IFY_VIEW: view.key } });
  }
}
