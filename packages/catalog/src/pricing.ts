import { QUALITIES } from './qualities';
import type { MachineLine, Quality } from './types';

/** Decor has a flat price; a machine costs the step price of its starting tier, scaled by size. */
export function installPrice(line: MachineLine): number {
  if (line.flatPrice !== null) return line.flatPrice;
  return Math.round(QUALITIES[line.startQuality].stepPrice * line.sizeClass);
}

/** The price of raising a machine of this line to tier `to`. */
export function upgradePrice(line: MachineLine, to: Quality): number {
  return Math.round(QUALITIES[to].stepPrice * line.sizeClass);
}
