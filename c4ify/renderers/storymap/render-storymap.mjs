import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, loadDiagramWithBrandMarks, svgAccessibleText, svgRootAttrs, writeDiagram } from '../shared/cli.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { translateMessage } from '../shared/i18n.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { createAdvisories, fitAspect, renderLines, round, unitsFor, wrapText } from '../shared/business.mjs';
import { cardGeometry, fitLabel, startsWithVerb } from '../shared/planning-kit.mjs';
import { STORYMAP_KIND_PALETTE } from './palette.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { diagram: map, template, outPath } = await loadDiagramWithBrandMarks({
  rendererDir: __dirname,
  diagramType: 'storymap',
  defaultExample: 'saas-onboarding.storymap.json',
});

const meta = map.meta;
const locale = meta.locale;
const t = (key, values) => translateMessage(locale, key, values);
const advisories = createAdvisories(meta);
const MAX_STORIES_PER_CELL = 6;
const BACKLOG_ID = '__later';

// ---------------------------------------------------------------------------
// Structure (HARD rules R-USM-01..03)
// ---------------------------------------------------------------------------
const personas = map.personas || [];
const activities = map.activities.map((item, index) => ({ ...item, index, type: 'activity' }));
const steps = map.steps.map((item, index) => ({ ...item, index, type: 'step' }));
const stories = (map.stories || []).map((item, index) => ({ ...item, index, type: 'story' }));
const releases = (map.releases || []).map((item, index) => ({ ...item, index, type: 'release' }));

const structural = [];
const seenIds = new Map();
for (const [collection, items] of [['activities', activities], ['steps', steps], ['stories', stories], ['releases', releases]]) {
  items.forEach((item, index) => {
    if (seenIds.has(item.id)) structural.push(`/${collection}/${index}/id duplicates id ${JSON.stringify(item.id)} (already used in ${seenIds.get(item.id)}) — ids are unique across activities, steps, stories and releases.`);
    seenIds.set(item.id, collection);
  });
}
if (structural.length) throwDiagnosticProblems('Story map structure validation failed', structural, { code: 'method/hard-rule', subject: { diagramType: 'storymap' } });

const activityById = new Map(activities.map((item) => [item.id, item]));
const stepById = new Map(steps.map((item) => [item.id, item]));
const releaseById = new Map(releases.map((item) => [item.id, item]));
const personaById = new Map(personas.map((item) => [item.id, item]));

for (const step of steps) {
  if (!activityById.has(step.activity)) advisories.fail('R-USM-01', `Step "${step.id}" references unknown activity "${step.activity}" — every step belongs to exactly one backbone activity.`);
}
for (const story of stories) {
  if (!stepById.has(story.step)) advisories.fail('R-USM-01', `Story "${story.id}" references unknown step "${story.step}" — every story hangs under exactly one user step.`);
}
for (const activity of activities) {
  activity.steps = steps.filter((step) => step.activity === activity.id);
  if (!activity.steps.length) advisories.fail('R-USM-01', `Activity "${activity.id}" has no user step — add the steps a user takes in "${activity.label}".`);
}

function orderProblems(items, label, rule) {
  const seen = new Map();
  for (const item of items) {
    if (!Number.isInteger(item.order)) {
      advisories.fail(rule, `${label} "${item.id}" has no order — the narrative order left to right (or release order top to bottom) is explicit.`);
      continue;
    }
    if (seen.has(item.order)) advisories.fail(rule, `${label} "${item.id}" and "${seen.get(item.order)}" share order ${item.order} — orders are unique within their parent.`);
    seen.set(item.order, item.id);
  }
}
orderProblems(activities, 'Activity', 'R-USM-02');
for (const activity of activities) orderProblems(activity.steps, 'Step', 'R-USM-02');
orderProblems(releases, 'Release', 'R-USM-03');
for (const story of stories) {
  if (story.release && !releaseById.has(story.release)) advisories.fail('R-USM-03', `Story "${story.id}" references unknown release "${story.release}".`);
}
advisories.throwIfHard('Story map method validation failed', 'storymap');

const byOrder = (a, b) => a.order - b.order;
activities.sort(byOrder);
for (const activity of activities) activity.steps.sort(byOrder);
releases.sort(byOrder);
const columns = activities.flatMap((activity) => activity.steps);
columns.forEach((step, column) => { step.column = column; step.activityRef = activityById.get(step.activity); });
for (const story of stories) story.stepRef = stepById.get(story.step);

