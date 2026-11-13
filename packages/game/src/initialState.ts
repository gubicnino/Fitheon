import { STARTER, defaultStyle, getGym, getLine } from '@fitheon/catalog';
import type { GameState } from './types';

/** A new player: no coins, no XP, standing in the Garage with the free starter machine. */
export function initialState(): GameState {
  const gym = getGym(STARTER.gymId);
  const line = getLine(STARTER.lineId);
  if (!gym || !line) throw new Error('catalog: starter gym or line is missing');
  return {
    coins: 0,
    xp: 0,
    currentGymId: gym.id,
    gyms: {
      [gym.id]: {
        floorStyleId: defaultStyle(gym, 'floor').id,
        wallStyleId: defaultStyle(gym, 'wall').id,
        ownedStyleIds: [],
      },
    },
    machines: [{
      gymId: gym.id, slotId: STARTER.slotId, lineId: line.id, quality: line.startQuality,
      installed: true, broughtFromSlotId: null,
    }],
  };
}
