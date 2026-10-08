import test from 'node:test';
import assert from 'node:assert/strict';
import { clone, findings, loadExample, validateSpec } from './helpers.mjs';

const example = loadExample('mobile-payments.impactmap.json');
const node = (spec, id) => spec.nodes.find((item) => item.id === id);

test('impact map example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('impactmap', example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('R-IMP-01 rejects a second goal', () => {
  const spec = clone(example);
  spec.nodes.push({ id: 'meta2', level: 'goal', label: 'Reduzir o custo por transação', metric: { name: 'Custo', target: 1, deadline: '2027' } });
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-IMP-01/);
});

test('R-IMP-02 rejects a goal without a deadline (astronaut)', () => {
  const spec = clone(example);
  delete node(spec, 'meta').metric.deadline;
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-IMP-02/);
});

test('R-IMP-04 rejects a deliverable hanging from an actor (jumper)', () => {
  const spec = clone(example);
  node(spec, 'cashback').parent = 'consumidor';
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-IMP-04/);
});

test('R-IMP-04 rejects a metric outside the goal', () => {
  const spec = clone(example);
  node(spec, 'lojista').metric = { name: 'Lojistas ativos', target: 5000, deadline: '2027' };
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-IMP-04/);
});

test('SOFT R-IMP-06 (generic actor) becomes a showcase-blocking advisory', () => {
  const spec = clone(example);
  node(spec, 'consumidor').label = 'Usuários';
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /method\/R-IMP-06/);
});

test('a waiver keeps the advisory visible without blocking', () => {
  const spec = clone(example);
  node(spec, 'consumidor').label = 'Usuários';
  spec.meta.waivers = [{ rule: 'R-IMP-06', subject: 'consumidor', reason: 'Termo usado pelo cliente no contrato.' }];
  const { status, receipt } = validateSpec('impactmap', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('R-IMP-11 warns when no path is selected and R-IMP-03 when the baseline is missing', () => {
  const spec = clone(example);
  delete node(spec, 'checkout-qr').on_path;
  delete node(spec, 'meta').metric.baseline;
  const { status, receipt } = validateSpec('impactmap', spec, 'standard');
  assert.equal(status, 0, findings(receipt));
  assert.match(findings(receipt), /R-IMP-11/);
  assert.match(findings(receipt), /R-IMP-03/);
});

test('R-IMP-08 flags an impact that reads like a feature', () => {
  const spec = clone(example);
  node(spec, 'sem-dinheiro').label = 'Tela de pagamento por QR';
  const { receipt } = validateSpec('impactmap', spec, 'standard');
  assert.match(findings(receipt), /R-IMP-08/);
});