// Release bands, then a "later" band for unsliced stories (R-USM-12).
const bands = releases.map((release, index) => ({ ...release, position: index + 1, stories: stories.filter((story) => story.release === release.id) }));
const unsliced = stories.filter((story) => !story.release);
if (unsliced.length) bands.push({ id: BACKLOG_ID, label: t('storymap.backlog'), goal: t('storymap.backlog.goal'), backlog: true, stories: unsliced });

// ---------------------------------------------------------------------------
// SOFT rules → advisories (R-USM-04..12)
// ---------------------------------------------------------------------------
const frame = meta.frame || {};
const missingFrame = ['what', 'who', 'why'].filter((key) => !frame[key]);
if (missingFrame.length) {
  advisories.warn('R-USM-04', `meta.frame lacks ${missingFrame.join(', ')} — frame the map: what product, who uses and chooses it, why it matters to the organisation.`, activities[0].id);
}
for (const release of releases) {
  if (!release.goal) advisories.warn('R-USM-05', `Release "${release.label}" has no goal — each slice names the outcome it achieves ("prioritise outcomes, not features").`, release.id);
  if (!release.success_metric) advisories.warn('R-USM-05', `Release "${release.label}" has no success_metric — say which change in user behaviour proves the outcome.`, release.id);
}
if (releases.length) {
  const first = bands[0];
  const covered = new Set(first.stories.map((story) => story.stepRef.activity));
  const missing = activities.filter((activity) => !covered.has(activity.id));
  if (missing.length) {
    advisories.warn('R-USM-06', `The first release "${first.label}" has no story under ${missing.map((activity) => `"${activity.label}"`).join(', ')} — a walking skeleton spans the whole backbone end to end.`, first.id);
  }
}
for (const item of [...activities, ...steps]) {
  if (!startsWithVerb(item.label, locale)) {
    advisories.warn('R-USM-07', `${item.type === 'activity' ? 'Activity' : 'Step'} "${item.label}" does not start with a verb — backbone cards are short verb phrases ("Send CNPJ", "Get paid").`, item.id);
  }
}
const stepCounts = activities.map((activity) => activity.steps.length).sort((a, b) => a - b);
const median = stepCounts[Math.floor((stepCounts.length - 1) / 2)];
for (const activity of activities) {
  if (activities.length >= 3 && activity.steps.length > 3 * median) {
    advisories.warn('R-USM-08', `Activity "${activity.label}" has ${activity.steps.length} steps against a median of ${median} — backbone steps should share one goal level; split it or lift details into stories.`, activity.id);
  }
}
if (!personas.length) advisories.warn('R-USM-09', 'No persona is declared — a story map tells the story of a type of person; add personas[].', activities[0].id);
for (const item of [...activities, ...stories]) {
  if (item.persona && !personaById.has(item.persona)) advisories.warn('R-USM-09', `"${item.id}" references unknown persona "${item.persona}".`, item.id);
}
for (const step of steps) {
  const inStep = stories.filter((story) => story.step === step.id);
  if (inStep.length < 2) continue;
  const priorities = inStep.map((story) => story.priority).filter(Number.isInteger);
  if (priorities.length !== inStep.length) {
    advisories.warn('R-USM-10', `Step "${step.label}" mixes stories with and without priority — vertical position is priority, so rank every story (1..${inStep.length}).`, step.id);
    continue;
  }
  const sorted = [...priorities].sort((a, b) => a - b);
  if (sorted.some((value, index) => value !== index + 1)) {
    advisories.warn('R-USM-10', `Step "${step.label}" priorities are ${sorted.join(', ')} — use unique, dense ranks 1..${inStep.length}.`, step.id);
    continue;
  }
  const bandIndex = (story) => bands.findIndex((band) => band.stories.includes(story));
  const inverted = inStep.find((story) => inStep.some((other) => bandIndex(other) > bandIndex(story) && other.priority < story.priority));
  if (inverted) advisories.warn('R-USM-10', `Step "${step.label}": story "${inverted.label}" ranks below a story of a later release — a higher story is more essential, so earlier slices take the top ranks.`, step.id);
}
for (const item of [...activities, ...steps]) {
  if (item.priority !== undefined) advisories.warn('R-USM-11', `Backbone ${item.type} "${item.label}" carries a priority — the backbone is all essential; prioritise stories below it instead.`, item.id);
}
for (const story of unsliced) {
  advisories.warn('R-USM-12', `Story "${story.label}" is not in any release — it is shown in the "later" band below the last slice.`, story.id);
}

