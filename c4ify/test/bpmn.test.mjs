import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clone, findings, loadExample, skillRoot, validateSpec } from './helpers.mjs';

const example = loadExample('support-ticket.bpmn.json');
const flow = (spec, id) => spec.flows.find((item) => item.id === id);
const node = (spec, id) => spec.nodes.find((item) => item.id === id);

function rejects(spec, rule) {
  const { status, receipt } = validateSpec('bpmn', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), new RegExp(rule));
}

test('BPMN example passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('bpmn', example);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('R-BPMN-01 rejects a sequence flow into another pool', () => {
  const spec = clone(example);
  spec.flows.push({ id: 'bad', from: 'T6', to: 'P1' });
  rejects(spec, 'R-BPMN-01');
});

test('R-BPMN-03 rejects a message flow inside one pool', () => {
  const spec = clone(example);
  spec.flows.push({ id: 'bad', type: 'message', from: 'T4', to: 'T5', label: 'Aviso interno' });
  rejects(spec, 'R-BPMN-03');
});

test('R-BPMN-04 rejects a message flow on a gateway', () => {
  const spec = clone(example);
  flow(spec, 'm2').from = 'G3';
  rejects(spec, 'R-BPMN-04');
});

test('R-BPMN-05 and R-BPMN-07 reject flows into a start or out of an end', () => {
  const spec = clone(example);
  spec.flows.push({ id: 'loop', from: 'E1', to: 'S1' });
  const { status, receipt } = validateSpec('bpmn', spec);
  assert.notEqual(status, 0);
  assert.match(findings(receipt), /R-BPMN-05/);
  assert.match(findings(receipt), /R-BPMN-07/);
});

test('R-BPMN-11 rejects a boundary event attached to a gateway', () => {
  const spec = clone(example);
  node(spec, 'B1').attached_to = 'G1';
  rejects(spec, 'R-BPMN-11');
});

test('R-BPMN-13 rejects a condition on a parallel split', () => {
  const spec = clone(example);
  flow(spec, 'f11').label = 'Se urgente';
  rejects(spec, 'R-BPMN-13');
});

test('R-BPMN-30 rejects a node in an unknown lane and R-BPMN-25 a node in a black box', () => {
  const lane = clone(example);
  node(lane, 'T7').lane = 'L9';
  rejects(lane, 'R-BPMN-30');
  const box = clone(example);
  const t7 = node(box, 'T7');
  delete t7.lane;
  t7.pool = 'P1';
  rejects(box, 'R-BPMN-25');
});

test('R-BPMN-21 rejects a node unreachable from a start event', () => {
  const spec = clone(example);
  spec.nodes.push({ id: 'T9', lane: 'L3', kind: 'task', task_type: 'user', label: 'Auditar chamado', col: 8 });
  spec.flows.push({ id: 'f99', from: 'T9', to: 'G4' });
  rejects(spec, 'R-BPMN-21');
});

test('SOFT rules become showcase-blocking advisories (R-BPMN-16)', () => {
  const spec = clone(example);
  delete flow(spec, 'f5').label;
  rejects(spec, 'method/R-BPMN-16');
});

test('a waiver keeps the advisory visible without blocking', () => {
  const spec = clone(example);
  delete flow(spec, 'f5').label;
  spec.meta.waivers = [{ rule: 'R-BPMN-16', subject: 'G1', reason: 'Ramo negativo óbvio para o time de suporte.' }];
  const { status, receipt } = validateSpec('bpmn', spec);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.composition.metrics.waivedAdvisories, 1);
});

test('implicit merge and noun-labelled task warn in standard (R-BPMN-29, R-BPMN-26)', () => {
  const spec = clone(example);
  spec.nodes = spec.nodes.filter((item) => item.id !== 'G5');
  spec.flows = spec.flows.filter((item) => !['f5', 'f7', 'f8'].includes(item.id));
  spec.flows.push({ id: 'f5', from: 'G1', to: 'T3', label: 'Não' }, { id: 'f7', from: 'T7', to: 'T3' });
  node(spec, 'T1').label = 'Registro do chamado';
  delete spec.meta.views;
  const { receipt } = validateSpec('bpmn', spec, 'standard');
  assert.match(findings(receipt), /R-BPMN-29/);
  assert.match(findings(receipt), /R-BPMN-26/);
});

test('a small single-pool process without lanes renders', () => {
  const spec = {
    schema_version: 1,
    diagram_type: 'bpmn',
    meta: { title: 'Aprovação simples', locale: 'pt-BR', conformance: 'descriptive' },
    pools: [{ id: 'P', label: 'Financeiro' }],
    nodes: [
      { id: 'S', kind: 'event', event: 'start', label: 'Fatura recebida' },
      { id: 'A', kind: 'task', task_type: 'user', label: 'Validar fatura' },
      { id: 'N', kind: 'annotation', label: 'Conferência manual hoje' },
      { id: 'E', kind: 'event', event: 'end', label: 'Fatura validada' },
    ],
    flows: [{ from: 'S', to: 'A' }, { from: 'A', to: 'E' }, { type: 'association', from: 'N', to: 'A' }],
  };
  const { status, receipt } = validateSpec('bpmn', spec, 'standard');
  assert.equal(status, 0, findings(receipt));
});

