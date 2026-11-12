import { GYMS } from './gyms';
import { MACHINE_LINES } from './machines';
import type { Gym, GymId, MachineLine, Slot, Style, StyleKind } from './types';

export * from './types';
export * from './qualities';
export * from './machines';
export * from './gyms';
export * from './pricing';

export function getGym(id: string): Gym | undefined {
  return GYMS.find(g => g.id === id);
}

export function getLine(id: string): MachineLine | undefined {
  return MACHINE_LINES.find(l => l.id === id);
}

export function getSlot(gymId: string, slotId: string): Slot | undefined {
  return getGym(gymId)?.slots.find(s => s.id === slotId);
}

export function nextGym(id: GymId): Gym | undefined {
  const index = GYMS.findIndex(g => g.id === id);
  return index < 0 ? undefined : GYMS[index + 1];
}

export function previousGym(id: GymId): Gym | undefined {
  const index = GYMS.findIndex(g => g.id === id);
  return index <= 0 ? undefined : GYMS[index - 1];
}

/** The price-0 style of that kind. Every gym has exactly one; the catalog tests enforce it. */
export function defaultStyle(gym: Gym, kind: StyleKind): Style {
  const style = gym.styles.find(s => s.kind === kind && s.price === 0);
  if (!style) throw new Error(`catalog: ${gym.id} has no default ${kind}`);
  return style;
}
