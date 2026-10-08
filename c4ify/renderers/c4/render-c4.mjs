// C4 renderer: one model JSON → one view → one standalone HTML artifact.
//
// The view is chosen with C4IFY_VIEW (the CLI sets it from --view); without it
// the first view renders. Every view of a model links to its siblings through
// a navigation bar and drill-down targets, so delivering all views into one
// folder gives an explorable set of HTML files.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDiagramWithBrandMarks, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { createAdvisories } from '../shared/method.mjs';
import {
  cleanAmbiguousCorridorProblems,
  cleanBorderRunProblems,
  cleanCrossingProblems,
  cleanEndpointSideProblems,
  cleanFlowProblems,
  cleanLabelRouteClearanceProblems,
  cleanRouteRhythmProblems,
  rectsOverlap,
} from '../shared/geometry.mjs';
import { drillTarget, indexModel, resolveView } from './resolve.mjs';
import { hardRuleProblems, modelAdvisories, relationshipAdvisories, viewAdvisories } from './rules.mjs';
import { assignRows } from './layout.mjs';
import { createRouter } from './routing.mjs';
import { buildScene } from './scene.mjs';
import { createLabeler, segmentLength } from './labels.mjs';
import { createSvgRenderer, renderViewNav } from './svg.mjs';

const MAX_SPACING_RETRIES = 3;
const SPACING_STEP = 28;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'c4',
  defaultExample: 'online-store.c4.json',
});

const { meta, model, views } = diagram;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const index = indexModel(model);
const subject = { diagramType: 'c4' };

// ---------------------------------------------------------------------------
// Model rules, view selection, method advisories
// ---------------------------------------------------------------------------
const hard = hardRuleProblems(index, model, views);
if (hard.length) throwDiagnosticProblems('C4 model validation failed', hard, { code: 'method/hard-rule', subject });

const requestedKey = process.env.C4IFY_VIEW;
const view = requestedKey ? views.find((candidate) => candidate.key === requestedKey) : views[0];
if (!view) {
  throwDiagnosticProblems('C4 view selection failed', [`Unknown view "${requestedKey}". Views in this model: ${views.map((candidate) => candidate.key).join(', ')}.`], { code: 'cli/unknown-view', subject });
}
const viewIndex = views.indexOf(view);

const resolvedViews = new Map(views.map((candidate) => [candidate.key, resolveView(index, candidate)]));
const resolved = resolvedViews.get(view.key);
const shownAnywhere = new Set([...resolvedViews.values()].flatMap((entry) => [
  ...entry.elements.map((element) => element.id),
  ...(entry.boundary ? [entry.boundary.id] : []),
]));
const shownHere = new Set(resolved.elements.map((element) => element.id));

// R-C4-05: a view must draw something, and a zoomed view something inside
// its boundary (include/exclude can empty either).
if (!resolved.elements.length || (resolved.boundary && !resolved.core.length)) {
  const what = resolved.elements.length ? `nothing inside "${view.scope}"` : 'no elements';
  throwDiagnosticProblems('C4 model validation failed', [`[R-C4-05] View "${view.key}" draws ${what}; check its include/exclude lists.`], { code: 'method/hard-rule', subject });
}

const advisories = createAdvisories(meta);
modelAdvisories({ model, glossary: meta.glossary, advisories, t, shownHere, shownAnywhere, isFirstView: viewIndex === 0 });
viewAdvisories(view, resolved, index, advisories, t);
relationshipAdvisories(resolved, meta.glossary, advisories, t);

// Guided chapters of this view may only focus elements the view draws.
const chapterProblems = (view.chapters || []).flatMap((chapter, position) => chapter.focus
  .filter((id) => !shownHere.has(id))
  .map((id) => `views[${viewIndex}].chapters[${position}] focuses "${id}", which view "${view.key}" does not draw.`));
if (chapterProblems.length) throwDiagnosticProblems('Guided view validation failed', chapterProblems, { code: 'guided-view/invalid', subject });

function viewTitle(candidate) {
  if (candidate.title) return candidate.title;
  if (candidate.type === 'systemLandscape') {
    return model.enterprise ? t('c4.view.landscapeOf', { name: model.enterprise }) : t('c4.view.systemLandscape');
  }
  return t(`c4.view.${candidate.type}`, { name: index.elements.get(candidate.scope).name });
}

function typeName(element) {
  const base = t(`c4.type.${element.type}`);
  if (!element.external) return base;
  return element.type === 'person' ? t('c4.type.externalPerson') : t('c4.type.external', { type: base });
}

function drillFor(element) {
  return drillTarget(views, view, element.id);
}

// ---------------------------------------------------------------------------
// Layout, routing and labels (retried with more spacing when a label has no
// free spot; the geometry gates below report whatever remains)
// ---------------------------------------------------------------------------
const { cells, boundaryRows, sideIds } = assignRows(view, resolved, view.layout?.max_per_row || 4);
const routeHints = view.routes || [];

