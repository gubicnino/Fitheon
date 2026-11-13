import {
  GYMS, MAX_QUALITY, QUALITIES, defaultStyle, getLine, installPrice, nextGym, previousGym, upgradePrice,
} from '@fitheon/catalog';
import type { Gym, GymId, MachineLine, Quality, QualityTier, Slot } from '@fitheon/catalog';
import { levelForXp } from '@fitheon/engine';
import type { Action, ActionError, ActionResult, GameState, GymProgress, OwnedMachine } from './types';

// ---- helpers shared with slotView -------------------------------------------------------------

/** A real catalog gym that the player has unlocked. Prototype keys never count. */
export function unlockedGym(state: GameState, gymId: string): { gym: Gym; progress: GymProgress } | undefined {
  const gym = GYMS.find(g => g.id === gymId);
  if (!gym || !Object.hasOwn(state.gyms, gym.id)) return undefined;
  const progress = state.gyms[gym.id];
  return progress ? { gym, progress } : undefined;
}

export function slotOf(gym: Gym, slotId: string): Slot | undefined {
  return gym.slots.find(s => s.id === slotId);
}

export function lineFitsSlot(line: MachineLine, slot: Slot): boolean {
  return line.categories.some(c => slot.accepts.includes(c));
}

export function machinesInSlot(state: GameState, gymId: GymId, slotId: string): OwnedMachine[] {
  return state.machines.filter(m => m.gymId === gymId && m.slotId === slotId);
}

export function installedIn(state: GameState, gymId: GymId, slotId: string): OwnedMachine | undefined {
  return machinesInSlot(state, gymId, slotId).find(m => m.installed);
}

/** The tier above `quality`, or undefined at the top tier. */
export function nextTier(quality: Quality): QualityTier | undefined {
  if (quality >= MAX_QUALITY) return undefined;
  return Object.values(QUALITIES).find(t => t.quality === quality + 1);
}

// ---- internals --------------------------------------------------------------------------------

const fail = (error: ActionError): ActionResult => ({ ok: false, error });

function succeed(before: GameState, state: GameState): ActionResult {
  return { ok: true, state, coinsDelta: state.coins - before.coins };
}

function tierAllowed(tier: QualityTier, gym: Gym, level: number): boolean {
  return tier.quality <= gym.qualityCap && level >= tier.playerLevel;
}

function ownsLineInSlot(state: GameState, gymId: GymId, slotId: string, lineId: string): boolean {
  return machinesInSlot(state, gymId, slotId).some(m => m.lineId === lineId);
}

/** Every installed machine in the slot becomes stored; the rest of the list is copied untouched. */
function storeInstalled(machines: OwnedMachine[], gymId: GymId, slotId: string): OwnedMachine[] {
  return machines.map(m =>
    m.gymId === gymId && m.slotId === slotId && m.installed ? { ...m, installed: false } : m);
}

function highestUnlockedGym(state: GameState): Gym | undefined {
  let highest: Gym | undefined;
  for (const gym of GYMS) {
    if (Object.hasOwn(state.gyms, gym.id) && (!highest || gym.order > highest.order)) highest = gym;
  }
  return highest;
}

function withGymProgress(state: GameState, gymId: GymId, progress: GymProgress): GameState {
  return { ...state, gyms: { ...state.gyms, [gymId]: progress } };
}

// ---- actions ----------------------------------------------------------------------------------

function install(state: GameState, a: Extract<Action, { type: 'install' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym } = unlocked;
  const slot = slotOf(gym, a.slotId);
  if (!slot) return fail('unknown_slot');
  const line = getLine(a.lineId);
  if (!line) return fail('unknown_line');
  if (!lineFitsSlot(line, slot)) return fail('category_mismatch');
  if (ownsLineInSlot(state, gym.id, slot.id, line.id)) return fail('already_owned');
  const level = levelForXp(state.xp);
  if (level < line.unlockLevel) return fail('line_locked');
  if (!tierAllowed(QUALITIES[line.startQuality], gym, level)) return fail('quality_locked');
  const price = installPrice(line);
  if (state.coins < price) return fail('insufficient_coins');
  const machine: OwnedMachine = {
    gymId: gym.id, slotId: slot.id, lineId: line.id, quality: line.startQuality,
    installed: true, broughtFromSlotId: null,
  };
  return succeed(state, {
    ...state,
    coins: state.coins - price,
    machines: [...storeInstalled(state.machines, gym.id, slot.id), machine],
  });
}

function bringOver(state: GameState, a: Extract<Action, { type: 'bring_over' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym } = unlocked;
  const slot = slotOf(gym, a.slotId);
  if (!slot) return fail('unknown_slot');
  const source = previousGym(gym.id);
  const sourceSlot = source ? slotOf(source, a.fromSlotId) : undefined;
  const original = source && sourceSlot ? installedIn(state, source.id, sourceSlot.id) : undefined;
  if (!original) return fail('nothing_to_bring');
  const line = getLine(original.lineId);
  if (!line) return fail('unknown_line');
  if (!lineFitsSlot(line, slot)) return fail('category_mismatch');
  const alreadyBrought = state.machines.some(m =>
    m.gymId === gym.id && m.broughtFromSlotId === original.slotId && m.lineId === original.lineId);
  if (alreadyBrought) return fail('already_brought');
  if (ownsLineInSlot(state, gym.id, slot.id, line.id)) return fail('already_owned');
  const copy: OwnedMachine = {
    gymId: gym.id, slotId: slot.id, lineId: line.id, quality: original.quality,
    installed: true, broughtFromSlotId: original.slotId,
  };
  return succeed(state, {
    ...state,
    machines: [...storeInstalled(state.machines, gym.id, slot.id), copy],
  });
}

