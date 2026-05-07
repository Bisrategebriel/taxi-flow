-- TaxiFlow local dev seed data
-- Runs automatically after migrations on `supabase db reset`
-- DO NOT use these credentials in production

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: auth.users (four test accounts)
-- ─────────────────────────────────────────────────────────────────────────────
-- Fixed UUIDs so data stays stable across db resets:
--   Super Admin : 11111111-1111-1111-1111-111111111111  superadmin@taxiflow.test / Admin1234!
--   Admin       : 22222222-2222-2222-2222-222222222222  admin@taxiflow.test      / Admin1234!
--   Alice (user): 33333333-3333-3333-3333-333333333333  alice@taxiflow.test      / User1234!
--   Bob   (user): 44444444-4444-4444-4444-444444444444  bob@taxiflow.test        / User1234!
--
-- NOTE: confirmation_token, recovery_token, email_change, email_change_token_new
-- must be '' (empty string) not NULL — GoTrue fails to scan NULL for those columns.

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'superadmin@taxiflow.test',
  crypt('Admin1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin"}',
  false, now(), now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'admin@taxiflow.test',
  crypt('Admin1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  false, now(), now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'alice@taxiflow.test',
  crypt('User1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Alice Johnson"}',
  false, now(), now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated', 'authenticated',
  'bob@taxiflow.test',
  crypt('User1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Bob Smith"}',
  false, now(), now(),
  '', '', '', ''
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: auth.identities (required for email login to work)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"superadmin@taxiflow.test"}',
  'email', 'superadmin@taxiflow.test',
  now(), now(), now()
),
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"admin@taxiflow.test"}',
  'email', 'admin@taxiflow.test',
  now(), now(), now()
),
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '{"sub":"33333333-3333-3333-3333-333333333333","email":"alice@taxiflow.test"}',
  'email', 'alice@taxiflow.test',
  now(), now(), now()
),
(
  '44444444-4444-4444-4444-444444444444',
  '44444444-4444-4444-4444-444444444444',
  '{"sub":"44444444-4444-4444-4444-444444444444","email":"bob@taxiflow.test"}',
  'email', 'bob@taxiflow.test',
  now(), now(), now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: promote admin roles
-- handle_new_user trigger already created profiles with role='user' above
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles SET role = 'super_admin' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'admin'       WHERE id = '22222222-2222-2222-2222-222222222222';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: terminals (5 terminals in Addis Ababa)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.terminals (id, name, address, city, lat, lng) VALUES
  ('aaaa0000-0000-0000-0000-000000000001', 'Merkato Terminal',   'Merkato',    'Addis Ababa',  9.0178, 38.7441),
  ('aaaa0000-0000-0000-0000-000000000002', 'Piassa Terminal',    'Piassa',     'Addis Ababa',  9.0350, 38.7469),
  ('aaaa0000-0000-0000-0000-000000000003', 'Megenagna Terminal', 'Megenagna',  'Addis Ababa',  9.0225, 38.7996),
  ('aaaa0000-0000-0000-0000-000000000004', 'Kaliti Terminal',    'Kaliti',     'Addis Ababa',  8.9581, 38.7571),
  ('aaaa0000-0000-0000-0000-000000000005', 'Saris Terminal',     'Saris',      'Addis Ababa',  8.9855, 38.7241);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: routes (3 routes)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.routes (id, name, start_terminal_id, end_terminal_id) VALUES
  ('bbbb0000-0000-0000-0000-000000000001', 'Merkato — Megenagna', 'aaaa0000-0000-0000-0000-000000000001', 'aaaa0000-0000-0000-0000-000000000003'),
  ('bbbb0000-0000-0000-0000-000000000002', 'Piassa — Kaliti',     'aaaa0000-0000-0000-0000-000000000002', 'aaaa0000-0000-0000-0000-000000000004'),
  ('bbbb0000-0000-0000-0000-000000000003', 'Saris — Megenagna',   'aaaa0000-0000-0000-0000-000000000005', 'aaaa0000-0000-0000-0000-000000000003');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: fares (one per route)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.fares (route_id, amount, currency) VALUES
  ('bbbb0000-0000-0000-0000-000000000001', 2.50, 'USD'),
  ('bbbb0000-0000-0000-0000-000000000002', 3.00, 'USD'),
  ('bbbb0000-0000-0000-0000-000000000003', 2.00, 'USD');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: distances (both directions for each route pair)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.distances (from_terminal_id, to_terminal_id, distance_km, duration_minutes) VALUES
  ('aaaa0000-0000-0000-0000-000000000001', 'aaaa0000-0000-0000-0000-000000000003',  8.5, 25),
  ('aaaa0000-0000-0000-0000-000000000003', 'aaaa0000-0000-0000-0000-000000000001',  8.5, 25),
  ('aaaa0000-0000-0000-0000-000000000002', 'aaaa0000-0000-0000-0000-000000000004', 12.0, 35),
  ('aaaa0000-0000-0000-0000-000000000004', 'aaaa0000-0000-0000-0000-000000000002', 12.0, 35),
  ('aaaa0000-0000-0000-0000-000000000005', 'aaaa0000-0000-0000-0000-000000000003',  6.5, 20),
  ('aaaa0000-0000-0000-0000-000000000003', 'aaaa0000-0000-0000-0000-000000000005',  6.5, 20);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: system_settings defaults
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai_chat_enabled',        'true',  'Enable AI chatbot for all users'),
  ('registration_enabled',   'true',  'Allow new user registrations'),
  ('login_enabled',          'true',  'Allow user logins'),
  ('maintenance_mode',       'false', 'Show maintenance page to non-admin users'),
  ('share_tracking_enabled', 'true',  'Allow users to share trip tracking links'),
  ('announcement',           'null',  'Broadcast announcement to all users (null = none)');
