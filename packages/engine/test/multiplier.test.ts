import { expect, test } from 'vitest';
import { intensityBand, multiplierFor, typeBase } from '@fitheon/engine';

test.each([
  ['TraditionalStrengthTraining', 1.25], ['FunctionalStrengthTraining', 1.25],
  ['CoreTraining', 1.25], ['HighIntensityIntervalTraining', 1.25], ['CrossTraining', 1.25],
  ['Running', 1.25], ['Rowing', 1.25], ['Swimming', 1.25],
  ['Cycling', 1.0], ['Hiking', 1.0], ['Elliptical', 1.0], ['SomethingNew', 1.0],
  ['Walking', 0.75], ['Yoga', 0.75], ['Pilates', 0.75], ['Flexibility', 0.75], ['MindAndBody', 0.75],
])('typeBase(%s) = %d', (type, base) => expect(typeBase(type)).toBe(base));

test('typeBase ignores inherited object keys', () => {
  expect(typeBase('constructor')).toBe(1.0);
  expect(typeBase('__proto__')).toBe(1.0);
});

test.each([
  [2.99, 0.75], [3, 1.0], [5.99, 1.0], [6, 1.25], [7.99, 1.25], [8, 1.5], [12, 1.5],
])('intensityBand(%d) = %d', (mets, band) => expect(intensityBand(mets)).toBe(band));

test('no band without usable METs', () => {
  expect(intensityBand(null)).toBeNull();
  expect(intensityBand(NaN)).toBeNull();
  expect(intensityBand(0)).toBeNull();
  expect(intensityBand(-1)).toBeNull();
  expect(intensityBand(Infinity)).toBeNull();
});

test('intensity only ever adds', () => {
  expect(multiplierFor('TraditionalStrengthTraining', 2.88)).toBe(1.25);
  expect(multiplierFor('Walking', 4.28)).toBe(1.0);
  expect(multiplierFor('Walking', 8.77)).toBe(1.5);
  expect(multiplierFor('Walking', null)).toBe(0.75);
  expect(multiplierFor('Yoga', 9)).toBe(1.5);
  expect(multiplierFor('Running', null)).toBe(1.25);
});
