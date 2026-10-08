import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const skillRoot = path.resolve(__dirname, '..');
const cli = path.join(skillRoot, 'bin/bizify.mjs');

// Run `bizify validate <type> <spec> --json` on an in-memory spec.
export function validateSpec(type, spec, quality = 'showcase') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bizify-${type}-`));
  const file = path.join(dir, `spec.${type}.json`);
  fs.writeFileSync(file, JSON.stringify(spec));
  try {
    const result = spawnSync(process.execPath, [cli, 'validate', type, file, '--quality', quality, '--json'], { encoding: 'utf8' });
    return { status: result.status, receipt: JSON.parse(result.stdout || '{}'), stderr: result.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function loadExample(name) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, 'examples', name), 'utf8'));
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Messages of every diagnostic plus every composition issue, for assertions.
export function findings(receipt) {
  return [
    ...(receipt.diagnostics || []).map((entry) => entry.message),
    ...(receipt.composition?.issues || []).map((entry) => `${entry.code} ${entry.message || ''}`),
  ].join('\n');
}
