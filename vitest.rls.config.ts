import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local so NEXT_PUBLIC_SUPABASE_* vars are available in the node test environment
function loadEnvLocal(): Record<string, string> {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const localEnv = loadEnvLocal();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rls.test.ts'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: localEnv['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localEnv['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
    },
  },
});
