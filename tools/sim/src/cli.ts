import { GYMS } from '@fitheon/catalog';
import { simulate } from './simulate';
import type { ProfileName } from './simulate';

const DEFAULT_WEEKS = 52;
const TABLE_EVERY_WEEKS = 4;
const PROFILE_NAMES: ProfileName[] = ['typical', 'heavy'];

const arg = process.argv[2];
const parsed = arg === undefined ? DEFAULT_WEEKS : Number(arg);
if (!Number.isInteger(parsed) || parsed <= 0) {
  console.error(`usage: npm run simulate -- [weeks]   (a positive whole number, default ${DEFAULT_WEEKS})`);
  process.exit(1);
}
const weeks = parsed;

for (const profile of PROFILE_NAMES) {
  const result = simulate(profile, weeks);
  console.log(`\n${profile} — ${weeks} weeks`);
  for (const gym of GYMS.slice(1)) {
    const week = result.arrivalWeek[gym.id];
    console.log(`  ${gym.name}: ${week === undefined ? `not reached in ${weeks} weeks` : `week ${week}`}`);
  }
  console.table(result.weekly
    .filter(w => w.week % TABLE_EVERY_WEEKS === 0)
    .map(w => ({ week: w.week, level: w.level, gym: w.gymId, 'coins earned': w.coinsEarned, 'coins held': w.coinsHeld })));
}
