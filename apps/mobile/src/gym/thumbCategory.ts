import { getLine, type Category } from '@fitheon/catalog';

import type { SlotRow } from '@/state/selectors';

/** The category whose icon a slot's thumbnail shows: the installed machine's, else the slot's first. */
export function thumbCategory(slot: SlotRow): Category {
  const line = slot.lineId ? getLine(slot.lineId) : undefined;
  return line?.categories[0] ?? slot.accepts[0] ?? 'machine';
}
