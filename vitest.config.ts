import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // RLS tests hit the live local Supabase — run separately with `pnpm test:rls`
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/rls.test.ts'],
    env: {
      STRIPE_SECRET_KEY: 'sk_test_placeholder_for_tests',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder_for_tests',
      SUPABASE_SERVICE_ROLE_KEY: 'placeholder_for_tests',
    },
  },
});