// Regression fixture (iteration-2 evaluation): purchase requisition with the
// lanes in the order a person draws them — Solicitante, Gestor, Diretoria,
// Compras. The rework loop (Ajustar -> Analisar) must route back up without
// the author reordering lanes.
const purchase = {
  schema_version: 1,
  diagram_type: 'bpmn',
  meta: {"title":"Requisição de compras — AS-IS","locale":"pt-BR","quality_profile":"showcase","variant":"as-is","level":"operational","conformance":"descriptive+","task_width":150,"views":[{"id":"aprovacao","label":"Aprovação do gestor","focus":["T1","GM","T2","G1","T3"],"note":"Requisição reprovada volta ao solicitante para ajuste e retorna à análise do gestor."},{"id":"alcada","label":"Alçada acima de R$ 10 mil","focus":["G2","T4","G3","E2","GC"],"note":"Valores acima de R$ 10 mil passam também pela diretoria financeira antes de seguir para Compras."},{"id":"cobranca","label":"Cotação e cobrança","focus":["T5","GW","T6","B1","T7"],"note":"Sem resposta do fornecedor em 3 dias úteis, Compras cobra por e-mail e volta a aguardar a cotação."}]},
  pools: [{"id":"PF","label":"Fornecedor","black_box":true},{"id":"PE","label":"Empresa","lanes":[{"id":"LS","label":"Solicitante"},{"id":"LG","label":"Gestor da área"},{"id":"LD","label":"Diretoria financeira"},{"id":"LC","label":"Compras"}]}],
  nodes: [
    {"id": "S1", "lane": "LS", "kind": "event", "event": "start", "label": "Compra necessária"},
    {"id": "T1", "lane": "LS", "kind": "task", "task_type": "user", "label": "Preencher requisição no ERP", "owner": "Solicitante"},
    {"id": "D1", "lane": "LS", "kind": "data-store", "label": "ERP"},
    {"id": "T3", "lane": "LS", "kind": "task", "task_type": "user", "label": "Ajustar requisição", "owner": "Solicitante", "col": 5},
    {"id": "GM", "lane": "LG", "kind": "gateway", "gateway": "exclusive"},
    {"id": "T2", "lane": "LG", "kind": "task", "task_type": "user", "label": "Analisar requisição", "owner": "Gestor da área"},
    {"id": "G1", "lane": "LG", "kind": "gateway", "gateway": "exclusive", "label": "Requisição aprovada?"},
    {"id": "G2", "lane": "LG", "kind": "gateway", "gateway": "exclusive", "label": "Valor acima de R$ 10 mil?"},
    {"id": "T4", "lane": "LD", "kind": "task", "task_type": "user", "label": "Analisar requisição de alto valor", "owner": "Diretoria financeira"},
    {"id": "G3", "lane": "LD", "kind": "gateway", "gateway": "exclusive", "label": "Aprovada pela diretoria?"},
    {"id": "E2", "lane": "LD", "kind": "event", "event": "end", "label": "Reprovada na diretoria"},
    {"id": "GC", "lane": "LG", "kind": "gateway", "gateway": "exclusive"},
    {"id": "T5", "lane": "LC", "kind": "task", "task_type": "send", "label": "Solicitar cotação aos fornecedores", "owner": "Compras"},
    {"id": "GW", "lane": "LC", "kind": "gateway", "gateway": "exclusive"},
    {"id": "T6", "lane": "LC", "kind": "task", "task_type": "receive", "label": "Receber cotação por e-mail", "sla": "3 dias úteis"},
    {"id": "B1", "lane": "LC", "kind": "event", "attached_to": "T6", "trigger": "timer", "label": "3 dias úteis"},
    {"id": "T7", "lane": "LC", "kind": "task", "task_type": "send", "label": "Cobrar fornecedor", "owner": "Compras", "row": 1, "col": 15},
    {"id": "T9", "lane": "LC", "kind": "task", "task_type": "send", "label": "Emitir pedido de compra", "owner": "Compras", "note": "Compras compara as cotações recebidas e emite o pedido ao fornecedor escolhido.", "col": 13},
    {"id": "E1", "lane": "LC", "kind": "event", "event": "end", "label": "Pedido de compra emitido", "col": 14},
  ],
  flows: [
    {"id": "f1", "from": "S1", "to": "T1"},
    {"id": "f2", "from": "T1", "to": "GM"},
    {"id": "f3", "from": "GM", "to": "T2"},
    {"id": "f4", "from": "T2", "to": "G1"},
    {"id": "f5", "from": "G1", "to": "G2", "label": "Sim", "default": true},
    {"id": "f6", "from": "G1", "to": "T3", "label": "Não"},
    {"id": "f7", "from": "T3", "to": "GM"},
    {"id": "f8", "from": "G2", "to": "GC", "label": "Não", "default": true},
    {"id": "f9", "from": "G2", "to": "T4", "label": "Sim"},
    {"id": "f10", "from": "T4", "to": "G3"},
    {"id": "f11", "from": "G3", "to": "GC", "label": "Sim", "default": true},
    {"id": "f12", "from": "G3", "to": "E2", "label": "Não"},
    {"id": "f13", "from": "GC", "to": "T5", "route": "horizontal-first"},
    {"id": "f14", "from": "T5", "to": "GW"},
    {"id": "f15", "from": "GW", "to": "T6"},
    {"id": "f16", "from": "B1", "to": "T7"},
    {"id": "f17", "from": "T7", "to": "GW"},
    {"id": "f18", "from": "T6", "to": "T9"},
    {"id": "f20", "from": "T9", "to": "E1"},
    {"id": "m1", "type": "message", "from": "T5", "to": "PF", "label": "Pedido de cotação"},
    {"id": "m2", "type": "message", "from": "PF", "to": "T6", "label": "Cotação"},
    {"id": "m3", "type": "message", "from": "T7", "to": "PF", "label": "Cobrança"},
    {"id": "m4", "type": "message", "from": "T9", "to": "PF", "label": "Pedido de compra"},
    {"id": "a1", "type": "association", "from": "T1", "to": "D1"},
  ],
  happy_path: ["S1","T1","GM","T2","G1","G2","GC","T5","GW","T6","T9","E1"],
};

