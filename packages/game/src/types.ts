import type { GymId, Quality } from '@fitheon/catalog';

export type OwnedMachine = {
  gymId: GymId; slotId: string; lineId: string; quality: Quality;
  installed: boolean;
  broughtFromSlotId: string | null;   // slot in the previous gym it was copied from
};

export type GymProgress = { floorStyleId: string; wallStyleId: string; ownedStyleIds: string[] };

export type GameState = {
  coins: number; xp: number;
  currentGymId: GymId;
  gyms: Partial<Record<GymId, GymProgress>>;   // unlocked gyms only
  machines: OwnedMachine[];
};

export type Action =
  | { type: 'install'; gymId: GymId; slotId: string; lineId: string }
  | { type: 'bring_over'; gymId: GymId; slotId: string; fromSlotId: string }
  | { type: 'upgrade'; gymId: GymId; slotId: string }
  | { type: 'swap'; gymId: GymId; slotId: string; lineId: string }
  | { type: 'buy_style'; gymId: GymId; styleId: string }
  | { type: 'set_style'; gymId: GymId; styleId: string }
  | { type: 'move_gym' }
  | { type: 'set_current_gym'; gymId: GymId };

export type ActionError =
  | 'gym_locked' | 'unknown_slot' | 'unknown_line' | 'unknown_style'
  | 'category_mismatch' | 'line_locked' | 'quality_locked' | 'not_upgradable' | 'max_quality'
  | 'insufficient_coins' | 'slot_empty' | 'already_owned' | 'not_owned'
  | 'already_brought' | 'nothing_to_bring' | 'level_too_low' | 'no_next_gym';

export type ActionResult =
  | { ok: true; state: GameState; coinsDelta: number }
  | { ok: false; error: ActionError };

export type SlotView = {
  installed: OwnedMachine | null;
  upgrade: { to: Quality; price: number; blocked: ActionError | null } | null;  // null when not upgradable or at tier 4
  buyable: { lineId: string; price: number; blocked: ActionError | null }[];    // accepted lines not owned in this slot
  bringable: { fromSlotId: string; lineId: string; quality: Quality }[];
  stored: OwnedMachine[];
};
