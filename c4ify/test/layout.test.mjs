import test from 'node:test';
import assert from 'node:assert/strict';
import { indexModel, resolveView } from '../renderers/c4/resolve.mjs';
import { assignRows, isInfrastructure } from '../renderers/c4/layout.mjs';
import { loadExample } from './helpers.mjs';

const example = loadExample('online-store.c4.json');
const index = indexModel(example.model);
const viewOf = (key) => example.views.find((view) => view.key === key);
const rowsOf = (key) => {
  const view = viewOf(key);
  return { view, ...assignRows(view, resolveView(index, view)) };
};

test('people start the reading order on the first row', () => {
  const { cells } = rowsOf('contexto');
  assert.equal(cells.get('cliente').row, 0);
  assert.equal(cells.get('atendente').row, 0);
  assert.equal(cells.get('loja').row, 1);
});

test('stores and queues share the last boundary row', () => {
  const { cells, boundaryRows } = rowsOf('conteineres');
  assert.equal(cells.get('banco').row, cells.get('fila').row);
  assert.equal(Math.max(...boundaryRows), cells.get('banco').row);
});

test('a worker nobody calls sits beside the service it feeds, not above it', () => {
  const { cells } = rowsOf('conteineres');
  assert.equal(cells.get('processador').row, cells.get('api').row);
});

test('systems the scope calls stand in a side column of a container view', () => {
  const { cells, sideIds } = rowsOf('conteineres');
  assert.deepEqual([...sideIds].sort(), ['email', 'erp', 'pagamentos']);
  const sideCol = cells.get('pagamentos').col;
  for (const id of sideIds) assert.equal(cells.get(id).col, sideCol);
  assert.ok(sideCol > Math.max(cells.get('api').col, cells.get('processador').col));
});

test('a single scope row is centred over the whole canvas in a context view', () => {
  const { cells } = rowsOf('contexto');
  assert.equal(cells.get('loja').col, 1);
});

test('placement overrides the computed cell', () => {
  const view = { ...viewOf('contexto'), placement: { loja: { row: 1, col: 0 } } };
  const { cells } = assignRows(view, resolveView(index, view));
  assert.deepEqual(cells.get('loja'), { row: 1, col: 0 });
});

test('infrastructure is recognised from shape and technology', () => {
  assert.ok(isInfrastructure({ type: 'container', shape: 'database' }));
  assert.ok(isInfrastructure({ type: 'container', technology: 'Apache Kafka' }));
  assert.ok(isInfrastructure({ type: 'container', technology: 'PostgreSQL 16' }));
  assert.ok(!isInfrastructure({ type: 'container', technology: 'Spring Boot' }));
});
