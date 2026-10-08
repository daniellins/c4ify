// BPMN 2.0.2 notation primitives (OMG formal/13-12-09 §7-§10): event rings,
// trigger markers, task-type markers, activity markers, gateway markers, data
// shapes. Every function returns SVG markup in absolute coordinates. Markers
// sit inside aria-hidden groups so the viewer's focus styling (which targets
// direct shape children of a node group) never restyles the notation.

import { round } from '../shared/business.mjs';

export const EVENT_R = 17;
export const BOUNDARY_R = 13;
export const GATEWAY_R = 24;
export const DATA_OBJECT = { w: 30, h: 38 };
export const DATA_STORE = { w: 44, h: 36 };

// Scoped notation ink: theme variables keep light/dark and every preset in
// sync without adding classes to the shared template.
export function notationStyle() {
  return `        <style>
          svg .bpmn-ink { fill: none; stroke: var(--text-muted); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
          svg .bpmn-ink-fill { fill: var(--text-muted); stroke: var(--text-muted); stroke-width: 1; stroke-linejoin: round; }
          svg .bpmn-paper { fill: var(--mask); stroke: var(--text-muted); stroke-width: 1.1; }
          svg .bpmn-frame { fill: none; stroke: var(--lane-stroke); stroke-dasharray: none; }
          svg .bpmn-band { fill: var(--lane-fill); stroke: var(--lane-stroke); stroke-dasharray: none; }
          svg .bpmn-association { stroke: var(--text-muted); fill: none; stroke-dasharray: 1.5 3.5; stroke-linecap: round; }
        </style>`;
}

// Message-flow markers: open circle at the source, open arrowhead at the target.
export function notationMarkers() {
  return `        <defs>
          <marker id="bpmn-message-start" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="3.6" class="c-mask" style="stroke: var(--database-stroke); stroke-width: 1.2"/>
          </marker>
          <marker id="bpmn-message-end" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="1 1, 11 5, 1 9" class="c-mask" style="stroke: var(--database-stroke); stroke-width: 1.2"/>
          </marker>
        </defs>`;
}

const p = (x, y) => `${round(x)} ${round(y)}`;

