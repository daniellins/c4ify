import test from 'node:test';
import assert from 'node:assert/strict';
import { drillTarget, indexModel, kindOf, liftRelationships, resolveView } from '../renderers/c4/resolve.mjs';

const model = {
  elements: [
    { id: 'user', type: 'person', name: 'User' },
    { id: 'shop', type: 'softwareSystem', name: 'Shop' },
    { id: 'web', type: 'container', parent: 'shop', name: 'Web' },
    { id: 'api', type: 'container', parent: 'shop', name: 'API' },
    { id: 'ctrl', type: 'component', parent: 'api', name: 'Controller' },
    { id: 'repo', type: 'component', parent: 'api', name: 'Repository' },
    { id: 'db', type: 'container', parent: 'shop', name: 'DB' },
    { id: 'mail', type: 'softwareSystem', external: true, name: 'Mail' },
    { id: 'idle', type: 'softwareSystem', name: 'Unrelated' },
  ],
  relationships: [
    { from: 'user', to: 'web', description: 'Uses the shop through' },
    { from: 'web', to: 'ctrl', description: 'Calls' },
    { from: 'ctrl', to: 'repo', description: 'Reads orders through' },
    { from: 'repo', to: 'db', description: 'Reads from' },
    { from: 'ctrl', to: 'mail', description: 'Sends e-mails using' },
    { from: 'api', to: 'mail', description: 'Reports bounces to' },
  ],
};
const index = indexModel(model);
const ids = (elements) => elements.map((element) => element.id).sort();
const pairs = (relationships) => relationships.map((relationship) => `${relationship.from}>${relationship.to}`).sort();

test('context view shows the scope and the people and systems it talks to, lifted to system level', () => {
  const view = resolveView(index, { key: 'ctx', type: 'systemContext', scope: 'shop' });
  assert.deepEqual(ids(view.elements), ['mail', 'shop', 'user']);
  assert.deepEqual(pairs(view.relationships), ['shop>mail', 'user>shop']);
  assert.equal(view.boundary, null);
});

test('container view shows the containers inside a boundary and lifts component relationships to them', () => {
  const view = resolveView(index, { key: 'ctr', type: 'container', scope: 'shop' });
  assert.deepEqual(ids(view.elements), ['api', 'db', 'mail', 'user', 'web']);
  assert.deepEqual(pairs(view.relationships), ['api>db', 'api>mail', 'user>web', 'web>api']);
  assert.equal(view.boundary.id, 'shop');
});

test('a direct relationship wins the label over an implied one and merged counts are kept', () => {
  const view = resolveView(index, { key: 'ctr', type: 'container', scope: 'shop' });
  const toMail = view.relationships.find((relationship) => relationship.to === 'mail');
  assert.equal(toMail.description, 'Reports bounces to');
  assert.equal(toMail.count, 2);
});

test('component view shows sibling containers and outside systems at their own level', () => {
  const view = resolveView(index, { key: 'cmp', type: 'component', scope: 'api' });
  assert.deepEqual(ids(view.elements), ['ctrl', 'db', 'mail', 'repo', 'web']);
  assert.deepEqual(pairs(view.relationships), ['ctrl>mail', 'ctrl>repo', 'repo>db', 'web>ctrl']);
});

test('include and exclude adjust the default element set', () => {
  const view = resolveView(index, { key: 'ctx', type: 'systemContext', scope: 'shop', include: ['idle'], exclude: ['mail'] });
  assert.deepEqual(ids(view.elements), ['idle', 'shop', 'user']);
});

test('landscape view shows every person and system', () => {
  const view = resolveView(index, { key: 'land', type: 'systemLandscape' });
  assert.deepEqual(ids(view.elements), ['idle', 'mail', 'shop', 'user']);
});

test('relationships inside one visible element disappear', () => {
  const lifted = liftRelationships(index, new Set(['shop', 'user']));
  assert.deepEqual(pairs(lifted), ['user>shop']);
});

test('kinds distinguish internal and external elements', () => {
  assert.equal(kindOf({ type: 'softwareSystem' }), 'software-system');
  assert.equal(kindOf({ type: 'softwareSystem', external: true }), 'external-system');
  assert.equal(kindOf({ type: 'person', external: true }), 'external-person');
});

test('drill-down opens the next level about the element', () => {
  const views = [
    { key: 'land', type: 'systemLandscape' },
    { key: 'ctx', type: 'systemContext', scope: 'shop' },
    { key: 'ctr', type: 'container', scope: 'shop' },
    { key: 'cmp', type: 'component', scope: 'api' },
  ];
  const [land, ctx, ctr] = views;
  assert.equal(drillTarget(views, land, 'shop').key, 'ctx');
  assert.equal(drillTarget(views, ctx, 'shop').key, 'ctr');
  assert.equal(drillTarget(views, ctr, 'api').key, 'cmp');
  assert.equal(drillTarget(views, ctr, 'mail'), null);
});

test('implied relationships that disagree on technology keep none, however many merge', () => {
  const local = indexModel({
    elements: [
      { id: 's', type: 'softwareSystem', name: 'S' },
      { id: 'a', type: 'container', parent: 's', name: 'A' },
      { id: 'b', type: 'container', parent: 's', name: 'B' },
      { id: 'c', type: 'container', parent: 's', name: 'C' },
      { id: 't', type: 'softwareSystem', name: 'T' },
    ],
    relationships: [
      { from: 'a', to: 't', description: 'Calls', technology: 'HTTP' },
      { from: 'b', to: 't', description: 'Calls', technology: 'gRPC' },
      { from: 'c', to: 't', description: 'Calls', technology: 'HTTP' },
    ],
  });
  const [merged] = liftRelationships(local, new Set(['s', 't']));
  assert.equal(merged.count, 3);
  assert.equal(merged.technology, undefined);
});
