import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clone, findings, loadExample, skillRoot, validateSpec } from './helpers.mjs';

const office = loadExample('software-delivery.vsm.json');
const factory = loadExample('machining-cell.vsm.json');

// Render a spec and return the generated HTML (for computed-metric assertions).
function renderHtml(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizify-vsm-render-'));
  const input = path.join(dir, 'spec.vsm.json');
  const output = path.join(dir, 'out.html');
  fs.writeFileSync(input, JSON.stringify(spec));
  try {
    const result = spawnSync(process.execPath, [path.join(skillRoot, 'renderers/vsm/render-vsm.mjs'), input, output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(output, 'utf8');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function expectHard(spec, rule) {
  const { status, receipt } = validateSpec('vsm', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), new RegExp(`\\[${rule}\\]`));
}

const node = (spec, id) => spec.nodes.find((item) => item.id === id);

test('office example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('vsm', office);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('manufacturing future-state example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('vsm', factory);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('office metrics are computed: lead time, process time, activity ratio, rolled %C&A, takt', () => {
  const spec = clone(office);
  delete spec.meta.totals;
  const html = renderHtml(spec);
  assert.match(html, /Lead time total: 25 d/);
  assert.match(html, /Tempo de processo: 28,5 h/);
  assert.match(html, /Razão de atividade: 14,3% \(8 h\/dia\)/);
  assert.match(html, /%C&amp;A acumulado: 30,5%/);
  assert.match(html, /Takt time: 4 h/);
  assert.match(html, /Maior espera: Entrada e triagem \(4,9 d\)/);
});

test('manufacturing metrics are computed: takt, inventory days, lead time, value-added time', () => {
  const html = renderHtml(factory);
  assert.match(html, /Takt time: 57,5 s/);
  assert.match(html, /Lead time total: 5,2 d/);
  assert.match(html, /Tempo de valor agregado: 98 s/);
  assert.match(html, /Estoque: 5,2 d/);
  assert.match(html, />3 d</);
});

test('R-VSM-08 rejects an authored total that disagrees with the blocks', () => {
  const spec = clone(office);
  spec.meta.totals.lead_time = 20;
  expectHard(spec, 'R-VSM-08');
  const pct = clone(office);
  pct.meta.totals.rolled_pct_ca = 45;
  expectHard(pct, 'R-VSM-08');
});

test('R-VSM-02 rejects a second customer and a branching flow', () => {
  const spec = clone(office);
  spec.nodes.push({ id: 'outro', kind: 'customer', label: 'Outro cliente' });
  expectHard(spec, 'R-VSM-02');
  const branch = clone(office);
  branch.flows.push({ from: 'triagem', to: 'desenvolvimento', channel: 'material', kind: 'push' });
  expectHard(branch, 'R-VSM-02');
});

test('R-VSM-03/04 reject missing cycle time and PT longer than LT', () => {
  const spec = clone(factory);
  delete node(spec, 'soldagem').ct_s;
  expectHard(spec, 'R-VSM-03');
  const long = clone(office);
  node(long, 'triagem').pt = 50;
  expectHard(long, 'R-VSM-04');
});

test('R-VSM-05 requires work_hours_per_day when PT and LT units differ, and %C&A in (0, 100]', () => {
  const spec = clone(office);
  delete spec.meta.work_hours_per_day;
  delete spec.meta.totals;
  expectHard(spec, 'R-VSM-05');
  const ca = clone(office);
  node(ca, 'testes').pct_ca = 120;
  expectHard(ca, 'R-VSM-05');
});

test('R-VSM-06/07 reject takt without available time and a buffer without qty or wait', () => {
  const spec = clone(factory);
  delete spec.meta.available_time_s;
  delete spec.meta.totals;
  expectHard(spec, 'R-VSM-06');
  const empty = clone(office);
  delete node(empty, 'fila-dev').qty;
  expectHard(empty, 'R-VSM-07');
});

test('R-VSM-09/10 reject two pacemakers and information flow between blocks', () => {
  const spec = clone(factory);
  node(spec, 'soldagem').pacemaker = true;
  expectHard(spec, 'R-VSM-09');
  const info = clone(office);
  info.flows.push({ from: 'testes', to: 'desenvolvimento', channel: 'info', kind: 'manual', label: 'Bugs' });
  expectHard(info, 'R-VSM-10');
  const market = clone(factory);
  market.flows.find((flow) => flow.id === 'retirada').kind = 'push';
  expectHard(market, 'R-VSM-10');
});

test('R-VSM-01 rejects fields of the other variant', () => {
  const spec = clone(office);
  node(spec, 'revisao').ct_s = 30;
  expectHard(spec, 'R-VSM-01');
});

test('R-VSM-11 (SOFT) warns when C/T exceeds takt', () => {
  const spec = clone(factory);
  node(spec, 'montagem').ct_s = 62;
  delete spec.meta.totals;
  const { status, receipt } = validateSpec('vsm', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /method\/R-VSM-11/);
  const standard = validateSpec('vsm', spec, 'standard');
  assert.equal(standard.status, 0, findings(standard.receipt));
});

test('a waiver keeps a SOFT advisory visible without blocking (R-VSM-15)', () => {
  const spec = clone(office);
  spec.nodes.push({ id: 'k1', kind: 'kaizen', label: 'Limite de WIP', target: 'triagem' });
  const blocked = validateSpec('vsm', spec);
  assert.notEqual(blocked.status, 0);
  assert.match(findings(blocked.receipt), /method\/R-VSM-15/);
  spec.meta.waivers = [{ rule: 'R-VSM-15', subject: 'k1', reason: 'Oportunidade marcada no workshop de estado atual.' }];
  const { status, receipt } = validateSpec('vsm', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('R-VSM-18 (SOFT) warns about a missing title block', () => {
  const spec = clone(office);
  delete spec.meta.champion;
  const { receipt } = validateSpec('vsm', spec, 'standard');
  assert.match(findings(receipt), /R-VSM-18/);
});
