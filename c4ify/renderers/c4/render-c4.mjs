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
import { drillTarget, indexModel, resolveView } from './resolve.mjs';
import { glossaryUsed, hardRuleProblems, modelAdvisories, relationshipAdvisories, viewAdvisories } from './rules.mjs';
import { composeView, fitTarget } from './compose.mjs';
import { createSvgRenderer, renderViewNav } from './svg.mjs';

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
// Layout search, composition gates and first-screen fit (compose.mjs)
// ---------------------------------------------------------------------------
const isShowcase = (process.env.ARCHIFY_QUALITY_PROFILE || meta.quality_profile) === 'showcase';
const draft = process.env.C4IFY_DRAFT === '1';

// Text this view draws, to show only the glossary terms it actually uses.
const drawnText = [
  ...resolved.elements.flatMap((element) => [element.name, element.description, element.technology]),
  ...resolved.relationships.flatMap((relationship) => [relationship.description, relationship.technology]),
  resolved.boundary?.name,
].filter(Boolean).join('\n');
const glossaryEntries = glossaryUsed(meta.glossary, drawnText);

const composed = composeView({
  view,
  viewIndex,
  resolved,
  t,
  typeName,
  glossaryEntries,
  profile: meta.quality_profile,
  target: fitTarget(views.length, (diagram.cards || []).length),
});
const { layout } = composed;
const problems = [...composed.problems];
if (!composed.fits && isShowcase) {
  const { viewW, viewH } = layout.scene;
  problems.push(`[viewport/fit] View "${view.key}" is ${Math.round(viewW)}×${Math.round(viewH)} (${composed.ratio.toFixed(2)}:1) and needs scrolling at 1440×900 (about 1.7:1 or wider fits); split it into views, hide shared relationships with exclude_relationships, exclude elements, or set layout.direction.`);
}
if (problems.length && !draft) {
  throwDiagnosticProblems('C4 layout validation failed', problems, { subject: { ...subject, view: view.key } });
}
if (draft) {
  // The CLI's draft command reads this line; the artifact shows the problems.
  process.stderr.write(`C4IFY_DRAFT_PROBLEMS ${JSON.stringify({ view: view.key, candidate: layout.candidate, ratio: Number(composed.ratio.toFixed(2)), problems })}\n`);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const svgMeta = { ...meta, title: viewTitle(view), subtitle: view.description || meta.subtitle };
const { renderSvg, renderDraftPanel } = createSvgRenderer({
  meta, locale, t, index, view, scene: layout.scene, relations: layout.relations, router: layout.router,
  labels: layout.labels, titleRect: layout.titleRect, typeName, viewTitle, drillFor, problems: draft ? problems : [],
});

writeDiagram({
  outPath,
  template,
  diagramType: 'c4',
  meta: { ...meta, title: viewTitle(view), subtitle: view.description || meta.subtitle || meta.title },
  svg: renderSvg(svgMeta, advisories.render()),
  cards: diagram.cards || [],
  viewNav: `${renderViewNav({ views, view, index, model, t, viewTitle })}${draft ? renderDraftPanel() : ''}`,
  guidedViews: view.chapters || [],
});
