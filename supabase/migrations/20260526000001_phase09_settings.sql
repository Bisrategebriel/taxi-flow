-- FR-AS-04: add session_timeout_minutes setting if not present
INSERT INTO public.system_settings (key, value, description)
VALUES ('session_timeout_minutes', '0', 'Session inactivity timeout in minutes (0 = disabled)')
ON CONFLICT (key) DO NOTHING;
