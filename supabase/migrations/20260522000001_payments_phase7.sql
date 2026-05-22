-- FR-PA-01..12, NFR-SE-07,08
-- Phase 7: Add payment_method and paid_at to existing payments table,
--           and ensure trips.status accepts 'payment_pending'/'paid' (already in schema).

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card'
    CHECK (payment_method IN ('card', 'mobile_money', 'cash')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
