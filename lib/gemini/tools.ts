// FR-AI-02 — Gemini function declarations and server-side executors
import type { FunctionDeclaration } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Declarations (sent to Gemini) ───────────────────────────────────────────

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_terminals",
    description: "Returns all active taxi terminals with their names, cities, and coordinates.",
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_routes",
    description:
      "Returns active routes. Optionally filter by a terminal name to find routes that start or end there.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        terminal_name: {
          type: SchemaType.STRING,
          description: "Optional terminal name to filter routes by (partial match, case-insensitive).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_fare",
    description: "Returns the fare for travelling between two specific terminals.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from_terminal: {
          type: SchemaType.STRING,
          description: "Name of the departure terminal (partial match accepted).",
        },
        to_terminal: {
          type: SchemaType.STRING,
          description: "Name of the destination terminal (partial match accepted).",
        },
      },
      required: ["from_terminal", "to_terminal"],
    },
  },
  {
    name: "get_route_details",
    description:
      "Returns details for a route between two terminals: distance, estimated duration, intermediate stops, and fare.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from_terminal: {
          type: SchemaType.STRING,
          description: "Name of the departure terminal (partial match accepted).",
        },
        to_terminal: {
          type: SchemaType.STRING,
          description: "Name of the destination terminal (partial match accepted).",
        },
      },
      required: ["from_terminal", "to_terminal"],
    },
  },
];

// ─── Executors (run on the server inside the Route Handler) ──────────────────

async function getTerminals(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("terminals")
    .select("id, name, city, lat, lng")
    .eq("is_active", true)
    .order("name");
  if (error) return { error: error.message };
  return { terminals: data ?? [] };
}

async function getRoutes(
  args: Record<string, unknown>,
  supabase: SupabaseClient
) {
  const terminalName = (args.terminal_name as string | undefined)?.toLowerCase();
  const query = supabase
    .from("routes")
    .select(
      `id, name, start_terminal_id, end_terminal_id,
       start:terminals!routes_start_terminal_id_fkey(name),
       end:terminals!routes_end_terminal_id_fkey(name),
       fares(amount, currency, effective_from)`
    )
    .eq("is_active", true);

  const { data, error } = await query;
  if (error) return { error: error.message };

  let routes = data ?? [];
  if (terminalName) {
    routes = routes.filter((r) => {
      const start = (r.start as unknown as { name: string } | null)?.name?.toLowerCase() ?? "";
      const end = (r.end as unknown as { name: string } | null)?.name?.toLowerCase() ?? "";
      return start.includes(terminalName) || end.includes(terminalName);
    });
  }

  return {
    routes: routes.map((r) => {
      const fares = (r.fares as { amount: number; currency: string; effective_from: string }[]) ?? [];
      const latestFare = fares.sort(
        (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
      )[0] ?? null;
      return {
        name: r.name,
        from: (r.start as unknown as { name: string } | null)?.name,
        to: (r.end as unknown as { name: string } | null)?.name,
        fare: latestFare ? `${Number(latestFare.amount).toFixed(2)} ${latestFare.currency}` : "unknown",
      };
    }),
  };
}

async function getFare(args: Record<string, unknown>, supabase: SupabaseClient) {
  const fromName = (args.from_terminal as string).toLowerCase();
  const toName = (args.to_terminal as string).toLowerCase();

  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name")
    .eq("is_active", true);

  const from = (terminals ?? []).find((t) => t.name.toLowerCase().includes(fromName));
  const to = (terminals ?? []).find((t) => t.name.toLowerCase().includes(toName));

  if (!from) return { found: false, message: `No terminal matching "${args.from_terminal}" found.` };
  if (!to) return { found: false, message: `No terminal matching "${args.to_terminal}" found.` };

  const { data: routes } = await supabase
    .from("routes")
    .select("id, fares(amount, currency, effective_from)")
    .eq("is_active", true)
    .or(
      `and(start_terminal_id.eq.${from.id},end_terminal_id.eq.${to.id}),` +
        `and(start_terminal_id.eq.${to.id},end_terminal_id.eq.${from.id})`
    );

  if (!routes || routes.length === 0) {
    return { found: false, message: `No direct route found between ${from.name} and ${to.name}.` };
  }

  const fares = (routes[0].fares as { amount: number; currency: string; effective_from: string }[]) ?? [];
  const latest = fares.sort(
    (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  )[0];

  if (!latest) return { found: false, message: "Route exists but no fare is set." };

  return {
    found: true,
    from: from.name,
    to: to.name,
    amount: Number(latest.amount).toFixed(2),
    currency: latest.currency,
  };
}

async function getRouteDetails(args: Record<string, unknown>, supabase: SupabaseClient) {
  const fromName = (args.from_terminal as string).toLowerCase();
  const toName = (args.to_terminal as string).toLowerCase();

  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, lat, lng")
    .eq("is_active", true);

  const from = (terminals ?? []).find((t) => t.name.toLowerCase().includes(fromName));
  const to = (terminals ?? []).find((t) => t.name.toLowerCase().includes(toName));

  if (!from) return { found: false, message: `No terminal matching "${args.from_terminal}" found.` };
  if (!to) return { found: false, message: `No terminal matching "${args.to_terminal}" found.` };

  const { data: routes } = await supabase
    .from("routes")
    .select(
      `id, name, intermediate_stops,
       fares(amount, currency, effective_from)`
    )
    .eq("is_active", true)
    .or(
      `and(start_terminal_id.eq.${from.id},end_terminal_id.eq.${to.id}),` +
        `and(start_terminal_id.eq.${to.id},end_terminal_id.eq.${from.id})`
    );

  if (!routes || routes.length === 0) {
    return { found: false, message: `No direct route found between ${from.name} and ${to.name}.` };
  }

  const route = routes[0];
  const fares = (route.fares as { amount: number; currency: string; effective_from: string }[]) ?? [];
  const latestFare = fares.sort(
    (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  )[0] ?? null;

  // Distance from distances table
  const { data: distData } = await supabase
    .from("distances")
    .select("distance_km, duration_minutes")
    .or(
      `and(from_terminal_id.eq.${from.id},to_terminal_id.eq.${to.id}),` +
        `and(from_terminal_id.eq.${to.id},to_terminal_id.eq.${from.id})`
    )
    .limit(1)
    .maybeSingle();

  // Intermediate stop names
  const stopIds: string[] = route.intermediate_stops ?? [];
  let stopNames: string[] = [];
  if (stopIds.length > 0) {
    const { data: stops } = await supabase
      .from("terminals")
      .select("id, name")
      .in("id", stopIds);
    stopNames = stopIds.flatMap((id) => {
      const t = (stops ?? []).find((s) => s.id === id);
      return t ? [t.name] : [];
    });
  }

  return {
    found: true,
    route: route.name,
    from: from.name,
    to: to.name,
    intermediate_stops: stopNames,
    distance_km: distData?.distance_km ?? null,
    duration_minutes: distData?.duration_minutes ?? null,
    fare: latestFare ? `${Number(latestFare.amount).toFixed(2)} ${latestFare.currency}` : "unknown",
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_terminals":
      return getTerminals(supabase) as Promise<Record<string, unknown>>;
    case "get_routes":
      return getRoutes(args, supabase) as Promise<Record<string, unknown>>;
    case "get_fare":
      return getFare(args, supabase) as Promise<Record<string, unknown>>;
    case "get_route_details":
      return getRouteDetails(args, supabase) as Promise<Record<string, unknown>>;
    default:
      return { error: `Unknown function: ${name}` };
  }
}
