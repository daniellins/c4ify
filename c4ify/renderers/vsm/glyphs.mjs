// VSM icon geometry (Learning to See icon sheet, simplified for the viewer).
// Every glyph uses the viewer's semantic classes so presets and themes apply.

import { round } from '../shared/business.mjs';

const r = round;

export function vsmDefinitions() {
  return `        <defs>
          <pattern id="vsm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2.6" height="6" class="m-default"/>
          </pattern>
          <marker id="vsm-push-head" markerWidth="16" markerHeight="16" refX="13" refY="8" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 1, 14 8, 0 15" class="m-default"/>
          </marker>
        </defs>`;
}

// Factory outline with a saw-tooth roof (supplier / customer).
export function factoryPath(x, y, w, h, roof = 12) {
  const third = w / 3;
  return `M ${r(x)} ${r(y + h)} V ${r(y)} L ${r(x + third)} ${r(y + roof)} V ${r(y)} L ${r(x + 2 * third)} ${r(y + roof)} V ${r(y)} L ${r(x + w)} ${r(y + roof)} V ${r(y + h)} Z`;
}

export function starPoints(cx, cy, outer, inner, spikes = 10) {
  const points = [];
  for (let index = 0; index < spikes * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    points.push(`${r(cx + radius * Math.cos(angle))},${r(cy + radius * Math.sin(angle))}`);
  }
  return points.join(' ');
}

export function trianglePoints(cx, top, half = 16, height = 28) {
  return `${r(cx)},${r(top)} ${r(cx - half)},${r(top + height)} ${r(cx + half)},${r(top + height)}`;
}

// Supermarket: shelves open towards the supplying (left) process.
export function supermarketPath(cx, top, half = 16, height = 28) {
  const left = cx - half;
  const right = cx + half;
  const third = height / 3;
  return `M ${r(left)} ${r(top)} H ${r(right)} V ${r(top + height)} H ${r(left)} M ${r(left)} ${r(top + third)} H ${r(right)} M ${r(left)} ${r(top + 2 * third)} H ${r(right)}`;
}

export function lightning(cx, cy, size = 6) {
  return `<path d="M ${r(cx - size * 0.55)} ${r(cy - size)} L ${r(cx + size * 0.2)} ${r(cy - size * 0.1)} L ${r(cx - size * 0.25)} ${r(cy + size * 0.1)} L ${r(cx + size * 0.55)} ${r(cy + size)}" class="a-emphasis" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"/>`;
}

export function truck(x, y) {
  return `<g aria-hidden="true"><rect x="${r(x)}" y="${r(y)}" width="14" height="8" rx="1" class="c-external" stroke-width="1"/><path d="M ${r(x + 14)} ${r(y + 2)} H ${r(x + 18)} L ${r(x + 20)} ${r(y + 5)} V ${r(y + 8)} H ${r(x + 14)} Z" class="c-external" stroke-width="1"/><circle cx="${r(x + 4)}" cy="${r(y + 9.5)}" r="1.8" class="c-external" stroke-width="1"/><circle cx="${r(x + 16)}" cy="${r(y + 9.5)}" r="1.8" class="c-external" stroke-width="1"/></g>`;
}

// Pull / withdrawal: a circular arrow sitting on the flow line.
export function pullGlyph(cx, cy) {
  return `<g aria-hidden="true"><circle cx="${r(cx)}" cy="${r(cy)}" r="10" class="c-mask"/><path d="M ${r(cx - 6)} ${r(cy + 3)} A 6.5 6.5 0 1 1 ${r(cx + 3)} ${r(cy + 6)}" class="a-default" stroke-width="1.5"/><polygon points="${r(cx + 1)},${r(cy + 2.6)} ${r(cx + 5.8)},${r(cy + 5.4)} ${r(cx + 1.6)},${r(cy + 8.8)}" class="m-default"/></g>`;
}
