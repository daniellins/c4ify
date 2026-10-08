// Business kind -> viewer palette slot (frontend|backend|database|cloud|security|messagebus|external).
// One family per SIPOC column; the process boundaries get their own accent.
export const SIPOC_KIND_PALETTE = {
  'sipoc-supplier': 'external',
  'sipoc-input': 'frontend',
  'sipoc-step': 'backend',
  'sipoc-output': 'database',
  'sipoc-customer': 'cloud',
  'sipoc-boundary': 'messagebus',
};
