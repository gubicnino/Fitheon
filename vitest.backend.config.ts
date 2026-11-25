import { defineConfig } from 'vitest/config';

// Backend tests need the local Supabase stack (`npm run db:start`), so `npm test` never runs them.
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