// Render to a temp file and return the SVG markup.
function renderSvg(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizify-bpmn-svg-'));
  const input = path.join(dir, 'spec.bpmn.json');
  const output = path.join(dir, 'out.html');
  fs.writeFileSync(input, JSON.stringify(spec));
  try {
    const result = spawnSync(process.execPath, [path.join(skillRoot, 'bin/bizify.mjs'), 'render', 'bpmn', input, output, '--quality', 'showcase'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const html = fs.readFileSync(output, 'utf8');
    return html.slice(html.indexOf('<svg viewBox'), html.indexOf('</svg>'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const laneTops = (svg) => Object.fromEntries([...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)"[^>]*data-composition-frame-kind="lane" data-composition-frame-id="([^"]+)"/g)].map((m) => [m[2], Number(m[1])]));

// Smallest node label projected on the 1440x900 first screen (~1350 x 540 px
// for the diagram); mirrors the layout's legibility target.
function projectedMinimum(svg) {
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const beforeLegend = svg.slice(0, svg.indexOf('<!-- Legend -->'));
  const fonts = [...beforeLegend.matchAll(/<text data-node-label=""[^>]*font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
  return Math.min(...fonts) * Math.min(1, 1350 / w, 540 / h);
}

test('purchase fixture with natural lane order passes showcase with zero warnings', () => {
  const { status, receipt } = validateSpec('bpmn', purchase);
  assert.equal(status, 0, findings(receipt));
  assert.equal(receipt.checks.length, 9);
  assert.equal(receipt.composition.summary.errors, 0);
  assert.equal(receipt.composition.summary.warnings, 0);
});

test('lanes keep their authored order and the rework loop routes back up', () => {
  const svg = renderSvg(purchase);
  const tops = laneTops(svg);
  assert.ok(tops.LS < tops.LG && tops.LG < tops.LD && tops.LD < tops.LC, JSON.stringify(tops));
  const loop = svg.match(/<path [^>]*data-edge-from="T3"[^>]*data-edge-to="GM"[^>]*data-composition-points="([^"]+)"/);
  assert.ok(loop, 'rework flow T3 -> GM is rendered');
  const points = loop[1].split(';').map((pair) => pair.split(',').map(Number));
  assert.ok(points.length <= 4, `loop uses at most two bends: ${loop[1]}`);
});

test('compact layout keeps the smallest label legible on a 1440x900 screen', () => {
  assert.ok(projectedMinimum(renderSvg(purchase)) >= 8, 'purchase fixture');
  assert.ok(projectedMinimum(renderSvg(example)) >= 8, 'support example');
});

test('a message flow blocked by a node names the node and suggests "col", never lane order', () => {
  const spec = clone(purchase);
  delete spec.meta.task_width;
  for (const item of spec.nodes) { delete item.col; delete item.row; }
  const { status, receipt } = validateSpec('bpmn', spec);
  assert.notEqual(status, 0);
  const text = findings(receipt);
  assert.match(text, /Message flow "m3".*runs through.*"col"/);
  assert.doesNotMatch(text, /reorder/i);
});