function relationsFor() {
  return resolved.relationships.map((relationship) => {
    const hint = routeHints.find((route) => route.from === relationship.from && route.to === relationship.to) || {};
    const { from: _from, to: _to, ...geometry } = hint;
    return {
      ...geometry,
      id: relationship.id,
      from: relationship.from,
      to: relationship.to,
      label: relationship.description,
      description: relationship.description,
      technology: relationship.technology,
      variant: relationship.async ? 'dashed' : 'default',
      count: relationship.count,
    };
  });
}

function compose(gapBoost) {
  const scene = buildScene({ view, resolved, cells, boundaryRows, sideIds, t, typeName, viewIndex, gapBoost });
  const relations = relationsFor();
  const router = createRouter(scene.boxes, relations);
  const labeler = createLabeler({ boxes: scene.boxes, boundary: scene.boundary, relations, router, fonts: scene.fonts });
  const { labels, failures } = labeler.placeAll();
  return { scene, relations, router, labels, failures, titleRect: labeler.titleRect };
}

let layout = compose(0);
for (let attempt = 1; attempt <= MAX_SPACING_RETRIES && layout.failures.length && !view.layout?.gap_x && !view.layout?.gap_y; attempt += 1) {
  layout = compose(attempt * SPACING_STEP);
}
const { scene, relations, router, labels, failures, titleRect } = layout;
if (scene.problems.length) throwDiagnosticProblems('C4 layout validation failed', scene.problems, { subject });

// ---------------------------------------------------------------------------
// Composition gates (same contracts as Archify's architecture renderer)
// ---------------------------------------------------------------------------
function compositionProblems() {
  const pathFor = (relation) => router.pathFor(relation);
  const endpointIds = new Set(scene.boxes.keys());
  const frames = scene.boundary ? [{ ...scene.boundary, kind: 'boundary', radius: 12 }] : [];
  const routeHint = `set fromSide/toSide, route or via for this pair in views[${viewIndex}].routes, or move an element with placement`;
  const profile = meta.quality_profile;
  const common = { relations, endpointIds, pathFor, diagramType: 'c4', relationCollection: 'relationships', profile, routeHint };
  const problems = [
    ...cleanEndpointSideProblems({ ...common, fromSideFor: (relation) => router.endpointSide(relation, 'source'), toSideFor: (relation) => router.endpointSide(relation, 'target') }),
    ...cleanFlowProblems({ ...common, obstacles: scene.boxes.values(), obstacleKind: 'element' }),
    ...cleanCrossingProblems(common),
    ...cleanAmbiguousCorridorProblems(common),
    ...cleanBorderRunProblems({ ...common, frames }),
    ...cleanRouteRhythmProblems(common),
  ];
  for (const failure of failures) {
    const where = failure.fits ? 'has no free spot clear of elements, other labels and routes' : `does not fit its ${Math.round(segmentLength(failure.segment))}px segment`;
    problems.push(`The label "${failure.relation.description}" (${failure.relation.from} → ${failure.relation.to}) ${where}; set labelAt or labelDx/labelDy for this pair in views[${viewIndex}].routes, raise layout.gap_x/gap_y, or move an element with placement.`);
  }
  const labelRects = relations.map((relation, relationIndex) => ({ relation, relationIndex, label: relation.label, ...labels.get(relation) }));
  for (const rect of labelRects) {
    for (const box of scene.boxes.values()) {
      if (rectsOverlap(rect, box, -2) && !failures.some((failure) => failure.relation === rect.relation)) {
        problems.push(`The label "${rect.label}" (${rect.relation.from} → ${rect.relation.to}) overlaps "${box.id}"; adjust labelAt/labelDx/labelDy for this pair in views[${viewIndex}].routes.`);
      }
    }
  }
  problems.push(...cleanLabelRouteClearanceProblems({ ...common, labels: labelRects }));
  return problems;
}

const composition = compositionProblems();
if (composition.length) throwDiagnosticProblems('C4 composition validation failed', composition, { subject: { ...subject, view: view.key } });

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const svgMeta = { ...meta, title: viewTitle(view), subtitle: view.description || meta.subtitle };
const { renderSvg } = createSvgRenderer({ meta, locale, t, index, view, scene, relations, router, labels, titleRect, typeName, viewTitle, drillFor });

function cards() {
  const list = [...(diagram.cards || [])];
  const glossary = Object.entries(meta.glossary || {});
  if (glossary.length) {
    list.push({ dot: 'slate', title: t('c4.glossary.title'), items: glossary.map(([term, meaning]) => t('c4.glossary.item', { term, meaning })) });
  }
  return list;
}

writeDiagram({
  outPath,
  template,
  diagramType: 'c4',
  meta: { ...meta, title: viewTitle(view), subtitle: view.description || meta.subtitle || meta.title },
  svg: renderSvg(svgMeta, advisories.render()),
  cards: cards(),
  viewNav: renderViewNav({ views, view, index, model, t, viewTitle }),
  guidedViews: view.chapters || [],
});