function upgrade(state: GameState, a: Extract<Action, { type: 'upgrade' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym } = unlocked;
  const slot = slotOf(gym, a.slotId);
  if (!slot) return fail('unknown_slot');
  const machine = installedIn(state, gym.id, slot.id);
  if (!machine) return fail('slot_empty');
  const line = getLine(machine.lineId);
  if (!line) return fail('unknown_line');
  if (line.flatPrice !== null) return fail('not_upgradable');
  const tier = nextTier(machine.quality);
  if (!tier) return fail('max_quality');
  if (!tierAllowed(tier, gym, levelForXp(state.xp))) return fail('quality_locked');
  const price = upgradePrice(line, tier.quality);
  if (state.coins < price) return fail('insufficient_coins');
  return succeed(state, {
    ...state,
    coins: state.coins - price,
    machines: state.machines.map(m => (m === machine ? { ...m, quality: tier.quality } : m)),
  });
}

function swap(state: GameState, a: Extract<Action, { type: 'swap' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym } = unlocked;
  const slot = slotOf(gym, a.slotId);
  if (!slot) return fail('unknown_slot');
  const stored = machinesInSlot(state, gym.id, slot.id).find(m => !m.installed && m.lineId === a.lineId);
  if (!stored) return fail('not_owned');
  return succeed(state, {
    ...state,
    machines: storeInstalled(state.machines, gym.id, slot.id)
      .map((m, i) => (state.machines[i] === stored ? { ...m, installed: true } : m)),
  });
}

function buyStyle(state: GameState, a: Extract<Action, { type: 'buy_style' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym, progress } = unlocked;
  const style = gym.styles.find(s => s.id === a.styleId);
  if (!style) return fail('unknown_style');
  if (style.price === 0 || progress.ownedStyleIds.includes(style.id)) return fail('already_owned');
  if (state.coins < style.price) return fail('insufficient_coins');
  const applied = style.kind === 'floor' ? { floorStyleId: style.id } : { wallStyleId: style.id };
  return succeed(state, withGymProgress({ ...state, coins: state.coins - style.price }, gym.id, {
    ...progress, ...applied, ownedStyleIds: [...progress.ownedStyleIds, style.id],
  }));
}

function setStyle(state: GameState, a: Extract<Action, { type: 'set_style' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  const { gym, progress } = unlocked;
  const style = gym.styles.find(s => s.id === a.styleId);
  if (!style) return fail('unknown_style');
  if (style.price !== 0 && !progress.ownedStyleIds.includes(style.id)) return fail('not_owned');
  const applied = style.kind === 'floor' ? { floorStyleId: style.id } : { wallStyleId: style.id };
  return succeed(state, withGymProgress(state, gym.id, { ...progress, ...applied }));
}

function moveGym(state: GameState): ActionResult {
  const highest = highestUnlockedGym(state);
  const next = highest ? nextGym(highest.id) : undefined;
  if (!next) return fail('no_next_gym');
  if (levelForXp(state.xp) < next.levelGate) return fail('level_too_low');
  if (state.coins < next.moveCost) return fail('insufficient_coins');
  const moved = withGymProgress({ ...state, coins: state.coins - next.moveCost }, next.id, {
    floorStyleId: defaultStyle(next, 'floor').id,
    wallStyleId: defaultStyle(next, 'wall').id,
    ownedStyleIds: [],
  });
  return succeed(state, { ...moved, currentGymId: next.id });
}

function setCurrentGym(state: GameState, a: Extract<Action, { type: 'set_current_gym' }>): ActionResult {
  const unlocked = unlockedGym(state, a.gymId);
  if (!unlocked) return fail('gym_locked');
  return succeed(state, { ...state, currentGymId: unlocked.gym.id });
}

/** The one way game state changes. Never mutates `state`; the first failed check is the error. */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'install': return install(state, action);
    case 'bring_over': return bringOver(state, action);
    case 'upgrade': return upgrade(state, action);
    case 'swap': return swap(state, action);
    case 'buy_style': return buyStyle(state, action);
    case 'set_style': return setStyle(state, action);
    case 'move_gym': return moveGym(state);
    case 'set_current_gym': return setCurrentGym(state, action);
  }
}

function nonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Adds workout rewards. Negative or non-finite amounts count as 0. Returns a new state. */
export function addRewards(state: GameState, coins: number, xp: number): GameState {
  return { ...state, coins: state.coins + nonNegative(coins), xp: state.xp + nonNegative(xp) };
}