// Trigger marker centred on (cx, cy); `filled` = throwing (BPMN: filled marker).
export function triggerGlyph(trigger, cx, cy, { filled = false, scale = 1 } = {}) {
  const s = scale;
  const cls = filled ? 'bpmn-ink-fill' : 'bpmn-ink';
  switch (trigger) {
    case 'message': {
      const w = 15 * s;
      const h = 10.5 * s;
      const x = cx - w / 2;
      const y = cy - h / 2;
      const flap = filled ? 'bpmn-ink' : 'bpmn-ink';
      return `<g aria-hidden="true"><rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="1" class="${cls}"/><path d="M ${p(x, y)} L ${p(cx, cy + 1 * s)} L ${p(x + w, y)}" class="${flap}"${filled ? ' style="stroke: var(--mask)"' : ''}/></g>`;
    }
    case 'timer': {
      const r = 8.5 * s;
      const ticks = [0, 1, 2, 3].map((i) => {
        const a = (Math.PI / 2) * i;
        return `M ${p(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72)} L ${p(cx + Math.cos(a) * r, cy + Math.sin(a) * r)}`;
      }).join(' ');
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" class="bpmn-paper"/><path d="${ticks} M ${p(cx, cy)} L ${p(cx, cy - r * 0.62)} M ${p(cx, cy)} L ${p(cx + r * 0.48, cy + r * 0.2)}" class="bpmn-ink"/></g>`;
    }
    case 'error':
      return `<g aria-hidden="true"><polygon points="${p(cx - 7 * s, cy + 7 * s)} ${p(cx - 3 * s, cy - 7 * s)} ${p(cx + 1.5 * s, cy + 1 * s)} ${p(cx + 7 * s, cy - 7 * s)} ${p(cx + 3 * s, cy + 7 * s)} ${p(cx - 1.5 * s, cy - 1 * s)}" class="${cls}"/></g>`;
    case 'signal':
      return `<g aria-hidden="true"><polygon points="${p(cx, cy - 8 * s)} ${p(cx + 7.5 * s, cy + 5.5 * s)} ${p(cx - 7.5 * s, cy + 5.5 * s)}" class="${cls}"/></g>`;
    case 'escalation':
      return `<g aria-hidden="true"><polygon points="${p(cx, cy - 8 * s)} ${p(cx + 6 * s, cy + 7 * s)} ${p(cx, cy + 2 * s)} ${p(cx - 6 * s, cy + 7 * s)}" class="${cls}"/></g>`;
    case 'conditional': {
      const w = 11 * s;
      const h = 14 * s;
      const x = cx - w / 2;
      const y = cy - h / 2;
      const lines = [0.25, 0.5, 0.75].map((f) => `M ${p(x + 2 * s, y + h * f)} L ${p(x + w - 2 * s, y + h * f)}`).join(' ');
      return `<g aria-hidden="true"><rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" class="bpmn-paper"/><path d="${lines}" class="bpmn-ink"/></g>`;
    }
    case 'link':
      return `<g aria-hidden="true"><polygon points="${p(cx - 7 * s, cy - 3 * s)} ${p(cx + 1 * s, cy - 3 * s)} ${p(cx + 1 * s, cy - 7 * s)} ${p(cx + 8 * s, cy)} ${p(cx + 1 * s, cy + 7 * s)} ${p(cx + 1 * s, cy + 3 * s)} ${p(cx - 7 * s, cy + 3 * s)}" class="${cls}"/></g>`;
    case 'terminate':
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(cy)}" r="${round(9.5 * s)}" class="bpmn-ink-fill"/></g>`;
    default:
      return '';
  }
}

// Event ring(s). start: single thin; intermediate/boundary: double thin
// (dashed when non-interrupting); end: single thick.
export function eventRings(node, cx, cy, slot, animate) {
  const r = node.isBoundary ? BOUNDARY_R : EVENT_R;
  const dashed = node.interrupting === false ? ' stroke-dasharray="3,2.4"' : '';
  const mask = `<circle cx="${round(cx)}" cy="${round(cy)}" r="${r}" class="c-mask"/>`;
  if (node.event === 'start') {
    return `${mask}\n          <circle cx="${round(cx)}" cy="${round(cy)}" r="${r}" class="c-${slot}"${dashed}${animate} stroke-width="1.5"/>`;
  }
  if (node.event === 'end') {
    return `${mask}\n          <circle cx="${round(cx)}" cy="${round(cy)}" r="${r - 1}" class="c-${slot}"${animate} stroke-width="3.4"/>`;
  }
  return `${mask}\n          <circle cx="${round(cx)}" cy="${round(cy)}" r="${r}" class="c-${slot}"${dashed}${animate} stroke-width="1.3"/>
          <circle cx="${round(cx)}" cy="${round(cy)}" r="${r - 3}" fill="none" class="c-${slot}"${dashed} stroke-width="1.1"/>`;
}

