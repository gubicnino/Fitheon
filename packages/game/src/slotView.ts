import { MACHINE_LINES, getLine, installPrice, previousGym, upgradePrice } from '@fitheon/catalog';
import type { GymId } from '@fitheon/catalog';
import {
  applyAction, installedIn, lineFitsSlot, machinesInSlot, nextTier, slotOf, unlockedGym,
} from './applyAction';
import type { Action, ActionError, GameState, SlotView } from './types';

/** What `applyAction` would say about this action: null if it would succeed. */
function blockedBy(state: GameState, action: Action): ActionError | null {
  const result = applyAction(state, action);
  return result.ok ? null : result.error;
}

/** Everything a slot offers, for the UI. Null for a locked gym or an unknown slot. */
export function getSlotView(state: GameState, gymId: GymId, slotId: string): SlotView | null {
  const unlocked = unlockedGym(state, gymId);
  if (!unlocked) return null;
  const { gym } = unlocked;
  const slot = slotOf(gym, slotId);
  if (!slot) return null;

  const inSlot = machinesInSlot(state, gym.id, slot.id);
  const installed = installedIn(state, gym.id, slot.id) ?? null;
  const stored = inSlot.filter(m => !m.installed);

  let upgrade: SlotView['upgrade'] = null;
  const installedLine = installed ? getLine(installed.lineId) : undefined;
  const tier = installed ? nextTier(installed.quality) : undefined;
  if (installedLine && installedLine.flatPrice === null && tier) {
    upgrade = {
      to: tier.quality,
      price: upgradePrice(installedLine, tier.quality),
      blocked: blockedBy(state, { type: 'upgrade', gymId: gym.id, slotId: slot.id }),
    };
  }

  const buyable = MACHINE_LINES
    .filter(line => lineFitsSlot(line, slot) && !inSlot.some(m => m.lineId === line.id))
    .map(line => ({
      lineId: line.id,
      price: installPrice(line),
      blocked: blockedBy(state, { type: 'install', gymId: gym.id, slotId: slot.id, lineId: line.id }),
    }));

  const bringable: SlotView['bringable'] = [];
  const source = previousGym(gym.id);
  for (const sourceSlot of source?.slots ?? []) {
    const original = source ? installedIn(state, source.id, sourceSlot.id) : undefined;
    if (!original) continue;
    const action: Action = { type: 'bring_over', gymId: gym.id, slotId: slot.id, fromSlotId: sourceSlot.id };
    if (blockedBy(state, action) === null) {
      bringable.push({ fromSlotId: sourceSlot.id, lineId: original.lineId, quality: original.quality });
    }
  }

  return { installed, upgrade, buyable, bringable, stored };
}