// ---------------------------------------------------------------------------
// Layout: backbone rows, then one horizontal band per release slice
// ---------------------------------------------------------------------------
const margin = 40;
const colGap = 26;
const outcomeW = 200;
const outcomeGap = 26;
const cardGap = 8;
const bandPad = 12;
const bandGap = 10;
const legendBand = 80;
const FONT = { activity: 12, step: 11, story: 10.5, outcome: 11.5 };

function wrapContext(text, width, font, maxLines) {
  const wrapped = wrapText(text, unitsFor(width, font, 16), maxLines);
  return wrapped.overflow ? null : wrapped.lines;
}

const activityPersonas = new Set(activities.map((activity) => activity.persona).filter(Boolean));

function layout(colW) {
  const columnsX = margin + outcomeW + outcomeGap;
  const contentW = columns.length * colW + (columns.length - 1) * colGap;
  const viewW = Math.max(meta.viewBox?.[0] || 0, columnsX + contentW + margin);
  const floor = Math.max(10, round(minimumReadableSourceTextPx(viewW) + 0.2));
  const contextFont = floor;
  const problems = [];
  const fit = (item, width, font) => {
    const fitted = fitLabel(item.label, width, { font, floor, maxLines: 3 });
    if (!fitted) problems.push(`Label "${item.label}" of ${item.type} "${item.id}" does not fit three lines at ${width}px — shorten it or raise meta.column_width.`);
    return fitted || { font, lines: [item.label] };
  };
  const colX = (column) => columnsX + column * (colW + colGap);

  // Activities row: each card spans the columns of its steps.
  let y = 24;
  for (const activity of activities) {
    activity.x = colX(activity.steps[0].column);
    activity.width = colX(activity.steps.at(-1).column) + colW - activity.x;
    Object.assign(activity, fit(activity, activity.width, FONT.activity));
    // Name the persona on the card only when the story changes hands.
    const persona = activity.persona && personaById.get(activity.persona);
    activity.extras = persona && activityPersonas.size > 1 ? [t('storymap.persona', { name: persona.name })] : [];
  }
  const activityH = Math.max(...activities.map((activity) => cardGeometry({ y: 0, lines: activity.lines, font: activity.font, extraLines: activity.extras.length, extraFont: contextFont, minHeight: 46 }).height));
  for (const activity of activities) Object.assign(activity, { y, height: activityH });
  y += activityH + 14;

  // Steps row: equal heights so the narrative arrows run straight.
  for (const step of columns) {
    step.x = colX(step.column);
    step.width = colW;
    Object.assign(step, fit(step, colW, FONT.step));
  }
  const stepH = Math.max(...columns.map((step) => cardGeometry({ y: 0, lines: step.lines, font: step.font, minHeight: 44 }).height));
  for (const step of columns) Object.assign(step, { y, height: stepH });
  y += stepH + 22;

  // Release bands.
  for (const band of bands) {
    band.outcome = { x: margin + 12, width: outcomeW - 12 };
    const titleFit = fitLabel(band.label, band.outcome.width, { font: FONT.outcome, floor, maxLines: 2 });
    if (!titleFit) problems.push(`Release label "${band.label}" does not fit two lines of the outcome card — shorten it.`);
    band.font = titleFit?.font || FONT.outcome;
    band.lines = titleFit?.lines || [band.label];
    band.tag = band.backlog ? t('storymap.backlog.tag') : t('storymap.release.tag', { order: band.position });
    const goalLines = band.goal ? wrapContext(band.goal, band.outcome.width, contextFont, 3) : [];
    const metricLines = band.success_metric ? wrapContext(t('storymap.metric', { text: band.success_metric }), band.outcome.width, contextFont, 2) : [];
    if (!goalLines || !metricLines) problems.push(`The goal or metric of release "${band.label}" does not fit its outcome card — shorten it to about ${unitsFor(band.outcome.width, contextFont, 16) * 3} characters.`);
    band.extras = [...(goalLines || []).map((text) => ({ text, cls: 't-muted' })), ...(metricLines || []).map((text) => ({ text, cls: 't-database' }))];
    const outcomeH = cardGeometry({ y: 0, lines: band.lines, font: band.font, tagRow: true, extraLines: band.extras.length, extraFont: contextFont, minHeight: 52 }).height;

    let tallest = 0;
    for (const step of columns) {
      const cell = band.stories.filter((story) => story.step === step.id)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || a.index - b.index);
      if (cell.length > MAX_STORIES_PER_CELL) problems.push(`Step "${step.label}" holds ${cell.length} stories in "${band.label}" (max ${MAX_STORIES_PER_CELL}) — slice some into a later release or split the step.`);
      let cursor = 0;
      for (const story of cell) {
        story.x = step.x;
        story.width = colW;
        Object.assign(story, fit(story, colW, FONT.story));
        const persona = story.persona && personaById.get(story.persona);
        const tagParts = [story.risky ? t('storymap.risky') : '', story.kind ? t(`storymap.kind.${story.kind}`) : '', persona ? persona.name : ''].filter(Boolean);
        story.tag = tagParts.join(' · ');
        if (story.tag && wrapText(story.tag, unitsFor(colW, contextFont, 14), 1).overflow) problems.push(`Tag "${story.tag}" of story "${story.id}" does not fit ${colW}px — shorten the persona name or raise meta.column_width.`);
        story.height = cardGeometry({ y: 0, lines: story.lines, font: story.font, tagRow: Boolean(story.tag), extraFont: contextFont, minHeight: 40 }).height;
        story.offset = cursor;
        cursor += story.height + cardGap;
      }
      tallest = Math.max(tallest, cursor - cardGap);
    }
    band.y = y;
    band.height = Math.ceil(Math.max(tallest, outcomeH) + bandPad * 2);
    band.outcome.y = y + bandPad;
    band.outcome.height = band.height - bandPad * 2;
    for (const story of band.stories) story.y = round(y + bandPad + story.offset);
    y += band.height + bandGap;
  }
  const bottom = y - bandGap;
  return { viewW, floor, contextFont, bottom, problems, colW, columnsX };
}

