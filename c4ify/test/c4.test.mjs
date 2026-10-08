import test from 'node:test';
import assert from 'node:assert/strict';
import { clone, deliverSpec, findings, loadExample, spawnValidate, validateSpec } from './helpers.mjs';

const example = loadExample('online-store.c4.json');

test('the bundled example passes showcase in every view with no warnings', () => {
  const { status, receipt } = validateSpec(example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.views.length, example.views.length);
  for (const view of receipt.views) {
    assert.equal(view.ok, true, `${view.view}: ${findings(view)}`);
    assert.equal(view.composition.summary.warnings, 0, view.view);
  }
});

test('deliver writes one linked HTML file per view, with drill-down and navigation', () => {
  const { status, receipt, html } = deliverSpec(example);
  assert.equal(status, 0, findings(receipt));
  assert.match(receipt.entry, /panorama\.html$/);
  assert.match(html.panorama, /data-c4-drill="contexto\.html"/);
  assert.match(html.contexto, /data-c4-drill="conteineres\.html"/);
  assert.match(html.conteineres, /<a href="contexto\.html"/);
  assert.match(html.conteineres, /aria-current="page"/);
});

test('delivered views never contain an em dash in visible text', () => {
  const { html } = deliverSpec(example);
  for (const [view, page] of Object.entries(html)) {
    const svg = page.slice(page.indexOf('<svg'), page.indexOf('</svg>'));
    assert.ok(!svg.includes(' — '), `${view}: em dash in the SVG`);
    assert.ok(!/<nav class="c4-nav[\s\S]*?—[\s\S]*?<\/nav>/.test(page), `${view}: em dash in navigation`);
  }
});

test('the default title names the diagram type and scope (C4 notation)', () => {
  const { html } = deliverSpec(example);
  assert.match(html.contexto, /<h1>Diagrama de contexto do sistema Loja On-line<\/h1>/);
  assert.match(html.conteineres, /<h1>Diagrama de contêineres de Loja On-line<\/h1>/);
});

test('R-C4-01 rejects a container without a software system parent', () => {
  const spec = clone(example);
  spec.model.elements.find((element) => element.id === 'api').parent = 'cliente';
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-01/);
});

test('R-C4-02 rejects a container view scoped to a container', () => {
  const spec = clone(example);
  spec.views[2].scope = 'api';
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-02/);
});

test('R-C4-03 rejects an unlabelled relationship', () => {
  const spec = clone(example);
  delete spec.model.relationships[0].description;
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-03/);
});

test('R-C4-04 rejects an arrow from an element to its own parent', () => {
  const spec = clone(example);
  spec.model.relationships.push({ from: 'api', to: 'loja', description: 'Belongs to' });
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-04/);
});

test('R-C4-05 rejects zooming into a system without containers', () => {
  const spec = clone(example);
  spec.views.push({ key: 'erp-ctr', type: 'container', scope: 'erp' });
  const { status, receipt } = validateSpec(spec, { view: 'erp-ctr' });
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-05/);
});

test('a container without technology is a SOFT finding that blocks showcase only', () => {
  const spec = clone(example);
  delete spec.model.elements.find((element) => element.id === 'api').technology;
  const showcase = validateSpec(spec, { view: 'conteineres' });
  assert.notEqual(showcase.status, 0);
  assert.match(findings(showcase.receipt), /R-C4-07/);
  const standard = validateSpec(spec, { view: 'conteineres', quality: 'standard' });
  assert.equal(standard.status, 0, findings(standard.receipt));
});

test('a waiver with a reason clears the SOFT finding in showcase', () => {
  const spec = clone(example);
  delete spec.model.elements.find((element) => element.id === 'api').technology;
  spec.meta.waivers = [{ rule: 'R-C4-07', subject: 'api', reason: 'Pendente: stack da API em definição' }];
  const { status, receipt } = validateSpec(spec, { view: 'conteineres' });
  assert.equal(status, 0, findings(receipt));
});

test('an unexplained acronym is flagged until it enters the glossary', () => {
  const spec = clone(example);
  delete spec.meta.glossary;
  const { receipt } = validateSpec(spec, { view: 'contexto' });
  assert.match(findings(receipt), /R-C4-09/);
});

test('a vague relationship description is flagged', () => {
  const spec = clone(example);
  spec.model.relationships[2].description = 'Usa';
  const { receipt } = validateSpec(spec, { view: 'conteineres' });
  assert.match(findings(receipt), /R-C4-11/);
});

test('an unknown --view is reported with the available keys', () => {
  const { status, receipt } = validateSpec(example, { view: 'nope' });
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /panorama, contexto, conteineres/);
});

// Regressions from the first code review.
test('an option before the type still validates every view', () => {
  const spec = clone(example);
  delete spec.model.elements.find((element) => element.id === 'api').technology;
  const result = spawnValidate(['--quality', 'standard', 'c4'], spec);
  assert.equal(result.receipt.views.length, example.views.length);
});

test('landscape include/exclude reference real elements at system level', () => {
  const spec = clone(example);
  spec.views[0].include = ['api'];
  spec.views[0].exclude = ['ghost'];
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /includes container "api"/);
  assert.match(findings(receipt), /excludes unknown element "ghost"/);
});

test('a view cannot include its own scope', () => {
  const spec = clone(example);
  spec.views[2].include = ['loja'];
  const { status, receipt } = validateSpec(spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /its own scope/);
});

test('a vague label lifted from a lower level is flagged where it is drawn', () => {
  const spec = clone(example);
  spec.model.relationships.find((relationship) => relationship.to === 'pagamentos').description = 'uses';
  const { receipt } = validateSpec(spec, { view: 'contexto' });
  assert.match(findings(receipt), /R-C4-11/);
});

test('a view that draws nothing is refused with R-C4-05', () => {
  const spec = clone(example);
  spec.views[2].exclude = ['spa', 'painel', 'api', 'processador', 'fila', 'banco'];
  const { status, receipt } = validateSpec(spec, { view: 'conteineres' });
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-C4-05/);
});

test('a long technology still fits a vertical label', () => {
  const spec = clone(example);
  spec.model.relationships[0].technology = 'HTTPS with mutual TLS and OAuth';
  const { receipt } = validateSpec(spec, { view: 'contexto', quality: 'standard' });
  assert.doesNotMatch(findings(receipt), /does not fit/);
});

test('uppercase words with accents are not taken for acronyms', () => {
  const spec = clone(example);
  spec.model.elements.find((element) => element.id === 'loja').description = 'Loja ELETRÔNICA com catálogo e pedidos.';
  const { receipt } = validateSpec(spec, { view: 'contexto' });
  assert.doesNotMatch(findings(receipt), /ELETR/);
});
