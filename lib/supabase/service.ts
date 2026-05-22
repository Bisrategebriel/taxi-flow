// Server-only — never import this in client components.
// Uses the service role key which bypasses RLS.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const createServiceClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
