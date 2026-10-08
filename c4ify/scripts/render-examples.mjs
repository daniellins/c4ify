// Re-render every bundled example from its JSON IR. Installed skills keep HTML
// beside the JSON examples; the development script passes the golden directory.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const outputRoot = path.resolve(process.argv[2] || path.join(skillRoot, 'examples'));

const TARGETS = [
  ['wbs', 'rd-project.wbs.json', 'wbs-rd-project.html'],
  ['bpmn', 'support-ticket.bpmn.json', 'bpmn-support-ticket.html'],
  ['vsm', 'software-delivery.vsm.json', 'vsm-software-delivery.html'],
  ['impactmap', 'mobile-payments.impactmap.json', 'impactmap-mobile-payments.html'],
  ['storymap', 'saas-onboarding.storymap.json', 'storymap-saas-onboarding.html'],
  ['sipoc', 'release-management.sipoc.json', 'sipoc-release-management.html'],
];

for (const [mode, input, output] of TARGETS) {
  execFileSync(process.execPath, [
    path.join(skillRoot, `renderers/${mode}/render-${mode}.mjs`),
    path.join(skillRoot, 'examples', input),
    path.join(outputRoot, output),
  ], { stdio: 'inherit' });
}