// Task-type marker in the top-left slot (x, y = slot origin, 14px box).
export function taskGlyph(type, x, y) {
  const cx = x + 7;
  const cy = y + 7;
  switch (type) {
    case 'user':
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(y + 4.2)}" r="3.4" class="bpmn-ink"/><path d="M ${p(x + 0.8, y + 14)} C ${p(x + 1.2, y + 8.6)} ${p(x + 12.8, y + 8.6)} ${p(x + 13.2, y + 14)} Z" class="bpmn-ink"/></g>`;
    case 'service': {
      const teeth = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (Math.PI / 4) * i;
        return `M ${p(cx + Math.cos(a) * 4.6, cy + Math.sin(a) * 4.6)} L ${p(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7)}`;
      }).join(' ');
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(cy)}" r="4.8" class="bpmn-ink"/><circle cx="${round(cx)}" cy="${round(cy)}" r="1.8" class="bpmn-ink"/><path d="${teeth}" class="bpmn-ink" stroke-width="2"/></g>`;
    }
    case 'send':
      return triggerGlyph('message', cx, cy, { filled: true, scale: 0.9 });
    case 'receive':
      return triggerGlyph('message', cx, cy, { filled: false, scale: 0.9 });
    case 'manual':
      return `<g aria-hidden="true"><path d="M ${p(x + 1, y + 7)} L ${p(x + 9, y + 3)} L ${p(x + 13, y + 3)} M ${p(x + 6, y + 6)} L ${p(x + 13, y + 6)} M ${p(x + 6, y + 9)} L ${p(x + 12.5, y + 9)} M ${p(x + 6, y + 12)} L ${p(x + 11, y + 12)} M ${p(x + 1, y + 7)} L ${p(x + 1, y + 12)} L ${p(x + 6, y + 13)}" class="bpmn-ink"/></g>`;
    case 'script':
      return `<g aria-hidden="true"><path d="M ${p(x + 3, y + 1)} L ${p(x + 13, y + 1)} C ${p(x + 9, y + 4.5)} ${p(x + 14, y + 9.5)} ${p(x + 11, y + 13)} L ${p(x + 1, y + 13)} C ${p(x + 4, y + 9.5)} ${p(x - 1, y + 4.5)} ${p(x + 3, y + 1)} Z M ${p(x + 4.5, y + 4.5)} L ${p(x + 10, y + 4.5)} M ${p(x + 4.5, y + 7)} L ${p(x + 10, y + 7)} M ${p(x + 4.5, y + 9.5)} L ${p(x + 10, y + 9.5)}" class="bpmn-ink"/></g>`;
    case 'business-rule':
      return `<g aria-hidden="true"><rect x="${round(x)}" y="${round(y + 2)}" width="14" height="11" class="bpmn-ink"/><path d="M ${p(x, y + 5.5)} L ${p(x + 14, y + 5.5)} M ${p(x, y + 9)} L ${p(x + 14, y + 9)} M ${p(x + 4.5, y + 5.5)} L ${p(x + 4.5, y + 13)}" class="bpmn-ink"/></g>`;
    default:
      return '';
  }
}

// Bottom-centre activity markers: collapsed [+], loop, multi-instance.
export function activityMarkers(node, box) {
  const markers = [];
  if (node.kind === 'subprocess' || (node.kind === 'call-activity' && node.callsProcess)) markers.push('collapsed');
  if (node.marker) markers.push(node.marker);
  if (!markers.length) return '';
  const size = 12;
  const gap = 4;
  const total = markers.length * size + (markers.length - 1) * gap;
  let x = box.x + box.w / 2 - total / 2;
  const y = box.y + box.h - size - 4;
  const parts = markers.map((marker) => {
    const left = x;
    x += size + gap;
    const cx = left + size / 2;
    const cy = y + size / 2;
    if (marker === 'collapsed') {
      return `<rect x="${round(left)}" y="${round(y)}" width="${size}" height="${size}" rx="1" class="bpmn-ink"/><path d="M ${p(cx, y + 2.5)} L ${p(cx, y + size - 2.5)} M ${p(left + 2.5, cy)} L ${p(left + size - 2.5, cy)}" class="bpmn-ink"/>`;
    }
    if (marker === 'loop') {
      return `<path d="M ${p(cx + 4, cy + 3.2)} A 4.6 4.6 0 1 0 ${p(cx - 1.2, cy + 4.6)} M ${p(cx - 1.2, cy + 4.6)} L ${p(cx - 4.6, cy + 2.4)} M ${p(cx - 1.2, cy + 4.6)} L ${p(cx - 2.6, cy + 1)}" class="bpmn-ink"/>`;
    }
    const bars = [0, 1, 2].map((i) => (marker === 'mi-parallel'
      ? `M ${p(left + 2.5 + i * 3.5, y + 1)} L ${p(left + 2.5 + i * 3.5, y + size - 1)}`
      : `M ${p(left + 1, y + 2.5 + i * 3.5)} L ${p(left + size - 1, y + 2.5 + i * 3.5)}`)).join(' ');
    return `<path d="${bars}" class="bpmn-ink" stroke-width="1.6"/>`;
  });
  return `<g aria-hidden="true">${parts.join('')}</g>`;
}

