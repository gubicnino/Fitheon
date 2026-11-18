import { GYMS, MACHINE_LINES, QUALITIES } from '@fitheon/catalog';
import type { GymId, Quality } from '@fitheon/catalog';

export type Unlock =
  | { kind: 'machine'; lineId: string; name: string; level: number }
  | { kind: 'quality'; quality: Quality; name: string; level: number }
  | { kind: 'gym'; gymId: GymId; name: string; level: number };

const KIND_ORDER: Record<Unlock['kind'], number> = { machine: 0, quality: 1, gym: 2 };

/**
 * Everything the catalog gates at a level above `levelBefore` and up to `levelAfter`: machine
 * lines, quality tiers and gyms. Ordered by level, then machines, qualities, gyms; within a kind
 * in catalog order. Only reads the catalog.
 */
export function unlocksBetween(levelBefore: number, levelAfter: number): Unlock[] {
  const reached = (level: number) => levelBefore < level && level <= levelAfter;

  const unlocks: Unlock[] = [
    ...MACHINE_LINES.filter(l => reached(l.unlockLevel)).map(
      (l): Unlock => ({ kind: 'machine', lineId: l.id, name: l.name, level: l.unlockLevel }),
    ),
    ...Object.values(QUALITIES)
      .filter(q => reached(q.playerLevel))
      .map((q): Unlock => ({ kind: 'quality', quality: q.quality, name: q.name, level: q.playerLevel })),
    ...GYMS.filter(g => reached(g.levelGate)).map(
      (g): Unlock => ({ kind: 'gym', gymId: g.id, name: g.name, level: g.levelGate }),
    ),
  ];
  // Array.prototype.sort is stable, so catalog order survives within a level and kind.
  return unlocks.sort((a, b) => a.level - b.level || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}
