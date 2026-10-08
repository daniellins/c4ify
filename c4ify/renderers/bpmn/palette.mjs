// Business kind -> viewer palette slot (frontend|backend|database|cloud|security|messagebus|external).
// Colour stays a highlight: BPMN meaning is carried by shape and marker, never by colour alone.
export const BPMN_KIND_PALETTE = {
  'start-event': 'frontend',
  'intermediate-event': 'messagebus',
  'end-event': 'security',
  task: 'backend',
  subprocess: 'database',
  'call-activity': 'database',
  gateway: 'cloud',
  'data-object': 'external',
  'data-store': 'external',
  annotation: 'external',
  'black-box-pool': 'external',
};
