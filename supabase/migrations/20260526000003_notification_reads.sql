-- Ensure admin_notifications exists with correct schema (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
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

DROP POLICY IF EXISTS "Admins can manage admin_notifications" ON public.admin_notifications;
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

-- Allow users to read notifications broadcast to everyone or sent specifically to them
DROP POLICY IF EXISTS "Users can read their notifications" ON public.admin_notifications;
CREATE POLICY "Users can read their notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (
    target IN ('all', 'active')
    OR target = auth.uid()::text
  );

-- Per-user read/dismiss tracking
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reads" ON public.notification_reads;
CREATE POLICY "Users manage own reads"
  ON public.notification_reads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all reads" ON public.notification_reads;
CREATE POLICY "Admins view all reads"
  ON public.notification_reads
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('admin', 'super_admin')
  );

-- Trigger: increment read_count when a user dismisses a notification
CREATE OR REPLACE FUNCTION public.handle_notification_read()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.admin_notifications
  SET read_count = read_count + 1
  WHERE id = NEW.notification_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_read ON public.notification_reads;
CREATE TRIGGER on_notification_read
  AFTER INSERT ON public.notification_reads
  FOR EACH ROW EXECUTE FUNCTION public.handle_notification_read();
