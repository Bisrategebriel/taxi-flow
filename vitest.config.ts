import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // RLS tests hit the live local Supabase — run separately with `pnpm test:rls`
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/rls.test.ts'],
  },
});
