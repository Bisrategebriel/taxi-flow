-- Admin-visible chat session metadata (status tracking + manual reply support)

CREATE TABLE public.chat_sessions (
  session_id UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chat_sessions"
  ON public.chat_sessions
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can read own chat_sessions"
  ON public.chat_sessions
  FOR SELECT
  USING (user_id = auth.uid());
