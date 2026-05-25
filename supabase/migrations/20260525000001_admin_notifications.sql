-- Admin-sent push notifications
-- Stores notifications composed and sent by admins to users.

CREATE TABLE public.admin_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
              CHECK (type IN ('promotional', 'info', 'warning', 'success', 'decline', 'alert', 'reminder')),
  target      TEXT NOT NULL DEFAULT 'all',
  sent_count  INTEGER NOT NULL DEFAULT 0,
  read_count  INTEGER NOT NULL DEFAULT 0,
  sent_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_notifications"
  ON public.admin_notifications
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('admin', 'super_admin')
  );
