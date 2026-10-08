// C4 kind → shared palette slot. The C4 model prescribes no colours; the only
// rule is consistency plus a key (c4model.com, "Notation"). Internal elements
// get one hue per abstraction level and every external element is slate, so
// "ours vs. theirs" reads at a glance and in grayscale print.
export const C4_KIND_PALETTE = {
  person: 'frontend',
  'software-system': 'backend',
  container: 'database',
  component: 'cloud',
  'external-person': 'external',
  'external-system': 'external',
  'external-container': 'external',
  'external-component': 'external',
};
