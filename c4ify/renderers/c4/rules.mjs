// C4 method rules (see references/theory-c4.md for sources).
//
// HARD rules make the model unrenderable or misleading at any level, so they
// fail the whole model. SOFT rules follow the c4model.com notation checklist;
// they become advisories that block the showcase profile unless waived with a
// reason in meta.waivers. Title and key/legend are not rules: every view gets
// both by construction.

import { LEVEL, VIEW_SCOPE_TYPE, ancestry, isAncestor } from './resolve.mjs';

const PARENT_TYPE = { container: 'softwareSystem', component: 'container' };

export function hardRuleProblems(index, model, views) {
  const problems = [];
  const seen = new Set();
  for (const element of model.elements) {
    if (seen.has(element.id)) problems.push(`[R-C4-01] Element id "${element.id}" is used twice; ids are unique across the model.`);
    seen.add(element.id);
  }

  // R-C4-01: the hierarchy is person/system → container → component.
  for (const element of model.elements) {
    const expected = PARENT_TYPE[element.type];
    if (!element.parent) {
      if (expected) problems.push(`[R-C4-01] ${element.type} "${element.id}" needs a parent ${expected}; in C4 every ${element.type} lives inside one ${expected}.`);
      continue;
    }
    if (!expected) {
      problems.push(`[R-C4-01] ${element.type} "${element.id}" cannot have a parent; people and software systems are top-level.`);
      continue;
    }
    const parent = index.elements.get(element.parent);
    if (!parent) {
      problems.push(`[R-C4-01] "${element.id}" references unknown parent "${element.parent}".`);
    } else if (parent.type !== expected) {
      problems.push(`[R-C4-01] ${element.type} "${element.id}" sits in ${parent.type} "${parent.id}"; its parent must be a ${expected}.`);
    }
  }
  for (const element of model.elements) {
    if (ancestry(index, element.id).length > 3) problems.push(`[R-C4-01] "${element.id}" is part of a parent cycle.`);
  }

  // R-C4-03/04: relationships are labelled, directed dependencies between two
  // distinct, unrelated elements.
  model.relationships.forEach((relationship, position) => {
    const name = relationship.id || `relationships[${position}]`;
    for (const end of ['from', 'to']) {
      if (!index.elements.has(relationship[end])) problems.push(`[R-C4-04] Relationship ${name} ${end} "${relationship[end]}" is not a model element.`);
    }
    if (relationship.from === relationship.to) problems.push(`[R-C4-04] Relationship ${name} points "${relationship.from}" at itself.`);
    else if (index.elements.has(relationship.from) && index.elements.has(relationship.to)
      && (isAncestor(index, relationship.from, relationship.to) || isAncestor(index, relationship.to, relationship.from))) {
      problems.push(`[R-C4-04] Relationship ${name} connects "${relationship.from}" with its own ${isAncestor(index, relationship.from, relationship.to) ? 'child' : 'parent'}; containment is shown by the boundary, not by an arrow.`);
    }
    if (!relationship.description || !relationship.description.trim()) {
      problems.push(`[R-C4-03] Relationship ${name} (${relationship.from} → ${relationship.to}) has no description; every arrow is labelled with the intent of the relationship.`);
    }
  });

  // R-C4-02: each view type looks at one kind of scope.
  const keys = new Set();
  for (const view of views) {
    if (keys.has(view.key)) problems.push(`[R-C4-02] View key "${view.key}" is used twice.`);
    keys.add(view.key);
    const expected = VIEW_SCOPE_TYPE[view.type];
    const scope = expected ? index.elements.get(view.scope) : null;
    if (!expected) {
      if (view.scope) problems.push(`[R-C4-02] View "${view.key}" (systemLandscape) has no scope; remove "scope".`);
    } else if (!view.scope || !scope) {
      problems.push(`[R-C4-02] View "${view.key}" (${view.type}) needs "scope" pointing at a ${expected}.`);
    } else if (scope.type !== expected) {
      problems.push(`[R-C4-02] View "${view.key}" is a ${view.type} view, so its scope must be a ${expected}; "${scope.id}" is a ${scope.type}.`);
    } else if ((view.type === 'container' || view.type === 'component') && !(index.children.get(scope.id) || []).length) {
      problems.push(`[R-C4-05] View "${view.key}" zooms into "${scope.id}", which has no ${view.type === 'container' ? 'containers' : 'components'} in the model; add them or remove the view.`);
    }
    for (const field of ['include', 'exclude']) {
      for (const id of view[field] || []) {
        const element = index.elements.get(id);
        if (!element) {
          problems.push(`[R-C4-02] View "${view.key}" ${field}s unknown element "${id}".`);
        } else if (field === 'include' && !levelFits(view, element)) {
          problems.push(`[R-C4-02] View "${view.key}" includes ${element.type} "${id}", which is not drawn at the ${view.type} level.`);
        } else if (field === 'include' && scope && (id === scope.id || isAncestor(index, id, scope.id))) {
          problems.push(`[R-C4-02] View "${view.key}" includes "${id}", which is its own scope (drawn as the boundary).`);
        }
      }
    }
  }
  return problems;
}

function levelFits(view, element) {
  if (view.type === 'systemContext' || view.type === 'systemLandscape') return LEVEL[element.type] === 0;
  if (view.type === 'container') return element.type !== 'component';
  return true;
}