let colW = meta.column_width || 128;
let geometry;
for (;;) {
  geometry = layout(colW);
  const canWiden = !meta.column_width && colW + 8 <= 200;
  const aspect = geometry.viewW / (geometry.bottom + 20 + legendBand);
  if (geometry.problems.length ? !canWiden : (!canWiden || aspect >= 1.95)) break;
  colW += 8;
}
if (geometry.problems.length) throwDiagnosticProblems('Story map layout validation failed', geometry.problems, { subject: { diagramType: 'storymap' } });
const { contextFont } = geometry;
let { viewW } = geometry;
const viewH = Math.max(meta.viewBox?.[1] || 0, round(geometry.bottom + 20 + legendBand));

for (const item of [...activities, ...columns, ...stories]) item.cx = round(item.x + item.width / 2);

// Narrative flow: step → step, straight, left to right (emitted as real
// relationships so trace and route features follow the user's story).
const edges = [];
for (let column = 0; column < columns.length - 1; column += 1) {
  const from = columns[column];
  const to = columns[column + 1];
  const yMid = round(from.y + from.height / 2);
  const points = [[round(from.x + from.width), yMid], [round(to.x), yMid]];
  edges.push({ from, to, points, d: `M ${points[0].join(' ')} L ${points[1].join(' ')}` });
}
const outcomes = bands.map((band) => band.outcome);
({ viewW } = fitAspect({ items: [...activities, ...columns, ...stories, ...outcomes], edges, viewW, viewH, minFont: Math.min(contextFont, ...[...activities, ...columns, ...stories].map((item) => item.font)) }));
// Bands wrap the outcome card and every step column, wherever fitAspect
// centered them.
const bandLeft = round(outcomes[0]?.x - 12);
const bandRight = round(columns.at(-1).x + columns.at(-1).width + 12);
for (const band of bands) Object.assign(band, { x: bandLeft, width: bandRight - bandLeft });

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const kindOf = (item) => (item.type === 'activity' ? 'story-activity' : item.type === 'step' ? 'user-step' : item.risky ? 'story-risky' : 'story');
const bandOf = (story) => bands.find((band) => band.stories.includes(story));

