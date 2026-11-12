import type { RawWorkout } from '../src/types';

/**
 * Nino's real training week, 1–8 November 2026 (spec section 3.6).
 * All METs are real. Durations with decimals are real; the others are the
 * spec's rounded minutes. Phase 2 reuses this as mock workouts.
 */
export const NOVEMBER_NOW = '2026-11-09T08:00:00Z';
export const NOVEMBER_TZ = 'Europe/Ljubljana';

const WATCH = 'com.apple.health';
const STRONG = 'com.strong.app';

type Row = [startAt: string, activityType: string, durationS: number, mets: number, source?: string, title?: string];

const ROWS: Row[] = [
  ['2026-11-01T18:33:43Z', 'TraditionalStrengthTraining', 4476.49, 3.76408, STRONG, 'Chest Triceps Rame'],
  ['2026-11-02T08:00:00Z', 'Walking', 1968, 4.28],
  ['2026-11-02T16:00:00Z', 'TraditionalStrengthTraining', 4242, 3.88],
  ['2026-11-02T18:40:00Z', 'Cycling', 456, 9.82],
  ['2026-11-03T16:00:00Z', 'TraditionalStrengthTraining', 3750, 5.62],
  ['2026-11-04T16:00:00Z', 'TraditionalStrengthTraining', 4590, 4.77],
  ['2026-11-04T18:45:31Z', 'Cycling', 500.62, 10.4568],
  ['2026-11-05T16:51:49Z', 'FunctionalStrengthTraining', 4754.97, 5.87693],
  ['2026-11-06T16:00:00Z', 'TraditionalStrengthTraining', 4453, 4.04],
  ['2026-11-06T18:30:00Z', 'Walking', 762, 8.77],
  ['2026-11-08T16:00:00Z', 'TraditionalStrengthTraining', 4350, 2.88],
  ['2026-11-08T18:46:25Z', 'Walking', 1754.40, 4.19681],
];

export const NOVEMBER_2026: RawWorkout[] = ROWS.map(
  ([startAt, activityType, durationS, mets, source = WATCH, title = null], i) => ({
    hkUuid: `nov-${String(i + 1).padStart(2, '0')}`,
    activityType,
    startAt,
    endAt: new Date(Date.parse(startAt) + Math.ceil(durationS) * 1000).toISOString(),
    durationS,
    mets,
    sourceBundle: source,
    title,
    userEntered: false,
  }),
);