// ---------------------------------------------------------------------------
// SOFT rules
// ---------------------------------------------------------------------------
const VAGUE = new Set([
  'uses', 'use', 'calls', 'call', 'talks to', 'connects to', 'depends on', 'interacts with', 'communicates with',
  'usa', 'utiliza', 'chama', 'acessa', 'conecta', 'conecta-se a', 'depende de', 'interage com', 'se comunica com', 'comunica-se com',
]);

// Acronyms most technical audiences read without a key. Anything else in a
// name or description needs meta.glossary (shown as a card on every view).
const COMMON_ACRONYMS = new Set([
  'API', 'APIS', 'UI', 'UX', 'URL', 'HTTP', 'HTTPS', 'REST', 'JSON', 'XML', 'HTML', 'CSS', 'SQL', 'PDF', 'CSV', 'SMS', 'ID', 'IDS',
  'IT', 'TI', 'IA', 'AI', 'OK', 'FAQ', 'CPU', 'GPU', 'USB', 'IP', 'DNS', 'TCP', 'UDP', 'SSH', 'SDK', 'CLI', 'OS', 'SO', 'IOS',
]);
const ACRONYM = /(?<![\p{L}\p{N}])\p{Lu}[\p{Lu}\p{N}]{1,5}s?(?![\p{L}\p{N}])/gu;

// Element and relationship findings are reported in the views that draw them,
// so one view's showcase gate never fails on an element it does not show.
// Orphans (drawn by no view) are reported once, in the first view.
export function modelAdvisories({ model, glossary: glossaryMap, advisories, t, shownHere, shownAnywhere, isFirstView }) {
  const glossary = glossaryTerms(glossaryMap);
  for (const element of model.elements) {
    if (!shownHere.has(element.id)) {
      if (isFirstView && !shownAnywhere.has(element.id)) advisories.warn('R-C4-12', t('c4.rule.orphan', { name: element.name }), element.id);
      continue;
    }
    if (!element.description) {
      advisories.warn('R-C4-06', t('c4.rule.description', { name: element.name }), element.id);
    }
    if ((element.type === 'container' || element.type === 'component') && !element.technology) {
      advisories.warn('R-C4-07', t('c4.rule.technology', { name: element.name }), element.id);
    }
    const unknown = unknownAcronyms(`${element.name} ${element.description || ''}`, glossary);
    if (unknown.length) advisories.warn('R-C4-09', t('c4.rule.acronym', { name: element.name, list: unknown.join(', ') }), element.id);
  }
}

// Relationship labels are checked as drawn in the view (after lifting), so an
// implied relationship carries the same notation duties as an authored one.
export function relationshipAdvisories(resolved, glossaryMap, advisories, t) {
  const glossary = glossaryTerms(glossaryMap);
  for (const relationship of resolved.relationships) {
    const description = (relationship.description || '').trim();
    if (description && VAGUE.has(description.toLowerCase())) {
      advisories.warn('R-C4-11', t('c4.rule.vague', { text: description, from: relationship.from, to: relationship.to }), relationship.from);
    }
    const unknown = unknownAcronyms(description, glossary);
    if (unknown.length) advisories.warn('R-C4-09', t('c4.rule.acronymRel', { text: description, list: unknown.join(', ') }), relationship.from);
  }
}

// Acronyms a glossary covers: each key ("EF Core") and each of its words
// ("EF", "CORE"), upper-cased.
export function glossaryTerms(glossaryMap) {
  const terms = new Set();
  for (const key of Object.keys(glossaryMap || {})) {
    terms.add(key.toUpperCase());
    for (const word of key.split(/\s+/)) terms.add(word.toUpperCase());
  }
  return terms;
}

// Glossary entries whose term appears in the given text (a view's drawn text).
export function glossaryUsed(glossaryMap, text) {
  return Object.entries(glossaryMap || {}).filter(([term]) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}s?(?![\\p{L}\\p{N}])`, 'u').test(text);
  });
}

function unknownAcronyms(text, glossary) {
  const found = new Set();
  for (const match of String(text).matchAll(ACRONYM)) {
    const word = match[0].replace(/s$/, '');
    if (word.length < 2 || COMMON_ACRONYMS.has(word) || glossary.has(word)) continue;
    found.add(word);
  }
  return [...found];
}

// Advisories that depend on one view's resolved content.
export function viewAdvisories(view, resolved, index, advisories, t) {
  const subject = view.scope || resolved.elements[0]?.id;
  if (resolved.elements.length > 20) {
    advisories.warn('R-C4-10', t('c4.rule.crowded', { key: view.key, count: resolved.elements.length }), subject);
  }
  if (view.type === 'systemContext' && resolved.elements.length < 2) {
    advisories.warn('R-C4-13', t('c4.rule.lonely', { key: view.key }), subject);
  }
  for (const relationship of resolved.relationships) {
    const from = index.elements.get(relationship.from);
    const to = index.elements.get(relationship.to);
    // Inter-process: both ends run in different containers. Components of
    // one container call each other in memory, with no protocol to name.
    const containerOf = (element) => (element.type === 'component' ? element.parent : element.type === 'container' ? element.id : null);
    const interProcess = containerOf(from) && containerOf(to) && containerOf(from) !== containerOf(to);
    if (interProcess && !relationship.technology) {
      advisories.warn('R-C4-08', t('c4.rule.protocol', { from: from.name, to: to.name }), from.id);
    }
  }
}