function passportFor(item) {
  if (item.type === 'activity') {
    const persona = item.persona && personaById.get(item.persona);
    return { kind: 'story-activity', sublabel: item.note || (persona?.sketch ? `${persona.name}: ${persona.sketch}` : undefined), context: t('storymap.context.activity', { order: item.order, steps: item.steps.length }) };
  }
  if (item.type === 'step') {
    return { kind: 'user-step', sublabel: item.note, context: t('storymap.context.step', { activity: item.activityRef.label, order: item.order }) };
  }
  return {
    kind: kindOf(item),
    sublabel: item.note,
    tag: Number.isInteger(item.priority) ? t('storymap.priority', { value: item.priority }) : undefined,
    context: t('storymap.context.story', { step: item.stepRef.label, release: bandOf(item).label }),
  };
}

function renderCard(item, step) {
  const kind = kindOf(item);
  const slot = STORYMAP_KIND_PALETTE[kind];
  const passport = passportFor(item);
  const tag = item.type === 'story' ? item.tag : '';
  const extras = item.extras || [];
  const geometry = cardGeometry({ y: item.y, lines: item.lines, font: item.font, tagRow: Boolean(tag), extraLines: extras.length, extraFont: contextFont, minHeight: item.height });
  const tagText = tag ? `\n          <text data-detail="context" x="${item.cx}" y="${geometry.tagY}" class="t-${slot}" font-size="${contextFont}" font-weight="700" text-anchor="middle">${esc(tag)}</text>` : '';
  const extraText = extras.map((text, index) => `\n          <text data-detail="context" x="${item.cx}" y="${geometry.extraYs[index]}" class="t-muted" font-size="${contextFont}" text-anchor="middle">${esc(text)}</text>`).join('');
  const label = renderLines(item.lines, { x: item.cx, y: geometry.labelCenter, fontSize: item.font, weight: item.type === 'story' ? 600 : 700, attrs: 'data-node-label=""' });
  const dashed = item.risky ? ' stroke-dasharray="5,3"' : '';
  const strokeWidth = item.type === 'activity' ? 1.9 : item.type === 'step' ? 1.6 : 1.2;
  return `        <g ${focusNodeAttrs(item.id, item.label, passport, locale)}>
          ${focusNodeTitle(item.label, passport)}
          <rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="6" class="c-mask"/>
          <rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="6" class="c-${slot}"${dashed}${animateAttr(meta, 'node', step)} stroke-width="${strokeWidth}"/>${tagText}
          ${label}${extraText}
        </g>`;
}

function renderOutcome(band, step) {
  const outcome = band.outcome;
  const cx = round(outcome.x + outcome.width / 2);
  const geometry = cardGeometry({ y: outcome.y, lines: band.lines, font: band.font, tagRow: true, extraLines: band.extras.length, extraFont: contextFont, minHeight: outcome.height });
  const body = `<rect x="${outcome.x}" y="${outcome.y}" width="${outcome.width}" height="${outcome.height}" rx="8" class="c-mask"/>
          <rect x="${outcome.x}" y="${outcome.y}" width="${outcome.width}" height="${outcome.height}" rx="8" class="c-database"${band.backlog ? ' stroke-dasharray="5,4"' : ''}${animateAttr(meta, 'node', step)} stroke-width="1.6"/>
          <text data-detail="context" x="${cx}" y="${geometry.tagY}" class="t-database" font-size="${contextFont}" font-weight="700" text-anchor="middle" letter-spacing="1">${esc(band.tag)}</text>
          ${renderLines(band.lines, { x: cx, y: geometry.labelCenter, fontSize: band.font, weight: 700, attrs: 'data-node-label=""' })}${band.extras.map((extra, index) => `\n          <text data-detail="context" x="${cx}" y="${geometry.extraYs[index]}" class="${extra.cls}" font-size="${contextFont}" text-anchor="middle">${esc(extra.text)}</text>`).join('')}`;
  if (band.backlog) return `        <g aria-hidden="true">\n          ${body}\n        </g>`;
  const covered = new Set(band.stories.map((story) => story.stepRef.activity)).size;
  const passport = {
    kind: 'release-outcome',
    sublabel: [band.goal, band.success_metric ? t('storymap.metric', { text: band.success_metric }) : ''].filter(Boolean).join(' — ') || undefined,
    tag: t('storymap.summary.release', { label: band.label, count: band.stories.length, covered, total: activities.length }),
    context: t('storymap.context.release', { order: band.position, stories: band.stories.length }),
  };
  return `        <g ${focusNodeAttrs(band.id, band.label, passport, locale)}>
          ${focusNodeTitle(band.label, passport)}
          ${body}
        </g>`;
}

