"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    throw new Error("Forbidden");
  }
}

const RouteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  start_terminal_id: z.string().uuid("Select a start terminal"),
  end_terminal_id: z.string().uuid("Select an end terminal"),
  is_active: z.coerce.boolean().default(true),
});

export type RouteFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

/* ── existing form-action mutations (kept for /new and /[id]/edit pages) ─── */

export async function createRoute(
  _prev: RouteFormState,
  formData: FormData
): Promise<RouteFormState> {
  await assertAdmin();

  const parsed = RouteSchema.safeParse({
    name: formData.get("name"),
    start_terminal_id: formData.get("start_terminal_id"),
    end_terminal_id: formData.get("end_terminal_id"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const service = createServiceClient();
  const { error } = await service.from("routes").insert({
    ...parsed.data,
    intermediate_stops: [],
  });
  if (error) return { message: error.message };

  revalidatePath("/admin/routes");
  redirect("/admin/routes");
}

export async function updateRoute(
  id: string,
  _prev: RouteFormState,
  formData: FormData
): Promise<RouteFormState> {
  await assertAdmin();

  const parsed = RouteSchema.safeParse({
    name: formData.get("name"),
    start_terminal_id: formData.get("start_terminal_id"),
    end_terminal_id: formData.get("end_terminal_id"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const service = createServiceClient();
  const { error } = await service.from("routes").update(parsed.data).eq("id", id);
  if (error) return { message: error.message };

  revalidatePath("/admin/routes");
  redirect("/admin/routes");
}

export async function toggleRouteActive(id: string, current: boolean) {
  await assertAdmin();
  const service = createServiceClient();
  await service.from("routes").update({ is_active: !current }).eq("id", id);
  revalidatePath("/admin/routes");
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

async function upsertDistance(
  service: ReturnType<typeof createServiceClient>,
  fromId: string,
  toId: string,
  distKm: number
) {
  const { data: existing } = await service
    .from("distances")
    .select("id")
    .eq("from_terminal_id", fromId)
    .eq("to_terminal_id", toId)
    .maybeSingle();

  if (existing) {
    await service.from("distances").update({ distance_km: distKm }).eq("id", existing.id);
  } else {
    await service
      .from("distances")
      .insert({ from_terminal_id: fromId, to_terminal_id: toId, distance_km: distKm });
  }
}

async function upsertFare(
  service: ReturnType<typeof createServiceClient>,
  routeId: string,
  fareId: string | null,
  amount: number
) {
  if (fareId) {
    await service.from("fares").update({ amount }).eq("id", fareId);
  } else {
    await service.from("fares").insert({
      route_id: routeId,
      amount,
      currency: "ETB",
      effective_from: new Date().toISOString(),
    });
  }
}

/* ── modal-friendly mutations ─────────────────────────────────────────────── */

export type RouteModalData = {
  name: string;
  start_terminal_id: string;
  end_terminal_id: string;
  via_ids: string[];
  distance_km: string;
  fare_etb: string;
  is_active: boolean;
  fareId?: string | null;
};

export async function addRoute(
  data: RouteModalData
): Promise<{ error: string } | { success: true }> {
  await assertAdmin();

  if (!data.name.trim()) return { error: "Route name is required." };
  if (!data.start_terminal_id) return { error: "Select a start terminal." };
  if (!data.end_terminal_id) return { error: "Select an end terminal." };
  if (data.start_terminal_id === data.end_terminal_id)
    return { error: "Start and end terminals must be different." };

  const service = createServiceClient();
  const validViaIds = data.via_ids.filter(Boolean);

  const { data: route, error } = await service
    .from("routes")
    .insert({
      name: data.name.trim(),
      start_terminal_id: data.start_terminal_id,
      end_terminal_id: data.end_terminal_id,
      is_active: data.is_active,
      intermediate_stops: validViaIds,
    })
    .select("id")
    .single();

  if (error || !route) return { error: error?.message ?? "Failed to create route." };

  const distKm = parseFloat(data.distance_km);
  if (!isNaN(distKm) && distKm > 0)
    await upsertDistance(service, data.start_terminal_id, data.end_terminal_id, distKm);

  const fareEtb = parseFloat(data.fare_etb);
  if (!isNaN(fareEtb) && fareEtb > 0)
    await upsertFare(service, route.id, null, fareEtb);

  revalidatePath("/admin/routes");
  return { success: true };
}

export async function editRoute(
  id: string,
  data: RouteModalData
): Promise<{ error: string } | { success: true }> {
  await assertAdmin();

  if (!data.name.trim()) return { error: "Route name is required." };
  if (!data.start_terminal_id) return { error: "Select a start terminal." };
  if (!data.end_terminal_id) return { error: "Select an end terminal." };
  if (data.start_terminal_id === data.end_terminal_id)
    return { error: "Start and end terminals must be different." };

  const service = createServiceClient();
  const validViaIds = data.via_ids.filter(Boolean);

  const { error } = await service
    .from("routes")
    .update({
      name: data.name.trim(),
      start_terminal_id: data.start_terminal_id,
      end_terminal_id: data.end_terminal_id,
      is_active: data.is_active,
      intermediate_stops: validViaIds,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const distKm = parseFloat(data.distance_km);
  if (!isNaN(distKm) && distKm > 0)
    await upsertDistance(service, data.start_terminal_id, data.end_terminal_id, distKm);

  const fareEtb = parseFloat(data.fare_etb);
  if (!isNaN(fareEtb) && fareEtb > 0)
    await upsertFare(service, id, data.fareId ?? null, fareEtb);

  revalidatePath("/admin/routes");
  return { success: true };
}

/* ── bulk import / export ─────────────────────────────────────────────────── */

export async function importRoutes(
  rows: Array<{
    name: string;
    from_terminal: string;
    to_terminal: string;
    via: string;
    distance_km: number;
    fare_etb: number;
  }>
): Promise<{ results: Array<{ name: string; success: boolean; error?: string }> }> {
  await assertAdmin();
  const service = createServiceClient();

  const { data: terminals } = await service.from("terminals").select("id, name");
  const termMap = new Map((terminals ?? []).map((t) => [t.name.toLowerCase(), t.id]));

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const row of rows) {
    const startId = termMap.get(row.from_terminal.toLowerCase());
    const endId = termMap.get(row.to_terminal.toLowerCase());

    if (!startId) {
      results.push({ name: row.name, success: false, error: `Terminal not found: ${row.from_terminal}` });
      continue;
    }
    if (!endId) {
      results.push({ name: row.name, success: false, error: `Terminal not found: ${row.to_terminal}` });
      continue;
    }

    // Resolve comma-separated terminal names in the via column to IDs
    const viaIds = row.via
      ? row.via
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .flatMap((n) => {
            const id = termMap.get(n.toLowerCase());
            return id ? [id] : [];
          })
      : [];

    const { data: route, error } = await service
      .from("routes")
      .insert({
        name: row.name,
        start_terminal_id: startId,
        end_terminal_id: endId,
        is_active: true,
        intermediate_stops: viaIds,
      })
      .select("id")
      .single();

    if (error || !route) {
      results.push({ name: row.name, success: false, error: error?.message ?? "Insert failed" });
      continue;
    }

    if (!isNaN(row.distance_km) && row.distance_km > 0)
      await upsertDistance(service, startId, endId, row.distance_km);

    if (!isNaN(row.fare_etb) && row.fare_etb > 0)
      await upsertFare(service, route.id, null, row.fare_etb);

    results.push({ name: row.name, success: true });
  }

  revalidatePath("/admin/routes");
  return { results };
}

export async function exportRoutes(): Promise<{ csv: string }> {
  await assertAdmin();
  const service = createServiceClient();

  const [{ data: routes }, { data: fares }, { data: distances }, { data: allTerminals }] =
    await Promise.all([
      service
        .from("routes")
        .select(
          `id, name, is_active, intermediate_stops, start_terminal_id, end_terminal_id,
         start:terminals!routes_start_terminal_id_fkey(id, name),
         end:terminals!routes_end_terminal_id_fkey(id, name)`
        )
        .order("name"),
      service.from("fares").select("route_id, amount").order("effective_from", { ascending: false }),
      service.from("distances").select("from_terminal_id, to_terminal_id, distance_km"),
      service.from("terminals").select("id, name"),
    ]);

  const fareMap = new Map<string, number>();
  for (const f of fares ?? []) {
    if (!fareMap.has(f.route_id)) fareMap.set(f.route_id, f.amount);
  }

  const distMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
  }

  const terminalNameMap = new Map((allTerminals ?? []).map((t) => [t.id, t.name]));

  const rows = (routes ?? []).map((r) => {
    const start = r.start as { id: string; name: string } | null;
    const end = r.end as { id: string; name: string } | null;
    const via = (r.intermediate_stops ?? [])
      .map((id: string) => terminalNameMap.get(id) ?? id)
      .join(", ");
    const dist = distMap.get(`${r.start_terminal_id}-${r.end_terminal_id}`) ?? "";
    const fare = fareMap.get(r.id) ?? "";
    return [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${start?.name ?? ""}"`,
      `"${end?.name ?? ""}"`,
      `"${via}"`,
      dist.toString(),
      fare.toString(),
      `"${r.is_active ? "active" : "inactive"}"`,
    ].join(",");
  });

  const csv = ["name,from_terminal,to_terminal,via,distance_km,fare_etb,status", ...rows].join("\n");
  return { csv };
}
