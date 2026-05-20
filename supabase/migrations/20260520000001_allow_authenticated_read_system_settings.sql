-- Allow any authenticated user to read system_settings (needed for feature toggles like ai_chat_enabled)
CREATE POLICY "system_settings_authenticated_select"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);
