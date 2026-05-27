-- Profile extensions: emergency contact, saved places, preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS auto_share_location     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_address            TEXT,
  ADD COLUMN IF NOT EXISTS work_address            TEXT,
  ADD COLUMN IF NOT EXISTS custom_places           JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS language_pref           TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS notif_trip_updates      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_payment_receipts  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_promotions        BOOLEAN NOT NULL DEFAULT false;

-- Allow users to update their own profile (all new columns)
-- The existing profiles_update_own policy covers UPDATE on profiles for the owner.
-- No new RLS policies needed since the existing one allows the owner to update any column.
