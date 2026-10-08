import test from 'node:test';
import assert from 'node:assert/strict';
import { clone, findings, loadExample, validateSpec } from './helpers.mjs';

const example = loadExample('rd-project.wbs.json');

test('WBS example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('wbs', example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('R-WBS-01 rejects a second root', () => {
  const spec = clone(example);
  spec.elements.push({ id: 'orfao', label: 'Outro projeto' });
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-WBS-01/);
});

test('R-WBS-08 rejects a declared parent effort that breaks the 100% rule', () => {
  const spec = clone(example);
  spec.elements.find((element) => element.id === 'gp').effort = 999;
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-WBS-08/);
});

test('R-WBS-07 rejects a work package that has children', () => {
  const spec = clone(example);
  spec.elements.find((element) => element.id === 'modelo').kind = 'work-package';
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-WBS-07/);
});

test('R-WBS-10 rejects nested control accounts', () => {
  const spec = clone(example);
  spec.elements.find((element) => element.id === 'dataset').control_account = true;
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-WBS-10/);
});

test('SOFT rules become showcase-blocking advisories', () => {
  const spec = clone(example);
  spec.elements.find((element) => element.id === 'ing-test').label = 'Testar a ingestão';
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /method\/R-WBS-15/);
});

test('a waiver keeps the advisory visible without blocking', () => {
  const spec = clone(example);
  spec.elements.find((element) => element.id === 'ing-test').label = 'Testar a ingestão';
  spec.meta.waivers = [{ rule: 'R-WBS-15', subject: 'ing-test', reason: 'Nome exigido pelo edital do cliente.' }];
  const { status, receipt } = validateSpec('wbs', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('missing project management at level 2 warns (R-WBS-12)', () => {
  const spec = clone(example);
  spec.elements = spec.elements.filter((element) => !['gp', 'gp-rel', 'gp-final'].includes(element.id));
  delete spec.meta.views;
  const { receipt } = validateSpec('wbs', spec, 'standard');
  assert.match(findings(receipt), /R-WBS-12/);
});

test('tree layout renders a small WBS', () => {
  const spec = clone(example);
  spec.meta.layout = 'tree';
  delete spec.meta.views;
  spec.elements = spec.elements.filter((element) => ['raiz', 'gp', 'gp-rel', 'gp-final', 'integrado', 'build', 'validacao'].includes(element.id));
  const { status, receipt } = validateSpec('wbs', spec, 'standard');
  assert.equal(status, 0, findings(receipt));
});

test('reference_total shows the stated total beside the computed roll-up', () => {
  const spec = clone(example);
  spec.meta.reference_total = { effort: 1920, source: 'proposta' };
  const { status, receipt } = validateSpec('wbs', spec);
  assert.equal(status, 0, findings(receipt));
});

test('standard profile accepts 10 level-2 columns with groups, sublabels and unnumbered root', () => {
  const spec = { schema_version: 1, diagram_type: 'wbs', meta: { title: 'EAP larga', locale: 'pt-BR', quality_profile: 'standard', root_unnumbered: true, color_by: 'group', groups: { Gestão: 'external', Produto: 'backend' } }, elements: [{ id: 'raiz', label: 'Projeto', sublabel: 'Cliente · 12 meses' }] };
  for (let i = 1; i <= 10; i += 1) {
    spec.elements.push({ id: `e${i}`, parent: 'raiz', label: i === 1 ? 'Gestão do Projeto' : `Entrega ${i}`, group: i === 1 ? 'Gestão' : 'Produto', sublabel: 'complemento curto' });
    spec.elements.push({ id: `e${i}a`, parent: `e${i}`, label: `Pacote ${i}A` }, { id: `e${i}b`, parent: `e${i}`, label: `Pacote ${i}B` });
  }
  const { status, receipt } = validateSpec('wbs', spec, 'standard');
  assert.equal(status, 0, findings(receipt));
});

test('showcase still limits level 2 to 7 columns', () => {
  const spec = { schema_version: 1, diagram_type: 'wbs', meta: { title: 'EAP larga', quality_profile: 'showcase' }, elements: [{ id: 'raiz', label: 'Projeto' }] };
  for (let i = 1; i <= 8; i += 1) spec.elements.push({ id: `e${i}`, parent: 'raiz', label: `Entrega ${i}` }, { id: `e${i}a`, parent: `e${i}`, label: `Pacote ${i}A` }, { id: `e${i}b`, parent: `e${i}`, label: `Pacote ${i}B` });
  const { status, receipt } = validateSpec('wbs', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /standard allows 10/);
});
