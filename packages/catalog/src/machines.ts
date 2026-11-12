import type { Category, MachineLine, Quality, SizeClass } from './types';

function machine(
  id: string, name: string, categories: Category[],
  startQuality: Quality, unlockLevel: number, sizeClass: SizeClass,
): MachineLine {
  return { id, name, categories, startQuality, unlockLevel, sizeClass, flatPrice: null };
}

const DECOR_UNLOCK_LEVEL = 6;

function decor(id: string, name: string, flatPrice: number): MachineLine {
  return {
    id, name, categories: ['decor'], startQuality: 1,
    unlockLevel: DECOR_UNLOCK_LEVEL, sizeClass: 1, flatPrice,
  };
}

/** Spec 4.4. Order is the order options are offered in. */
export const MACHINE_LINES: MachineLine[] = [
  machine('dumbbell_rack', 'Dumbbell rack', ['free_weights'], 1, 1, 1),
  machine('flat_bench', 'Flat bench', ['bench'], 1, 1, 0.5),
  machine('bench_press', 'Bench press', ['press'], 1, 1, 1),
  machine('exercise_bike', 'Exercise bike', ['cardio'], 1, 2, 1),
  machine('kettlebell_rack', 'Kettlebell rack', ['free_weights'], 1, 2, 0.5),
  machine('squat_rack', 'Squat rack', ['rack'], 1, 3, 1),
  machine('pull_station', 'Pull-up station', ['pull'], 1, 4, 1),
  machine('adjustable_bench', 'Adjustable bench', ['bench'], 2, 8, 0.5),
  machine('treadmill', 'Treadmill', ['cardio'], 2, 9, 1.5),
  machine('pec_deck', 'Pec deck', ['machine'], 2, 10, 1.5),
  machine('rowing_machine', 'Rowing machine', ['cardio'], 2, 11, 1),
  machine('power_rack', 'Power rack', ['rack'], 2, 12, 1.5),
  machine('cable_machine', 'Cable machine', ['machine'], 2, 13, 1.5),
  machine('smith_machine', 'Smith machine', ['press', 'rack'], 3, 20, 1.5),
  machine('multi_gym', 'Multi-gym', ['machine'], 3, 22, 1.5),
  decor('plant', 'Plant', 150),
  decor('wall_tv', 'Wall TV', 400),
  decor('sofa', 'Sofa', 500),
  decor('lockers', 'Lockers', 600),
  decor('reception_desk', 'Reception desk', 800),
];
