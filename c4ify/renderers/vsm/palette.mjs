// Business kind -> viewer palette slot (frontend|backend|database|cloud|security|messagebus|external).
// VSM kinds carry a "vsm-" prefix so they never collide with the viewer.kind
// keys of other diagram types (process, customer and supplier are common words).
export const VSM_KIND_PALETTE = {
  'vsm-supplier': 'external',
  'vsm-customer': 'external',
  'vsm-control': 'database',
  'vsm-process': 'backend',
  'vsm-inventory': 'cloud',
  'vsm-queue': 'cloud',
  'vsm-supermarket': 'messagebus',
  'vsm-fifo': 'messagebus',
  'vsm-kaizen': 'security',
};
