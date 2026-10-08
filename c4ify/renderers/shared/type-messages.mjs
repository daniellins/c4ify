// Renderer-owned message tuples. Each renderer keeps its copy in
// renderers/<type>/messages.mjs so the shared catalog stays small; this module
// only merges them. i18n.mjs rejects a key that collides with the shared catalog.
// Tuple order follows SUPPORTED_LOCALES in i18n.mjs: [en, pt-BR].

import { C4_MESSAGES } from '../c4/messages.mjs';

const SOURCES = [C4_MESSAGES];

export const TYPE_MESSAGES = {};
for (const source of SOURCES) {
  for (const [key, pair] of Object.entries(source)) {
    if (Object.hasOwn(TYPE_MESSAGES, key)) throw new Error(`Duplicate c4ify type message ${JSON.stringify(key)}`);
    TYPE_MESSAGES[key] = pair;
  }
}
