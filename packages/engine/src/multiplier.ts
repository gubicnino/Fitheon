import { DEFAULT_TYPE_BASE, INTENSITY_BANDS, TYPE_BASES } from './constants';

export function typeBase(activityType: string): number {
  return TYPE_BASES.get(activityType) ?? DEFAULT_TYPE_BASE;
}

/** The band for measured METs, or null when there is no usable measurement. */
export function intensityBand(mets: number | null): number | null {
  if (typeof mets !== 'number' || !Number.isFinite(mets) || mets <= 0) return null;
  let band: number | null = null;
  for (const entry of INTENSITY_BANDS) {
    if (mets >= entry.minMets) band = entry.band;
  }
  return band;
}

/** Intensity can only add: the higher of the type base and the band. */
export function multiplierFor(activityType: string, mets: number | null): number {
  return Math.max(typeBase(activityType), intensityBand(mets) ?? 0);
}
