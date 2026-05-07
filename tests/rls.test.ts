// @vitest-environment node
// RLS integration tests — require local Supabase to be running (`supabase start`)
// Run with: pnpm test:rls   (excluded from the default `pnpm test` CI run)
//
// NFR-SE-01, NFR-SE-03

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll } from 'vitest';
import type { Database } from '../types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Seeded UUIDs from seed.sql
const ALICE_ID = '33333333-3333-3333-3333-333333333333';
const BOB_ID = '44444444-4444-4444-4444-444444444444';

function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function authedClient(email: string, password: string) {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anon access
// ─────────────────────────────────────────────────────────────────────────────

describe('RLS — anon access', () => {
  let anon: ReturnType<typeof anonClient>;

  beforeAll(() => {
    anon = anonClient();
  });

  it('can SELECT active terminals', async () => {
    const { data, error } = await anon.from('terminals').select('id');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('can SELECT active routes', async () => {
    const { data, error } = await anon.from('routes').select('id');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('can SELECT fares', async () => {
    const { data, error } = await anon.from('fares').select('id');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('cannot SELECT profiles', async () => {
    const { data, error } = await anon.from('profiles').select('id');
    // RLS should return empty (permissive policy returns no rows for anon)
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('cannot SELECT trips', async () => {
    const { data, error } = await anon.from('trips').select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('cannot SELECT system_settings', async () => {
    const { data, error } = await anon.from('system_settings').select('key');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Alice (user role)
// ─────────────────────────────────────────────────────────────────────────────

describe('RLS — Alice (user role)', () => {
  let alice: Awaited<ReturnType<typeof authedClient>>;
  let aliceTripId: string;

  beforeAll(async () => {
    alice = await authedClient('alice@taxiflow.test', 'User1234!');
  });

  it('can read her own profile', async () => {
    const { data, error } = await alice
      .from('profiles')
      .select('id, role')
      .eq('id', ALICE_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].role).toBe('user');
  });

  it('cannot read Bob\'s profile', async () => {
    const { data, error } = await alice
      .from('profiles')
      .select('id')
      .eq('id', BOB_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('can INSERT a trip for herself', async () => {
    const { data, error } = await alice
      .from('trips')
      .insert({ user_id: ALICE_ID, status: 'active' })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data!.id).toBeTruthy();
    aliceTripId = data!.id;
  });

  it('can SELECT her own trip', async () => {
    const { data, error } = await alice
      .from('trips')
      .select('id')
      .eq('id', aliceTripId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("cannot INSERT a trip with Bob's user_id", async () => {
    const { error } = await alice
      .from('trips')
      .insert({ user_id: BOB_ID, status: 'active' });
    expect(error).not.toBeNull();
  });

  it('cannot SELECT system_settings', async () => {
    const { data, error } = await alice.from('system_settings').select('key');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

describe('RLS — Admin (admin role)', () => {
  let admin: Awaited<ReturnType<typeof authedClient>>;

  beforeAll(async () => {
    admin = await authedClient('admin@taxiflow.test', 'Admin1234!');
  });

  it('can SELECT all profiles', async () => {
    const { data, error } = await admin.from('profiles').select('id');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(4);
  });

  it("can SELECT Alice's trips", async () => {
    const { data, error } = await admin
      .from('trips')
      .select('id')
      .eq('user_id', ALICE_ID);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('can SELECT system_settings', async () => {
    const { data, error } = await admin.from('system_settings').select('key');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('cannot UPDATE system_settings (super_admin only)', async () => {
    // RLS silently filters the row on UPDATE — no error, but 0 rows affected
    const { data, error } = await admin
      .from('system_settings')
      .update({ value: '"true"' })
      .eq('key', 'maintenance_mode')
      .select('key');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin
// ─────────────────────────────────────────────────────────────────────────────

describe('RLS — Super Admin (super_admin role)', () => {
  let superAdmin: Awaited<ReturnType<typeof authedClient>>;

  beforeAll(async () => {
    superAdmin = await authedClient('superadmin@taxiflow.test', 'Admin1234!');
  });

  it('can SELECT system_settings', async () => {
    const { data, error } = await superAdmin.from('system_settings').select('key');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('can UPDATE a system_settings row', async () => {
    const { error } = await superAdmin
      .from('system_settings')
      .update({ value: 'false' })
      .eq('key', 'maintenance_mode');
    expect(error).toBeNull();
  });

  it('can SELECT audit_logs', async () => {
    const { data, error } = await superAdmin.from('audit_logs').select('id');
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});
