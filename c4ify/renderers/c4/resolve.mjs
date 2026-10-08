// Model → view resolution for C4 (pure; no I/O, so it is unit-tested directly).
//
// One model holds every element and relationship once. A view is a question
// asked of that model at one level of abstraction: which elements are in scope,
// which neighbours they talk to, and which relationships connect them. As in
// Structurizr, relationships authored between low-level elements are *implied*
// upward: component A → container B also means "A's container → B" in a
// container view and "A's system → B's system" in a context view.

export const LEVEL = { person: 0, softwareSystem: 0, container: 1, component: 2 };

export const VIEW_SCOPE_TYPE = {
  systemLandscape: null,
  systemContext: 'softwareSystem',
  container: 'softwareSystem',
  component: 'container',
};

export function indexModel(model) {
  const elements = new Map(model.elements.map((element) => [element.id, element]));
  const children = new Map();
  for (const element of model.elements) {
    if (!element.parent) continue;
    if (!children.has(element.parent)) children.set(element.parent, []);
    children.get(element.parent).push(element);
  }
  return { elements, children, relationships: model.relationships || [] };
}

// Self first, then parent, grandparent…
export function ancestry(index, id) {
  const chain = [];
  const seen = new Set();
  let cursor = index.elements.get(id);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.push(cursor);
    cursor = cursor.parent ? index.elements.get(cursor.parent) : undefined;
  }
  return chain;
}

export function isAncestor(index, ancestorId, id) {
  return ancestry(index, id).slice(1).some((element) => element.id === ancestorId);
}

// The system an element belongs to (itself for people and systems).
export function topLevel(index, id) {
  return ancestry(index, id).at(-1);
}

// Representative of `id` among the visible set: the element itself or its
// nearest visible ancestor; undefined when nothing on the path is visible.
export function representative(index, visible, id) {
  return ancestry(index, id).find((element) => visible.has(element.id));
}

// Elements a view shows before include/exclude:
//  - landscape: every person and software system;
//  - context: the scope system plus every person/system it talks to;
//  - container: the scope's containers plus people/systems they talk to;
//  - component: the scope container's components plus the sibling containers
//    and outside people/systems they talk to.
function inScope(index, view) {
  if (view.type === 'systemLandscape') {
    return [...index.elements.values()].filter((element) => element.type === 'person' || element.type === 'softwareSystem');
  }
  const scope = index.elements.get(view.scope);
  if (view.type === 'systemContext') return [scope];
  return index.children.get(scope.id) || [];
}

// Level at which an outside element is drawn in a view of `scope`.
function outsideRepresentative(index, view, id) {
  const chain = ancestry(index, id);
  if (view.type === 'component') {
    const scope = index.elements.get(view.scope);
    // Inside the same system: show the sibling container.
    if (topLevel(index, id)?.id === topLevel(index, scope.id)?.id) {
      return chain.find((element) => element.type === 'container') || chain.at(-1);
    }
  }
  return chain.at(-1);
}

export function resolveView(index, view) {
  const core = inScope(index, view);
  const visible = new Map(core.map((element) => [element.id, element]));
  const coreIds = new Set(core.map((element) => element.id));

  if (view.type !== 'systemLandscape') {
    // Neighbours: lift each endpoint; when one side lands in the core, the
    // other side's outside representative joins the view.
    const coreRep = (id) => ancestry(index, id).find((element) => coreIds.has(element.id));
    for (const relationship of index.relationships) {
      const fromCore = coreRep(relationship.from);
      const toCore = coreRep(relationship.to);
      if (fromCore && !toCore) {
        const other = outsideRepresentative(index, view, relationship.to);
        if (other && !isInsideScope(index, view, other.id)) visible.set(other.id, other);
      } else if (toCore && !fromCore) {
        const other = outsideRepresentative(index, view, relationship.from);
        if (other && !isInsideScope(index, view, other.id)) visible.set(other.id, other);
      }
    }
  }

  for (const id of view.include || []) {
    const element = index.elements.get(id);
    if (element) visible.set(id, element);
  }
  for (const id of view.exclude || []) visible.delete(id);

  // exclude_relationships hides arrows as drawn (after lifting), e.g. every
  // service's call to a shared config or tracing server: { from: "*", to: "config" }.
  const hidden = view.exclude_relationships || [];
  const matches = (pattern, id) => pattern === '*' || pattern === id;
  const relationships = liftRelationships(index, new Set(visible.keys()))
    .filter((relationship) => !hidden.some((rule) => matches(rule.from, relationship.from) && matches(rule.to, relationship.to)));
  return {
    elements: [...visible.values()],
    core: core.filter((element) => visible.has(element.id)),
    relationships,
    boundary: boundaryFor(index, view),
  };
}

