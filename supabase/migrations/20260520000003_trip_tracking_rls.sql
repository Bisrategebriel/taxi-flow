-- FR-ST-05..17, NFR-SE-05,06
-- Phase 6: add anon read access to trips and trip_locations via share tokens
-- Note: share_tokens_public_select, share_tokens_owner_insert, and
-- trip_locations_insert already exist from the initial schema migration.

-- trips: anon users can read a trip if a valid (non-expired) share token exists
CREATE POLICY "trips_public_read_via_share_token"
  ON public.trips FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.share_tokens st
      WHERE st.trip_id = id
        AND (st.expires_at IS NULL OR st.expires_at > now())
    )
  );

-- trip_locations: anon users can read locations for trips with a valid share token
CREATE POLICY "trip_locations_public_read_via_share_token"
  ON public.trip_locations FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.share_tokens st
      WHERE st.trip_id = trip_id
        AND (st.expires_at IS NULL OR st.expires_at > now())
    )
  );
