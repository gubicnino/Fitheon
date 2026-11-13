import type { Category } from '@fitheon/catalog';

export const CATEGORY_LABEL: Record<Category, string> = {
  free_weights: 'Free weights',
  bench: 'Bench',
  press: 'Press',
  rack: 'Rack',
  pull: 'Pull',
  cardio: 'Cardio',
  machine: 'Machine',
  decor: 'Decor',
};

/** ['rack'] -> 'Rack'; ['rack', 'pull'] -> 'Rack or Pull'; three or more -> 'A, B or C'. */
export function acceptsLabel(accepts: Category[]): string {
  const names = accepts.map(c => CATEGORY_LABEL[c]);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** 1438 -> '1,438'. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB');
}