// The scope itself is drawn as a boundary in container/component views, never
// as a box next to its own children.
function isInsideScope(index, view, id) {
  if (view.type === 'container' || view.type === 'component') {
    return id === view.scope || isAncestor(index, id, view.scope);
  }
  return false;
}

function boundaryFor(index, view) {
  if (view.type !== 'container' && view.type !== 'component') return null;
  return index.elements.get(view.scope);
}

// Lift every authored relationship onto the visible set and merge duplicates.
// An authored relationship whose endpoints are both visible as themselves is
// "direct" and wins the label; otherwise the first implied one is used and the
// count of merged relationships is kept for the details panel.
export function liftRelationships(index, visibleIds) {
  const visible = new Map([...visibleIds].map((id) => [id, index.elements.get(id)]));
  const merged = new Map();
  index.relationships.forEach((relationship, order) => {
    const from = representative(index, visible, relationship.from);
    const to = representative(index, visible, relationship.to);
    if (!from || !to || from.id === to.id) return;
    // A relationship from inside an element to that element's own ancestor is
    // structural, not a dependency; skip it at every level.
    if (isAncestor(index, from.id, to.id) || isAncestor(index, to.id, from.id)) return;
    const key = `${from.id}\u0000${to.id}`;
    const direct = relationship.from === from.id && relationship.to === to.id;
    const entry = merged.get(key);
    if (!entry) {
      merged.set(key, {
        from: from.id,
        to: to.id,
        description: relationship.description,
        technology: relationship.technology,
        async: relationship.async === true,
        sources: [relationship],
        direct,
        order,
      });
      return;
    }
    entry.sources.push(relationship);
    if (direct && !entry.direct) {
      Object.assign(entry, {
        description: relationship.description,
        technology: relationship.technology,
        technologyConflict: false,
        async: relationship.async === true,
        direct: true,
      });
    } else if (!entry.direct && (entry.technologyConflict || entry.technology !== relationship.technology)) {
      // Implied relationships that disagree on technology (including one
      // that names none) keep none, rather than claiming one protocol for all.
      entry.technology = undefined;
      entry.technologyConflict = true;
    }
  });
  return [...merged.values()]
    .sort((left, right) => left.order - right.order)
    .map((entry, index) => ({ ...entry, id: `r${index + 1}`, count: entry.sources.length }));
}

// C4 kind used for color, legend and the viewer's Semantic Lens.
export function kindOf(element) {
  const base = { person: 'person', softwareSystem: 'software-system', container: 'container', component: 'component' }[element.type];
  if (!element.external) return base;
  return { person: 'external-person', 'software-system': 'external-system', container: 'external-container', component: 'external-component' }[base];
}

// Drill-down: double-clicking an element opens the next level about it: from
// a landscape, a system's context view; from a context view, the system's
// container view; from a container view, a container's component view.
const LEVEL_OF_VIEW = { systemLandscape: 0, systemContext: 1, container: 2, component: 3 };

export function drillTarget(views, current, elementId) {
  const candidates = views.filter((candidate) => candidate !== current && candidate.scope === elementId);
  if (!candidates.length) return null;
  const floor = current.scope === elementId ? LEVEL_OF_VIEW[current.type] : 0;
  const deeper = candidates.filter((candidate) => LEVEL_OF_VIEW[candidate.type] > floor);
  return deeper.sort((left, right) => LEVEL_OF_VIEW[left.type] - LEVEL_OF_VIEW[right.type])[0] || null;
}
