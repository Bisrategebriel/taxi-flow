-- Seed default values for admin-configurable platform settings.
-- ON CONFLICT DO NOTHING preserves any values already set by a previous run.

INSERT INTO public.system_settings (key, value, description) VALUES
  -- General
  ('platform_name',              '"TaxiFlow"',                                              'Public platform name'),
  ('support_email',              '"support@taxiflow.gh"',                                   'Admin support contact email'),
  ('max_route_distance_km',      '150',                                                     'Maximum allowed route distance in km'),

  -- Feature toggles (new keys; registration_enabled / ai_chat_enabled / share_tracking_enabled / maintenance_mode already exist)
  ('feature_live_gps',           'true',                                                    'Enable real-time trip location tracking'),
  ('feature_mobile_money',       'true',                                                    'Accept mobile money transactions'),
  ('feature_card_payments',      'true',                                                    'Accept debit/credit card payments'),
  ('feature_push_notifications', 'false',                                                   'Send push notifications to mobile users'),
  ('feature_usage_analytics',    'true',                                                    'Collect anonymized usage data for improvements'),

  -- Security
  ('security_2fa_admin',         'true',                                                    'Require 2FA for all admin logins'),
  ('security_session_timeout',   'true',                                                    'Auto-logout inactive admin sessions after 30 minutes'),
  ('security_ip_allowlist',      'false',                                                   'Restrict admin access to approved IP addresses'),

  -- Landing page
  ('landing_hero_headline',      '"Navigate the city with confidence"',                     'Landing page hero headline'),
  ('landing_hero_subtitle',      '"TaxiFlow maps Addis Ababa''s shared taxi network. Search routes, check live fares, share your trip, and pay — all from one app."', 'Landing page hero subtitle'),
  ('landing_cta_text',           '"Get Started — It''s Free"',                              'Hero primary call-to-action button label'),
  ('landing_show_features',      'true',                                                    'Show features section on landing page'),
  ('landing_show_how_it_works',  'true',                                                    'Show how-it-works section on landing page'),
  ('landing_contact_phone',      '"+251 000 000 0000"',                                     'Contact phone shown on landing page'),
  ('landing_contact_address',    '"Addis Ababa, Ethiopia"',                                 'Contact address shown on landing page')
ON CONFLICT (key) DO NOTHING;
