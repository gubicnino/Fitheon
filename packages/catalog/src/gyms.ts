import type { Category, Gym, GymId, Quality, Slot, Style, StyleKind } from './types';

/** The order slots are generated in, and the zone each category belongs to. */
const CATEGORY_ZONES: [Category, string][] = [
  ['free_weights', 'free_weights'],
  ['bench', 'free_weights'],
  ['press', 'racks'],
  ['rack', 'racks'],
  ['pull', 'racks'],
  ['cardio', 'cardio'],
  ['machine', 'machines'],
  ['decor', 'lounge'],
];

type SlotCounts = Partial<Record<Category, number>>;
/** Slots that accept more than their own category, by slot id. */
type AcceptOverrides = Record<string, Category[]>;

function buildSlots(gymId: GymId, counts: SlotCounts, overrides: AcceptOverrides = {}): Slot[] {
  const slots: Slot[] = [];
  for (const [category, zone] of CATEGORY_ZONES) {
    const count = counts[category] ?? 0;
    for (let n = 1; n <= count; n++) {
      const id = `${gymId}.${category}.${n}`;
      slots.push({ id, zone, accepts: overrides[id] ?? [category] });
    }
  }
  return slots;
}

type StyleSpec = [key: string, name: string, price: number];

/** The first style of each kind is the default and must cost 0. */
function buildStyles(gymId: GymId, floors: StyleSpec[], walls: StyleSpec[]): Style[] {
  const of = (kind: StyleKind, specs: StyleSpec[]): Style[] =>
    specs.map(([key, name, price]) => ({ id: `${gymId}.${kind}.${key}`, kind, name, price }));
  return [...of('floor', floors), ...of('wall', walls)];
}

function gym(
  id: GymId, name: string, order: number, levelGate: number, moveCost: number, qualityCap: Quality,
  slots: Slot[], styles: Style[],
): Gym {
  return { id, name, order, levelGate, moveCost, qualityCap, slots, styles };
}

/** Spec 4.2, in order. */
export const GYMS: Gym[] = [
  gym('garage', 'Garage', 1, 1, 0, 1,
    buildSlots('garage',
      { free_weights: 1, bench: 1, press: 1, rack: 1, cardio: 1 },
      { 'garage.rack.1': ['rack', 'pull'] }),
    buildStyles('garage',
      [['concrete', 'Concrete', 0], ['rubber_mat', 'Rubber mat', 300], ['plywood', 'Plywood', 400]],
      [['bare_block', 'Bare block', 0], ['painted', 'Painted', 300], ['pegboard', 'Pegboard', 400]])),
  gym('neighbourhood', 'Neighbourhood gym', 2, 6, 500, 2,
    buildSlots('neighbourhood',
      { free_weights: 1, bench: 1, press: 1, rack: 1, pull: 1, cardio: 2, machine: 1, decor: 1 }),
    buildStyles('neighbourhood',
      [['rubber', 'Rubber', 0], ['wood', 'Wood', 500], ['checker_tile', 'Checker tile', 700]],
      [['white', 'White', 0], ['brick', 'Brick', 500], ['mirror', 'Mirror', 700]])),
  gym('commercial', 'Commercial gym', 3, 16, 2000, 3,
    buildSlots('commercial',
      { free_weights: 2, bench: 2, press: 1, rack: 2, pull: 1, cardio: 3, machine: 2, decor: 2 }),
    buildStyles('commercial',
      [['grey_rubber', 'Grey rubber', 0], ['oak', 'Oak', 800], ['turf', 'Turf', 1000]],
      [['light_grey', 'Light grey', 0], ['brand_colour', 'Brand colour', 800], ['mirror_wall', 'Mirror wall', 1000]])),
  gym('elite', 'Elite club', 4, 30, 5000, 4,
    buildSlots('elite',
      { free_weights: 2, bench: 2, press: 2, rack: 2, pull: 2, cardio: 4, machine: 4, decor: 4 }),
    buildStyles('elite',
      [['dark_rubber', 'Dark rubber', 0], ['walnut', 'Walnut', 1200], ['marble', 'Marble', 1500]],
      [['slat_panel', 'Slat panel', 0], ['black_glass', 'Black glass', 1200], ['neon', 'Neon', 1500]])),
];

/** The free machine every player starts with. */
export const STARTER = {
  gymId: 'garage', slotId: 'garage.free_weights.1', lineId: 'dumbbell_rack',
} as const;
