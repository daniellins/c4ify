import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clone, findings, loadExample, skillRoot, validateSpec } from './helpers.mjs';

const example = loadExample('saas-onboarding.storymap.json');
const story = (spec, id) => spec.stories.find((item) => item.id === id);

function renderSvg(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizify-storymap-'));
  const input = path.join(dir, 'spec.storymap.json');
  const output = path.join(dir, 'out.html');
  fs.writeFileSync(input, JSON.stringify(spec));
  try {
    const result = spawnSync(process.execPath, [path.join(skillRoot, 'renderers/storymap/render-storymap.mjs'), input, output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(output, 'utf8');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('story map example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('storymap', example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('R-USM-01 rejects a story under an unknown step', () => {
  const spec = clone(example);
  story(spec, 'h-google').step = 'fantasma';
  const { status, receipt } = validateSpec('storymap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-USM-01/);
});

test('R-USM-02 rejects tied activity order', () => {
  const spec = clone(example);
  spec.activities[1].order = 1;
  const { status, receipt } = validateSpec('storymap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-USM-02/);
});

test('R-USM-03 rejects a story in an unknown release', () => {
  const spec = clone(example);
  story(spec, 'h-google').release = 'r9';
  const { status, receipt } = validateSpec('storymap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-USM-03/);
});

test('SOFT R-USM-06: a first release that skips an activity is a showcase-blocking advisory', () => {
  const spec = clone(example);
  spec.stories = spec.stories.filter((item) => item.id !== 'h-saldo');
  delete spec.meta.views;
  const { status, receipt } = validateSpec('storymap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /method\/R-USM-06/);
});

test('a waiver keeps R-USM-06 visible without blocking', () => {
  const spec = clone(example);
  spec.stories = spec.stories.filter((item) => item.id !== 'h-saldo');
  delete spec.meta.views;
  spec.meta.waivers = [{ rule: 'R-USM-06', subject: 'r1', reason: 'Saldo é consultado no portal do adquirente nesta fase.' }];
  const { status, receipt } = validateSpec('storymap', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('R-USM-12 and R-USM-11: unsliced stories and a prioritised backbone are flagged', () => {
  const spec = clone(example);
  delete story(spec, 'h-relatorio').release;
  spec.steps[0].priority = 1;
  const { status, receipt } = validateSpec('storymap', spec, 'standard');
  assert.equal(status, 0, findings(receipt));
  assert.match(findings(receipt), /R-USM-12/);
  assert.match(findings(receipt), /R-USM-11/);
});

test('the backbone narrative is emitted as step-to-step relationships with arrowheads', () => {
  const svg = renderSvg(example);
  assert.match(svg, /data-edge-from="criar-login" data-edge-to="enviar-cnpj"[^>]*marker-end="url\(#arrowhead\)"/);
  assert.match(svg, /data-edge-from="consultar-saldo" data-edge-to="sacar"/);
});
