import { LEVEL_XP_BASE, LEVEL_XP_CAP, LEVEL_XP_STEP } from './constants';

/** The first level whose step to the next level is the capped amount. */
const CAP_LEVEL = Math.ceil((LEVEL_XP_CAP - LEVEL_XP_BASE) / LEVEL_XP_STEP);

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.min(LEVEL_XP_BASE + LEVEL_XP_STEP * level, LEVEL_XP_CAP);
}

/** Total XP at which `level` is reached. Level 1 is 0. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  const rising = Math.min(level, CAP_LEVEL);
  for (let n = 1; n < rising; n++) total += xpToNext(n);
  if (level > CAP_LEVEL) total += (level - CAP_LEVEL) * LEVEL_XP_CAP;
  return total;
}

const CAP_LEVEL_XP = totalXpForLevel(CAP_LEVEL);

export function levelForXp(xp: number): number {
  if (!(xp > 0)) return 1;
  if (xp >= CAP_LEVEL_XP) return CAP_LEVEL + Math.floor((xp - CAP_LEVEL_XP) / LEVEL_XP_CAP);
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  return level;
}
