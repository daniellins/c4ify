import test from 'node:test';
import assert from 'node:assert/strict';
import { indexModel, resolveView } from '../renderers/c4/resolve.mjs';
import { assignRows, isInfrastructure } from '../renderers/c4/layout.mjs';
import { buildScene, wrapText } from '../renderers/c4/scene.mjs';
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

test('placement means the visual cell in both orientations', () => {
  const view = { ...viewOf('contexto'), placement: { loja: { row: 1, col: 0 } } };
  const resolved = resolveView(index, view);
  const layoutRows = assignRows(view, resolved);
  const t = (key) => key;
  const typeName = (element) => element.type;
  const tb = buildScene({ view, resolved, layoutRows, candidate: { direction: 'TB', elementWidth: 220, gapBoost: 0 }, t, typeName, viewIndex: 1 });
  const lr = buildScene({ view, resolved, layoutRows, candidate: { direction: 'LR', elementWidth: 220, gapBoost: 0 }, t, typeName, viewIndex: 1 });
  assert.deepEqual(tb.boxes.get('loja').cell, { row: 1, col: 0 });
  assert.deepEqual(lr.boxes.get('loja').cell, { row: 0, col: 1 });
});

test('a shared-services hub drops below the services its caller also uses', () => {
  const model = {
    elements: [
      { id: 'user', type: 'person', name: 'User' },
      { id: 's', type: 'softwareSystem', name: 'S' },
      { id: 'web', type: 'container', parent: 's', name: 'Web' },
      { id: 'checkout', type: 'container', parent: 's', name: 'Checkout' },
      { id: 'cart', type: 'container', parent: 's', name: 'Cart' },
      { id: 'catalog', type: 'container', parent: 's', name: 'Catalog' },
      { id: 'pay', type: 'container', parent: 's', name: 'Payment' },
    ],
    relationships: [{ from: 'user', to: 'web', description: 'Shops on' }]
      .concat(['cart', 'catalog', 'checkout'].map((to) => ({ from: 'web', to, description: 'Calls' })))
      .concat(['cart', 'catalog', 'pay'].map((to) => ({ from: 'checkout', to, description: 'Calls' }))),
  };
  const local = indexModel(model);
  const view = { key: 'c', type: 'container', scope: 's' };
  const { cells } = assignRows(view, resolveView(local, view), 6);
  assert.equal(cells.get('cart').row, cells.get('catalog').row);
  assert.ok(cells.get('checkout').row > cells.get('cart').row);
  assert.ok(cells.get('web').row < cells.get('cart').row);
});

test('long single words wrap at camelCase or separators instead of failing', () => {
  const wrapped = wrapText('productcatalogservice-v2 shoppingCartRepository', 12, 4);
  assert.equal(wrapped.overflow, false);
  assert.ok(wrapped.lines.every((line) => line.length <= 12));
  assert.ok(wrapped.lines.join('').replace(/ /g, '').includes('shoppingCartRepository'));
});

test('infrastructure is recognised from shape and technology', () => {
  assert.ok(isInfrastructure({ type: 'container', shape: 'database' }));
  assert.ok(isInfrastructure({ type: 'container', technology: 'Apache Kafka' }));
  assert.ok(isInfrastructure({ type: 'container', technology: 'PostgreSQL 16' }));
  assert.ok(!isInfrastructure({ type: 'container', technology: 'Spring Boot' }));
});
