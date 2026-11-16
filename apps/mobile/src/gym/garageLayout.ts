/**
 * Where each Garage slot's pin sits on the gym picture, in percent of the
 * picture's width (x) and height (y). Positions from the design; they belong to
 * the placeholder picture and change with the real art in milestone 5.
 */
export const GARAGE_PINS: Record<string, { x: number; y: number }> = {
  'garage.free_weights.1': { x: 30, y: 47 },
  'garage.press.1': { x: 50, y: 53 },
  'garage.rack.1': { x: 67, y: 43 },
  'garage.bench.1': { x: 34, y: 67 },
  'garage.cardio.1': { x: 64, y: 69 },
};
