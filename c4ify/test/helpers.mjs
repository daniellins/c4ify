import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const skillRoot = path.resolve(__dirname, '..');
const cli = path.join(skillRoot, 'bin/c4ify.mjs');

function withSpecFile(spec, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c4ify-test-'));
  const file = path.join(dir, 'spec.c4.json');
  fs.writeFileSync(file, JSON.stringify(spec));
  try {
    return run(file, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// `c4ify validate c4 <spec> --json`: one receipt per view when `view` is
// omitted ({ ok, views: [...] }), a single-view receipt otherwise.
export function validateSpec(spec, { view, quality = 'showcase' } = {}) {
  return withSpecFile(spec, (file) => {
    const args = [cli, 'validate', 'c4', file, '--quality', quality, '--json', ...(view ? ['--view', view] : [])];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
    return { status: result.status, receipt: JSON.parse(result.stdout || '{}'), stderr: result.stderr };
  });
}

// Raw argument order: `c4ify validate <args…> <spec> --json`.
export function spawnValidate(args, spec) {
  return withSpecFile(spec, (file) => {
    const result = spawnSync(process.execPath, [cli, 'validate', ...args, file, '--json'], { encoding: 'utf8' });
    return { status: result.status, receipt: JSON.parse(result.stdout || '{}'), stderr: result.stderr };
  });
}

// `c4ify deliver c4 <spec> <dir> --json`; returns the receipt and the HTML of
// every delivered view (read before the temporary directory is removed).
export function deliverSpec(spec, { quality = 'showcase' } = {}) {
  return withSpecFile(spec, (file, dir) => {
    const out = path.join(dir, 'out');
    const result = spawnSync(process.execPath, [cli, 'deliver', 'c4', file, out, '--quality', quality, '--json'], { encoding: 'utf8' });
    const receipt = JSON.parse(result.stdout || '{}');
    const html = {};
    for (const view of receipt.views || []) {
      if (view.ok) html[view.view] = fs.readFileSync(view.output, 'utf8');
    }
    return { status: result.status, receipt, html, stderr: result.stderr };
  });
}

export function loadExample(name) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, 'examples', name), 'utf8'));
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Messages of every diagnostic plus every composition issue, for assertions.
export function findings(receipt) {
  const receipts = receipt.views || [receipt];
  return receipts.flatMap((entry) => [
    entry.error || '',
    ...(entry.diagnostics || []).map((diagnostic) => diagnostic.message),
    ...(entry.composition?.issues || []).map((issue) => `${issue.code} ${issue.message || ''} ${issue.rule || ''}`),
  ]).join('\n');
}
