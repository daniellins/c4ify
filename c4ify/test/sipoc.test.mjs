import test from 'node:test';
import assert from 'node:assert/strict';
import { clone, findings, loadExample, validateSpec } from './helpers.mjs';

const example = loadExample('release-management.sipoc.json');

test('SIPOC example passes showcase with zero warnings and zero crossings', () => {
  const { status, receipt } = validateSpec('sipoc', example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
  assert.equal(receipt.composition.metrics.properCrossings, 0);
});

test('R-SIPOC-01 rejects an empty column', () => {
  const spec = clone(example);
  spec.customers = [];
  spec.links = spec.links.filter((link) => !['build', 'notas', 'relatorio'].includes(link.from));
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-SIPOC-01/);
});

test('R-SIPOC-02 rejects a missing end boundary', () => {
  const spec = clone(example);
  delete spec.boundaries.end;
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-SIPOC-02/);
});

test('R-SIPOC-03 rejects more than ten steps', () => {
  const spec = clone(example);
  for (let index = 7; index <= 11; index += 1) spec.steps.push({ id: `extra${index}`, label: `Revisar item ${index}`, order: index });
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-SIPOC-03/);
});

test('R-SIPOC-04 rejects a link that skips a column', () => {
  const spec = clone(example);
  spec.links.push({ from: 'qa', to: 'regressao' });
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-SIPOC-04/);
});

test('R-SIPOC-04 rejects an input without a supplier', () => {
  const spec = clone(example);
  spec.links = spec.links.filter((link) => link.to !== 'pentest');
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-SIPOC-04/);
});

test('SOFT R-SIPOC-07 (output without CTQ) becomes a showcase-blocking advisory', () => {
  const spec = clone(example);
  delete spec.outputs.find((output) => output.id === 'notas').requirements;
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /method\/R-SIPOC-07/);
});

test('a waiver keeps the advisory visible without blocking', () => {
  const spec = clone(example);
  delete spec.outputs.find((output) => output.id === 'notas').requirements;
  spec.meta.waivers = [{ rule: 'R-SIPOC-07', subject: 'notas', reason: 'CTQ das notas ainda em definição com o suporte.' }];
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('reference fields replace drawn links and COPIS mirrors the columns', () => {
  const spec = clone(example);
  spec.meta.variant = 'copis';
  delete spec.meta.views;
  const supplierIds = new Set(spec.suppliers.map((item) => item.id));
  for (const input of spec.inputs) {
    input.supplier = spec.links.find((link) => link.to === input.id && supplierIds.has(link.from)).from;
    input.steps = spec.links.filter((link) => link.from === input.id).map((link) => link.to);
  }
  for (const output of spec.outputs) output.customers = spec.links.filter((link) => link.from === output.id).map((link) => link.to);
  spec.links = spec.links.filter((link) => spec.steps.some((step) => step.id === link.from));
  const { status, receipt } = validateSpec('sipoc', spec);
  assert.equal(status, 0, findings(receipt));
});

test('R-SIPOC-06 and R-SIPOC-09 flag a decision phrased as a step', () => {
  const spec = clone(example);
  spec.steps.find((step) => step.id === 'corrigir').label = 'Bloqueador encontrado?';
  const { receipt } = validateSpec('sipoc', spec, 'standard');
  assert.match(findings(receipt), /R-SIPOC-06/);
  assert.match(findings(receipt), /R-SIPOC-09/);
});
