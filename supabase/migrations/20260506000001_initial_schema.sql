-- FR-AU-01..06, SRS §11, NFR-SE-01,03,07
-- Phase 1: full TaxiFlow schema — tables, triggers, RLS policies

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Tables (must come before functions that reference them)
-- ─────────────────────────────────────────────────────────────────────────────

-- Table 1 — profiles (extends auth.users)
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  phone        TEXT,
  avatar_url   TEXT,
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2 — terminals
CREATE TABLE public.terminals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3 — routes
CREATE TABLE public.routes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  start_terminal_id    UUID NOT NULL REFERENCES public.terminals(id),
  end_terminal_id      UUID NOT NULL REFERENCES public.terminals(id),
  intermediate_stops   UUID[] NOT NULL DEFAULT '{}',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4 — fares
CREATE TABLE public.fares (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency       TEXT NOT NULL DEFAULT 'USD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 5 — distances
CREATE TABLE public.distances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_terminal_id UUID NOT NULL REFERENCES public.terminals(id),
  to_terminal_id   UUID NOT NULL REFERENCES public.terminals(id),
  distance_km      NUMERIC(8,2) NOT NULL CHECK (distance_km > 0),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_terminal_id, to_terminal_id)
);

-- Table 6 — trips
CREATE TABLE public.trips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  route_id          UUID REFERENCES public.routes(id),
  start_terminal_id UUID REFERENCES public.terminals(id),
  end_terminal_id   UUID REFERENCES public.terminals(id),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'cancelled', 'payment_pending', 'paid')),
  fare_amount       NUMERIC(10,2) CHECK (fare_amount >= 0),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 7 — trip_locations
CREATE TABLE public.trip_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 8 — share_tokens
CREATE TABLE public.share_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 9 — chat_logs
CREATE TABLE public.chat_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 10 — payments
CREATE TABLE public.payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                  UUID NOT NULL REFERENCES public.trips(id),
  user_id                  UUID NOT NULL REFERENCES auth.users(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount                   NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency                 TEXT NOT NULL DEFAULT 'USD',
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'waived')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 11 — system_settings
CREATE TABLE public.system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 12 — audit_logs
CREATE TABLE public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES auth.users(id),
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  TEXT,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Helper functions (profiles table now exists)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
) $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = 'super_admin'
) $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.terminals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.distances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: handle_new_user trigger  (FR-AU-02)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5: Audit log trigger  (FR-EC-03, NFR-SE-07)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_trips
  AFTER INSERT OR UPDATE OR DELETE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6: Row Level Security  (NFR-SE-01, NFR-SE-03)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fares           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- terminals
CREATE POLICY "terminals_public_select" ON public.terminals
  FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "terminals_admin_insert" ON public.terminals
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "terminals_admin_update" ON public.terminals
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "terminals_admin_delete" ON public.terminals
  FOR DELETE USING (public.is_admin());

-- routes
CREATE POLICY "routes_public_select" ON public.routes
  FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "routes_admin_insert" ON public.routes
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "routes_admin_update" ON public.routes
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "routes_admin_delete" ON public.routes
  FOR DELETE USING (public.is_admin());

-- fares
CREATE POLICY "fares_public_select" ON public.fares
  FOR SELECT USING (true);
CREATE POLICY "fares_admin_insert" ON public.fares
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "fares_admin_update" ON public.fares
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "fares_admin_delete" ON public.fares
  FOR DELETE USING (public.is_admin());

-- distances
CREATE POLICY "distances_public_select" ON public.distances
  FOR SELECT USING (true);
CREATE POLICY "distances_admin_insert" ON public.distances
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "distances_admin_update" ON public.distances
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "distances_admin_delete" ON public.distances
  FOR DELETE USING (public.is_admin());

-- trips
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- trip_locations
CREATE POLICY "trip_locations_select" ON public.trip_locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "trip_locations_insert" ON public.trip_locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- share_tokens  (token is a UUID capability — anyone with the value may read it, NFR-SE-06)
CREATE POLICY "share_tokens_public_select" ON public.share_tokens
  FOR SELECT USING (true);
CREATE POLICY "share_tokens_owner_insert" ON public.share_tokens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  );
CREATE POLICY "share_tokens_owner_delete" ON public.share_tokens
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- chat_logs
CREATE POLICY "chat_logs_select" ON public.chat_logs
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "chat_logs_insert" ON public.chat_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_logs_admin_delete" ON public.chat_logs
  FOR DELETE USING (public.is_admin());

-- payments
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "payments_user_insert" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_admin_update" ON public.payments
  FOR UPDATE USING (public.is_admin());

-- system_settings
CREATE POLICY "system_settings_admin_select" ON public.system_settings
  FOR SELECT USING (public.is_admin());
CREATE POLICY "system_settings_super_admin_insert" ON public.system_settings
  FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "system_settings_super_admin_update" ON public.system_settings
  FOR UPDATE USING (public.is_super_admin());
CREATE POLICY "system_settings_super_admin_delete" ON public.system_settings
  FOR DELETE USING (public.is_super_admin());

-- audit_logs — super_admin read only; writes come exclusively via the trigger
CREATE POLICY "audit_logs_super_admin_select" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());
