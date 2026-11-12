import { expect, test } from 'vitest';
import { ENGINE_VERSION } from '@fitheon/engine';

test('engine package resolves by name', () => {
  expect(ENGINE_VERSION).toBe(1);
});
