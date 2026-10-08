// SVG and page fragments for one C4 view. Speaks the viewer's semantic
// contract (renderers/README.md): focusable nodes with passports, edges with
// composition points, structural frames, a legend after <!-- Legend -->.

import { esc, renderDefinitions } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, svgAccessibleText, svgRootAttrs } from '../shared/cli.mjs';
import { relationshipLegendObstacles, resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { brandMetadataFor, renderBrandMark } from '../shared/brand-marks.mjs';
import { renderLines, round } from '../shared/method.mjs';
import { arrowClassMap, routePointsValue } from '../shared/geometry.mjs';
import { MARGIN } from './scene.mjs';
import { C4_KIND_PALETTE } from './palette.mjs';

const LEGEND_KINDS = ['person', 'software-system', 'container', 'component', 'external-person', 'external-system', 'external-container', 'external-component'];

export function createSvgRenderer(ctx) {
  const { meta, locale, t, index, view, scene, relations, router, labels, titleRect, typeName, viewTitle, drillFor } = ctx;
  const { boxes, boundary, fonts } = scene;
  const fileFor = (candidate) => `${candidate.key}.html`;
  const steps = new Map([...boxes.keys()].map((id, position) => [id, Math.min(position, 6)]));

  function passportFor(box) {
    const { element } = box;
    const parent = element.parent ? index.elements.get(element.parent) : null;
    const contextParts = [typeName(element)];
    if (parent) contextParts.push(t('c4.context.inside', { name: parent.name }));
    const drill = drillFor(element);
    if (drill) contextParts.push(t('c4.drill.hint', { title: viewTitle(drill) }));
    return { kind: box.kind, sublabel: element.description, tag: element.technology, context: contextParts.join(' · '), ...brandMetadataFor(element) };
  }

  function shapeFor(box, slot) {
    const { x, y, width, height } = box;
    const cls = `c-${slot}`;
    const anim = animateAttr(meta, 'node', steps.get(box.id));
    if (box.cap) {
      // Cylinder: the top ellipse stays inside the box, so routing and the
      // geometry gates see one rectangle.
      const ry = 7;
      const body = `M ${x} ${round(y + ry)} L ${x} ${round(y + height - ry)} A ${round(width / 2)} ${ry} 0 0 0 ${round(x + width)} ${round(y + height - ry)} L ${round(x + width)} ${round(y + ry)} A ${round(width / 2)} ${ry} 0 0 0 ${x} ${round(y + ry)} Z`;
      return `<path d="${body}" class="c-mask"/>
          <path d="${body}" class="${cls}"${anim} stroke-width="1.6"/>
          <ellipse cx="${round(x + width / 2)}" cy="${round(y + ry)}" rx="${round(width / 2)}" ry="${ry}" class="${cls}" stroke-width="1.6"/>`;
    }
    const rx = box.element.type === 'person' ? 22 : 9;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" class="c-mask"/>
          <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" class="${cls}"${anim} stroke-width="1.6"/>`;
  }

  function personGlyph(box, slot) {
    const top = box.y + 9;
    return `<g aria-hidden="true" class="t-${slot}"><circle cx="${box.cx}" cy="${round(top + 4)}" r="4" fill="currentColor"/><path d="M ${round(box.cx - 7)} ${round(top + 16)} Q ${box.cx} ${round(top + 6)} ${round(box.cx + 7)} ${round(top + 16)} Z" fill="currentColor"/></g>`;
  }

  function drillBadge(box, slot) {
    const cx = round(box.x + box.width - 13);
    const cy = round(box.y + box.height - 13);
    return `<g aria-hidden="true" class="t-${slot}"><circle cx="${cx}" cy="${cy}" r="7" class="c4-drill-badge" stroke-width="1.2"/><path d="M ${round(cx - 3.5)} ${cy} H ${round(cx + 3.5)} M ${cx} ${round(cy - 3.5)} V ${round(cy + 3.5)}" stroke="currentColor" stroke-width="1.4" fill="none"/></g>`;
  }

  function textBlock(box) {
    const nameH = box.nameLines.length * fonts.name * 1.22;
    const typeH = box.typeLines.length * fonts.detail * 1.25;
    const descH = box.descriptionLines.length ? 7 + box.descriptionLines.length * fonts.detail * 1.3 : 0;
    const top = box.y + box.glyph + box.cap + (box.height - box.glyph - box.cap - (nameH + 5 + typeH + descH)) / 2;
    const nameCenter = top + fonts.name * 0.85 + ((box.nameLines.length - 1) * fonts.name * 1.22) / 2;
    const typeTop = top + nameH + 5 + fonts.detail * 0.85;
    const descTop = typeTop + (box.typeLines.length - 1) * fonts.detail * 1.25 + 7 + fonts.detail * 1.3;
    const name = renderLines(box.nameLines, { x: box.cx, y: nameCenter, fontSize: fonts.name, lineHeight: fonts.name * 1.22, weight: 700, attrs: 'data-node-label=""' });
    const type = renderLines(box.typeLines, { x: box.cx, y: typeTop + ((box.typeLines.length - 1) * fonts.detail * 1.25) / 2, fontSize: fonts.detail, className: 't-muted', attrs: 'data-detail="context"' });
    const description = box.descriptionLines.length
      ? `\n          ${renderLines(box.descriptionLines, { x: box.cx, y: descTop + ((box.descriptionLines.length - 1) * fonts.detail * 1.3) / 2, fontSize: fonts.detail, lineHeight: fonts.detail * 1.3, className: 't-muted', attrs: 'data-detail="context"' })}`
      : '';
    return `${name}\n          ${type}${description}`;
  }

  function renderElement(box) {
    const { element } = box;
    const slot = C4_KIND_PALETTE[box.kind];
    const passport = passportFor(box);
    const drill = drillFor(element);
    const brand = renderBrandMark(element, { x: round(box.x + box.width - 24), y: round(box.y + box.cap + 6) });
    const glyph = element.type === 'person' ? `\n          ${personGlyph(box, slot)}` : '';
    const badge = drill ? `\n          ${drillBadge(box, slot)}` : '';
    const drillAttr = drill ? ` data-c4-drill="${esc(fileFor(drill))}"` : '';
    return `        <g ${focusNodeAttrs(element.id, element.name, passport, locale)}${drillAttr}>
          ${focusNodeTitle(element.name, passport)}
          ${shapeFor(box, slot)}${glyph}${brand ? `\n          ${brand}` : ''}
          ${textBlock(box)}${badge}
        </g>`;
  }

  function renderRelationPath(relation, position) {
    const [cls, marker] = arrowClassMap[relation.variant] || arrowClassMap.default;
    const routed = router.pathFor(relation);
    const label = relation.count > 1 ? `${relation.description} (${t('c4.edge.merged', { count: relation.count })})` : relation.description;
    return `        <path ${focusEdgeAttrs(relation.from, relation.to, label, position, relation.id)} data-composition-points="${routePointsValue(routed.points)}" d="${routed.d}" class="${cls}"${animateAttr(meta, 'edge', position)} stroke-width="1.5" marker-end="url(#${marker})"/>`;
  }

  function renderRelationLabel(relation, position) {
    const rect = labels.get(relation);
    const lines = rect.lines.map((line, lineIndex) => {
      const isTech = relation.technology && lineIndex === rect.lines.length - 1;
      const y = round(rect.y + 3 + fonts.label * 0.95 + lineIndex * fonts.label * 1.25);
      return `<text x="${rect.cx}" y="${y}" class="${isTech ? 't-dim' : 't-muted'}" font-size="${fonts.label}"${isTech ? '' : ' font-weight="600"'} text-anchor="middle">${esc(line)}</text>`;
    }).join('\n          ');
    return `        <g data-detail="context" ${focusEdgeAttrs(relation.from, relation.to, relation.description, position, relation.id)}>
          <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="3" class="c-mask"/>
          ${lines}
        </g>`;
  }

  function renderBoundary() {
    if (!boundary) return { frame: '', label: '' };
    const attrs = `data-composition-frame-id="${esc(boundary.id)}" data-composition-frame-kind="boundary" data-composition-frame-label="${esc(boundary.label)}"`;
    return {
      frame: `        <rect data-graph-role="structural-frame" ${attrs} x="${boundary.x}" y="${boundary.y}" width="${boundary.width}" height="${boundary.height}" rx="12" class="c-boundary" stroke-width="1.3"/>`,
      label: `        <g data-graph-role="structural-frame-label" ${attrs}>
          <rect data-graph-role="structural-frame-label-mask" x="${round(titleRect.x)}" y="${round(titleRect.y)}" width="${round(titleRect.width)}" height="${titleRect.height}" rx="3" class="c-mask"/>
          <text data-boundary-label="" x="${round(titleRect.x + 6)}" y="${round(titleRect.y + 13)}" class="t-muted" font-size="${titleRect.fontSize}" font-weight="600">${esc(boundary.label)}</text>
        </g>`,
    };
  }

  function legendSwatch(entry) {
    const y = entry.baseline - 9;
    if (entry.kind === 'store') return `<path d="M ${entry.x} ${y + 2} V ${y + 9} A 8 2 0 0 0 ${entry.x + 16} ${y + 9} V ${y + 2} A 8 2 0 0 0 ${entry.x} ${y + 2} Z" class="c-database" stroke-width="1"/>`;
    if (entry.kind === 'boundary') return `<rect x="${entry.x}" y="${y}" width="16" height="10" rx="2" class="c-boundary" stroke-width="1" stroke-dasharray="3,2"/>`;
    if (entry.kind === 'async') return `<path d="M ${entry.x} ${y + 5} H ${entry.x + 16}" class="a-dashed" stroke-width="1.4"/>`;
    if (entry.kind === 'drill') return `<g class="t-muted"><circle cx="${entry.x + 7}" cy="${y + 5}" r="5" class="c4-drill-badge" stroke-width="1"/><path d="M ${entry.x + 4.5} ${y + 5} H ${entry.x + 9.5} M ${entry.x + 7} ${y + 2.5} V ${y + 7.5}" stroke="currentColor" stroke-width="1.1"/></g>`;
    return `<rect x="${entry.x}" y="${y}" width="16" height="10" rx="${entry.kind.endsWith('person') ? 5 : 2.5}" class="c-${C4_KIND_PALETTE[entry.kind]}" stroke-width="1"/>`;
  }

  function renderLegend() {
    const all = [...boxes.values()];
    const present = new Set(all.map((box) => box.kind));
    const extras = [];
    if (all.some((box) => box.cap)) extras.push({ kind: 'store', interactive: false });
    if (boundary) extras.push({ kind: 'boundary', interactive: false });
    if (relations.some((relation) => relation.variant === 'dashed')) extras.push({ kind: 'async', interactive: false });
    if (all.some((box) => drillFor(box.element))) extras.push({ kind: 'drill', interactive: false });
    extras.forEach((entry) => present.add(entry.kind));
    const catalog = [...LEGEND_KINDS.map((kind) => ({ kind })), ...extras].map((entry) => ({ ...entry, swatchWidth: 16, label: t(`legend.c4.${entry.kind}`) }));
    const obstacles = relationshipLegendObstacles(relations, { pointsFor: (relation) => router.pathFor(relation).points, labelRectFor: (relation) => labels.get(relation) });
    const contentBottom = Math.max(...all.map((box) => box.y + box.height), boundary ? boundary.y + boundary.height : 0);
    return renderResolvedLegend({
      entries: resolveLegend(meta.legend, catalog, present),
      locale,
      layout: { x: MARGIN, baselineY: scene.viewH - 26, width: scene.viewW - MARGIN * 2, minTitleY: contentBottom + 8, obstacles, unfit: meta.legend === undefined ? 'hide' : 'error', diagramType: 'c4' },
      renderSwatch: legendSwatch,
    });
  }

  function renderSvg(svgMeta, advisoriesMarkup) {
    const frame = renderBoundary();
    return `      <svg viewBox="0 0 ${round(scene.viewW)} ${round(scene.viewH)}" ${svgRootAttrs(svgMeta)} data-c4-view="${esc(view.key)}" data-c4-view-type="${esc(view.type)}" data-c4-direction="${scene.direction}">
${svgAccessibleText(svgMeta, 'c4')}
${renderDefinitions()}
${advisoriesMarkup}

        <!-- Background Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Boundary -->
${frame.frame}

        <!-- Relationships -->
${relations.map(renderRelationPath).join('\n')}

        <!-- Elements -->
${[...boxes.values()].map(renderElement).join('\n\n')}

        <!-- Relationship labels -->
${relations.map(renderRelationLabel).join('\n')}

        <!-- Boundary label -->
${frame.label}

        <!-- Legend -->
${renderLegend()}
      </svg>`;
  }

  return { renderSvg };
}

export function renderViewNav({ views, view, index, model, t, viewTitle }) {
  if (views.length < 2) return '';
  const items = views.map((candidate) => {
    const short = t(`c4.view.short.${candidate.type}`);
    const scope = candidate.scope ? index.elements.get(candidate.scope).name : model.enterprise || '';
    const text = `${esc(short)}${scope ? ` <small>${esc(scope)}</small>` : ''}`;
    return candidate === view
      ? `<span class="c4-nav-current" aria-current="page" title="${esc(t('c4.nav.current'))}">${text}</span>`
      : `<a href="${esc(`${candidate.key}.html`)}" title="${esc(viewTitle(candidate))}">${text}</a>`;
  }).join('\n      ');
  return `    <nav class="c4-nav no-print" aria-label="${esc(t('c4.nav.label'))}">
      <span class="c4-nav-label">${esc(t('c4.nav.label'))}</span>
      ${items}
    </nav>`;
}
