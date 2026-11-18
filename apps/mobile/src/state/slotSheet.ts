import { getGym, getLine, QUALITIES } from '@fitheon/catalog';
import type { Gym, MachineLine, Quality, QualityTier } from '@fitheon/catalog';
import { levelForXp } from '@fitheon/engine';
import { getSlotView } from '@fitheon/game';
import type { ActionError, OwnedMachine } from '@fitheon/game';

import { slotLabel } from '../ui/labels';
import type { AppState } from './appState';

export type SheetOption = {
  lineId: string;
  name: string;
  startQuality: Quality;
  startQualityName: string;
  price: number;
  blocked: ActionError | null;
  reason: string | null;
};

export type SheetMachine = { lineId: string; name: string; quality: Quality; qualityName: string };

export type SlotSheetView = {
  slotId: string;
  /** slotLabel, e.g. 'Slot 3'. */
  title: string;
  installed: SheetMachine | null;
  upgrade: { toName: string; price: number; blocked: ActionError | null; reason: string | null } | null;
  /** Open options first, then the ones short of coins, then the locked ones; each group in catalog order. */
  buy: SheetOption[];
  stored: SheetMachine[];
};

export type ReasonContext = {
  coins: number;
  price: number;
  level: number;
  line?: MachineLine;
  tier?: QualityTier;
  gym: Gym;
};

/** A sentence for why an action is blocked. Never empty. */
export function blockedReason(error: ActionError, context: ReasonContext): string {
  const { coins, price, line, tier, gym } = context;
  switch (error) {
    case 'insufficient_coins':
      return `Need ${Math.max(price - coins, 0)} more coins`;
    case 'line_locked':
      return line ? `Unlocks at level ${line.unlockLevel}` : 'Unlocks at a higher level';
    case 'quality_locked':
      if (!tier || tier.quality > gym.qualityCap) {
        return `${gym.name} allows up to ${QUALITIES[gym.qualityCap].name}`;
      }
      return `Needs level ${tier.playerLevel}`;
    case 'max_quality':
      return 'Already at the highest quality';
    case 'not_upgradable':
      return 'Decor cannot be upgraded';
    case 'already_owned':
      return 'Already in this slot';
    case 'slot_empty':
      return 'This slot is empty';
    case 'not_owned':
      return 'Not stored in this slot';
    case 'gym_locked':
      return 'This gym is not unlocked yet';
    case 'unknown_slot':
      return 'This slot does not exist';
    case 'unknown_line':
      return 'This machine does not exist';
    case 'unknown_style':
      return 'This style does not exist';
    case 'already_brought':
      return 'Already brought over';
    case 'nothing_to_bring':
      return 'Nothing to bring over';
    case 'level_too_low':
      return 'Your level is too low';
    case 'no_next_gym':
      return 'There is no next gym';
  }
}

/**
 * The sentence for an action the store refused in a slot of the current gym. Pass the line for an
 * install; leave it out for an upgrade of the installed machine.
 */
export function failureReason(app: AppState, slotId: string, error: ActionError, lineId?: string): string {
  const { game } = app;
  const gym = getGym(game.currentGymId);
  const view = gym ? getSlotView(game, gym.id, slotId) : null;
  if (!gym || !view) return 'This slot is not available';
  const base = { coins: game.coins, level: levelForXp(game.xp), gym };
  if (lineId !== undefined) {
    const line = getLine(lineId);
    const price = view.buyable.find(o => o.lineId === lineId)?.price ?? 0;
    return blockedReason(error, { ...base, price, line, tier: line ? QUALITIES[line.startQuality] : undefined });
  }
  const line = view.installed ? getLine(view.installed.lineId) : undefined;
  const tier = view.upgrade ? QUALITIES[view.upgrade.to] : undefined;
  return blockedReason(error, { ...base, price: view.upgrade?.price ?? 0, line, tier });
}

// The order of the groups in the list; lower comes first. Arrangement only, not a rule.
function group(blocked: ActionError | null): number {
  if (blocked === null) return 0;
  if (blocked === 'insufficient_coins') return 1;
  return 2;
}

function sheetMachine(m: OwnedMachine): SheetMachine {
  return {
    lineId: m.lineId,
    name: getLine(m.lineId)?.name ?? m.lineId,
    quality: m.quality,
    qualityName: QUALITIES[m.quality].name,
  };
}

/** What the slot sheet shows for a slot of the current gym. Null for an unknown slot. */
export function slotSheetView(app: AppState, slotId: string): SlotSheetView | null {
  const { game } = app;
  const gym = getGym(game.currentGymId);
  if (!gym) return null;
  const index = gym.slots.findIndex(s => s.id === slotId);
  if (index < 0) return null;
  const view = getSlotView(game, gym.id, slotId);
  if (!view) return null;

  const level = levelForXp(game.xp);
  const context = (price: number, line?: MachineLine, tier?: QualityTier): ReasonContext =>
    ({ coins: game.coins, price, level, line, tier, gym });

  const buy: SheetOption[] = [];
  for (const option of view.buyable) {
    const line = getLine(option.lineId);
    // A line that starts above the gym's cap can never stand here; it is left out of the list.
    if (!line || line.startQuality > gym.qualityCap) continue;
    const tier = QUALITIES[line.startQuality];
    buy.push({
      lineId: line.id,
      name: line.name,
      startQuality: tier.quality,
      startQualityName: tier.name,
      price: option.price,
      blocked: option.blocked,
      reason: option.blocked === null ? null : blockedReason(option.blocked, context(option.price, line, tier)),
    });
  }
  // Array.prototype.sort is stable, so each group keeps the catalog order.
  buy.sort((a, b) => group(a.blocked) - group(b.blocked));

  let upgrade: SlotSheetView['upgrade'] = null;
  if (view.upgrade) {
    const { to, price, blocked } = view.upgrade;
    const tier = QUALITIES[to];
    const line = view.installed ? getLine(view.installed.lineId) : undefined;
    upgrade = {
      toName: tier.name,
      price,
      blocked,
      reason: blocked === null ? null : blockedReason(blocked, context(price, line, tier)),
    };
  }

  return {
    slotId,
    title: slotLabel(index + 1),
    installed: view.installed ? sheetMachine(view.installed) : null,
    upgrade,
    buy,
    stored: view.stored.map(sheetMachine),
  };
}