function renderBands() {
  return bands.map((band) => `        <rect data-graph-role="structural-frame" data-composition-frame-kind="release-slice" data-composition-frame-id="slice-${esc(band.id)}" x="${band.x}" y="${band.y}" width="${round(band.width)}" height="${band.height}" rx="10" class="c-lane"/>`).join('\n');
}

function renderEdge(edge, index) {
  return `        <path ${focusEdgeAttrs(edge.from.id, edge.to.id, undefined, index)} data-composition-points="${edge.points.map((point) => point.join(',')).join(' ')}" d="${edge.d}" class="a-default"${animateAttr(meta, 'edge', index)} stroke-width="1.5" fill="none" marker-end="url(#arrowhead)"/>`;
}

const LEGEND_CATALOG = [
  { kind: 'story-activity' },
  { kind: 'user-step' },
  { kind: 'story' },
  { kind: 'story-risky' },
  { kind: 'release-outcome' },
  { kind: 'narrative', interactive: false },
].map((entry) => ({ ...entry, label: t(`legend.storymap.${entry.kind}`) }));

function renderLegend() {
  const present = new Set([...activities, ...columns, ...stories].map(kindOf));
  if (releases.length) present.add('release-outcome');
  if (edges.length) present.add('narrative');
  return renderResolvedLegend({
    entries: resolveLegend(meta.legend, LEGEND_CATALOG, present),
    locale,
    layout: { x: 40, baselineY: viewH - 30, width: viewW - 80, minTitleY: viewH - 64, unfit: meta.legend === undefined ? 'hide' : 'error', diagramType: 'storymap' },
    renderSwatch: (entry) => {
      if (entry.kind === 'narrative') return `<line x1="${entry.x}" y1="${entry.baseline - 4}" x2="${entry.x + 16}" y2="${entry.baseline - 4}" class="a-default" stroke-width="1.5"/>`;
      const dashed = entry.kind === 'story-risky' ? ' stroke-dasharray="3,2"' : '';
      return `<rect x="${entry.x}" y="${entry.baseline - 9}" width="14" height="10" rx="2" class="c-${STORYMAP_KIND_PALETTE[entry.kind]}"${dashed} stroke-width="1"/>`;
    },
  });
}

function summaryCards() {
  const cards = [];
  if (meta.summary !== false) {
    const items = bands.filter((band) => !band.backlog).map((band) => t('storymap.summary.release', {
      label: band.label,
      count: band.stories.length,
      covered: new Set(band.stories.map((story) => story.stepRef.activity)).size,
      total: activities.length,
    }));
    if (unsliced.length) items.push(t('storymap.summary.backlog', { count: unsliced.length }));
    items.push(t('storymap.summary.backbone', { activities: activities.length, steps: columns.length }));
    cards.push({ dot: 'violet', title: t('storymap.summary.title'), items });
    const frameItems = [
      frame.what ? t('storymap.frame.what', { text: frame.what }) : '',
      frame.who ? t('storymap.frame.who', { text: frame.who }) : '',
      frame.why ? t('storymap.frame.why', { text: frame.why }) : '',
    ].filter(Boolean);
    if (frameItems.length) cards.push({ dot: 'cyan', title: t('storymap.frame.title'), items: frameItems });
  }
  return [...(map.cards || []), ...cards];
}

function renderSvg() {
  let step = 0;
  const backbone = [...activities.map((item) => renderCard(item, 0)), ...columns.map((item) => renderCard(item, 1))];
  const slices = bands.map((band, index) => {
    step = index + 2;
    return [renderOutcome(band, step), ...band.stories.map((story) => renderCard(story, step))].join('\n\n');
  });
  return `      <svg viewBox="0 0 ${round(viewW)} ${round(viewH)}" ${svgRootAttrs(meta)}>
${svgAccessibleText(meta, 'storymap')}
${renderDefinitions()}
${advisories.render()}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Release slices -->
${renderBands()}

        <!-- Narrative flow (backbone steps, left to right) -->
${edges.map(renderEdge).join('\n')}

        <!-- Backbone: activities and user steps -->
${backbone.join('\n\n')}

        <!-- Stories by release slice -->
${slices.join('\n\n')}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
}

writeDiagram({ outPath, template, diagramType: 'storymap', meta, svg: renderSvg(), cards: summaryCards() });
