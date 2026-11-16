import type { MachineLine, Quality, SizeClass } from './types';

function machine(
  id: string, name: string, startQuality: Quality, unlockLevel: number, sizeClass: SizeClass,
): MachineLine {
  return { id, name, startQuality, unlockLevel, sizeClass, flatPrice: null };
}

const DECOR_UNLOCK_LEVEL = 6;

function decor(id: string, name: string, flatPrice: number): MachineLine {
  return { id, name, startQuality: 1, unlockLevel: DECOR_UNLOCK_LEVEL, sizeClass: 1, flatPrice };
}

/** Spec 4.4. Order is the order options are offered in. */
export const MACHINE_LINES: MachineLine[] = [
  machine('dumbbell_rack', 'Dumbbell rack', 1, 1, 1),
  machine('adjustable_bench', 'Adjustable bench', 1, 1, 0.5),
  machine('bench_press', 'Bench press', 1, 1, 1),
  machine('exercise_bike', 'Exercise bike', 1, 2, 1),
  machine('squat_rack', 'Squat rack', 1, 3, 1),
  machine('calisthenics_bar', 'Calisthenics bar', 1, 4, 1),
  machine('treadmill', 'Treadmill', 2, 7, 1.5),
  machine('leg_extension', 'Leg extension', 2, 8, 1),
  machine('leg_curl', 'Leg curl', 2, 9, 1),
  machine('pec_deck', 'Pec deck', 2, 10, 1.5),
  machine('rowing_machine', 'Rowing machine', 2, 11, 1),
  machine('cable_machine', 'Cable machine', 2, 12, 1.5),
  machine('leg_press', 'Leg press', 2, 13, 1.5),
  machine('smith_machine', 'Smith machine', 2, 14, 1.5),
  machine('hack_squat', 'Hack squat', 2, 15, 1.5),
  machine('stair_master', 'Stair master', 3, 18, 1.5),
  machine('pendulum_squat', 'Pendulum squat', 3, 20, 1.5),
  decor('plant', 'Plant', 150),
  decor('wall_tv', 'Wall TV', 400),
  decor('sofa', 'Sofa', 500),
  decor('lockers', 'Lockers', 600),
  decor('reception_desk', 'Reception desk', 800),
];
