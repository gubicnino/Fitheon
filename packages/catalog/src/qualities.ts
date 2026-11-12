import type { Quality, QualityTier } from './types';

export const MAX_QUALITY: Quality = 4;

/** Spec 4.3. `playerLevel` is the level needed to own that tier; `stepPrice` the cost of reaching it. */
export const QUALITIES: Record<Quality, QualityTier> = {
  1: { quality: 1, name: 'Basic', playerLevel: 1, stepPrice: 100 },
  2: { quality: 2, name: 'Standard', playerLevel: 7, stepPrice: 300 },
  3: { quality: 3, name: 'Commercial', playerLevel: 18, stepPrice: 800 },
  4: { quality: 4, name: 'Elite', playerLevel: 32, stepPrice: 1500 },
};
