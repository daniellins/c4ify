// Renderer-owned message tuples for the business diagram types.
// Each renderer keeps its copy in renderers/<type>/messages.mjs so the shared
// catalog stays small; this module only merges them. i18n.mjs rejects a key
// that collides with the shared catalog.
// Tuple order follows SUPPORTED_LOCALES in i18n.mjs: [en, pt-BR].

import { WBS_MESSAGES } from '../wbs/messages.mjs';
import { BPMN_MESSAGES } from '../bpmn/messages.mjs';
import { VSM_MESSAGES } from '../vsm/messages.mjs';
import { IMPACTMAP_MESSAGES } from '../impactmap/messages.mjs';
import { STORYMAP_MESSAGES } from '../storymap/messages.mjs';
import { SIPOC_MESSAGES } from '../sipoc/messages.mjs';

const SOURCES = [WBS_MESSAGES, BPMN_MESSAGES, VSM_MESSAGES, IMPACTMAP_MESSAGES, STORYMAP_MESSAGES, SIPOC_MESSAGES];

export const TYPE_MESSAGES = {};
for (const source of SOURCES) {
  for (const [key, pair] of Object.entries(source)) {
    if (Object.hasOwn(TYPE_MESSAGES, key)) throw new Error(`Duplicate Bizify type message ${JSON.stringify(key)}`);
    TYPE_MESSAGES[key] = pair;
  }
}