export function gatewayPoints(cx, cy, r = GATEWAY_R) {
  return `${p(cx, cy - r)} ${p(cx + r, cy)} ${p(cx, cy + r)} ${p(cx - r, cy)}`;
}

export function gatewayMarker(type, cx, cy) {
  switch (type) {
    case 'parallel':
      return `<g aria-hidden="true"><path d="M ${p(cx, cy - 11)} L ${p(cx, cy + 11)} M ${p(cx - 11, cy)} L ${p(cx + 11, cy)}" class="bpmn-ink" stroke-width="3.4" stroke-linecap="butt"/></g>`;
    case 'inclusive':
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(cy)}" r="9.5" class="bpmn-ink" stroke-width="2.6"/></g>`;
    case 'event-based': {
      const pent = [0, 1, 2, 3, 4].map((i) => {
        const a = -Math.PI / 2 + (2 * Math.PI / 5) * i;
        return p(cx + Math.cos(a) * 5.4, cy + Math.sin(a) * 5.4);
      }).join(' ');
      return `<g aria-hidden="true"><circle cx="${round(cx)}" cy="${round(cy)}" r="11" class="bpmn-ink" stroke-width="1"/><circle cx="${round(cx)}" cy="${round(cy)}" r="8.6" class="bpmn-ink" stroke-width="1"/><polygon points="${pent}" class="bpmn-ink" stroke-width="1"/></g>`;
    }
    default:
      return `<g aria-hidden="true"><path d="M ${p(cx - 8, cy - 8)} L ${p(cx + 8, cy + 8)} M ${p(cx + 8, cy - 8)} L ${p(cx - 8, cy + 8)}" class="bpmn-ink" stroke-width="3.4" stroke-linecap="butt"/></g>`;
  }
}

export function dataObjectPath(x, y, w = DATA_OBJECT.w, h = DATA_OBJECT.h) {
  const fold = 9;
  return `M ${p(x, y)} L ${p(x + w - fold, y)} L ${p(x + w, y + fold)} L ${p(x + w, y + h)} L ${p(x, y + h)} Z`;
}

export function dataObjectFold(x, y, w = DATA_OBJECT.w) {
  const fold = 9;
  return `<path d="M ${p(x + w - fold, y)} L ${p(x + w - fold, y + fold)} L ${p(x + w, y + fold)}" aria-hidden="true" class="bpmn-ink" stroke-width="1"/>`;
}

export function dataStorePath(x, y, w = DATA_STORE.w, h = DATA_STORE.h) {
  const ry = 5;
  return `M ${p(x, y + ry)} A ${w / 2} ${ry} 0 0 1 ${p(x + w, y + ry)} L ${p(x + w, y + h - ry)} A ${w / 2} ${ry} 0 0 1 ${p(x, y + h - ry)} Z`;
}

export function dataStoreRims(x, y, w = DATA_STORE.w) {
  const ry = 5;
  return `<path d="M ${p(x, y + ry)} A ${w / 2} ${ry} 0 0 0 ${p(x + w, y + ry)} M ${p(x, y + ry + 4)} A ${w / 2} ${ry} 0 0 0 ${p(x + w, y + ry + 4)}" aria-hidden="true" class="bpmn-ink" stroke-width="1"/>`;
}
