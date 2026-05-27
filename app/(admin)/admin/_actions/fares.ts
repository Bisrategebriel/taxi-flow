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

const FareAmountSchema = z.object({
  amount: z.coerce
    .number({ error: "Amount must be a number" })
    .positive("Amount must be positive"),
});

export type FareFormState = {
  error?: string;
};

export async function updateFare(
  id: string,
  _prev: FareFormState,
  formData: FormData
): Promise<FareFormState> {
  await assertAdmin();

  const parsed = FareAmountSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("fares")
    .update({ amount: parsed.data.amount })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/fares");
  return {};
}

export type InlineUpdatePayload = {
  fareId: string;
  amount: number;
  startTerminalId: string;
  endTerminalId: string;
  distanceKm: number;
  durationMin?: number;
};

export async function updateFareInline(
  payload: InlineUpdatePayload
): Promise<{ error?: string }> {
  await assertAdmin();
  const service = createServiceClient();

  const { error: fareError } = await service
    .from("fares")
    .update({ amount: payload.amount })
    .eq("id", payload.fareId);
  if (fareError) return { error: fareError.message };

  if (payload.distanceKm > 0 || (payload.durationMin !== undefined && payload.durationMin > 0)) {
    const { data: existing } = await service
      .from("distances")
      .select("id")
      .eq("from_terminal_id", payload.startTerminalId)
      .eq("to_terminal_id", payload.endTerminalId)
      .maybeSingle();

    if (existing) {
      await service
        .from("distances")
        .update({
          ...(payload.distanceKm > 0 ? { distance_km: payload.distanceKm } : {}),
          ...(payload.durationMin !== undefined && payload.durationMin > 0 ? { duration_minutes: payload.durationMin } : {}),
        })
        .eq("id", existing.id);
    } else if (payload.distanceKm > 0) {
      await service.from("distances").insert({
        from_terminal_id: payload.startTerminalId,
        to_terminal_id: payload.endTerminalId,
        distance_km: payload.distanceKm,
        ...(payload.durationMin !== undefined && payload.durationMin > 0 ? { duration_minutes: payload.durationMin } : {}),
      });
    }
  }

  revalidatePath("/admin/fares");
  return {};
}

export async function exportFares(): Promise<{ csv: string }> {
  await assertAdmin();
  const service = createServiceClient();

  const [{ data: fares }, { data: distances }] = await Promise.all([
    service
      .from("fares")
      .select(
        `id, amount, currency, updated_at, routes(id, name, start_terminal_id, end_terminal_id)`
      )
      .order("updated_at", { ascending: false }),
    service.from("distances").select("from_terminal_id, to_terminal_id, distance_km"),
  ]);

  const distMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
  }

  const rows = (fares ?? []).map((f) => {
    const route = f.routes as {
      id: string;
      name: string;
      start_terminal_id: string;
      end_terminal_id: string;
    } | null;
    const dist = route
      ? (distMap.get(`${route.start_terminal_id}-${route.end_terminal_id}`) ?? "")
      : "";
    const date = new Date(f.updated_at).toISOString().split("T")[0];
    return [
      `"${(route?.name ?? "").replace(/"/g, '""')}"`,
      dist.toString(),
      f.amount.toString(),
      `"${f.currency}"`,
      `"${date}"`,
    ].join(",");
  });

  const csv = ["route,distance_km,fare_etb,currency,last_updated", ...rows].join("\n");
  return { csv };
}

type ImportFareRow = { route: string; distance_km: number; fare_etb: number };

export async function importFares(
  rows: ImportFareRow[]
): Promise<{ results: Array<{ route: string; success: boolean; error?: string }> }> {
  await assertAdmin();
  const service = createServiceClient();

  const { data: routes } = await service
    .from("routes")
    .select("id, name, start_terminal_id, end_terminal_id");
  const routeMap = new Map(
    (routes ?? []).map((r) => [r.name.toLowerCase(), r])
  );

  const { data: distances } = await service
    .from("distances")
    .select("id, from_terminal_id, to_terminal_id");

  const results: Array<{ route: string; success: boolean; error?: string }> = [];

  for (const row of rows) {
    const route = routeMap.get(row.route.toLowerCase());
    if (!route) {
      results.push({ route: row.route, success: false, error: `Route not found: ${row.route}` });
      continue;
    }

    const { data: existingFare } = await service
      .from("fares")
      .select("id")
      .eq("route_id", route.id)
      .maybeSingle();

    if (existingFare) {
      const { error } = await service
        .from("fares")
        .update({ amount: row.fare_etb })
        .eq("id", existingFare.id);
      if (error) {
        results.push({ route: row.route, success: false, error: error.message });
        continue;
      }
    } else {
      const { error } = await service.from("fares").insert({
        route_id: route.id,
        amount: row.fare_etb,
        currency: "ETB",
        effective_from: new Date().toISOString().split("T")[0],
      });
      if (error) {
        results.push({ route: row.route, success: false, error: error.message });
        continue;
      }
    }

    if (!isNaN(row.distance_km) && row.distance_km > 0) {
      const existingDist = distances?.find(
        (d) =>
          d.from_terminal_id === route.start_terminal_id &&
          d.to_terminal_id === route.end_terminal_id
      );
      if (existingDist) {
        await service
          .from("distances")
          .update({ distance_km: row.distance_km })
          .eq("id", existingDist.id);
      } else {
        await service.from("distances").insert({
          from_terminal_id: route.start_terminal_id,
          to_terminal_id: route.end_terminal_id,
          distance_km: row.distance_km,
        });
      }
    }

    results.push({ route: row.route, success: true });
  }

  revalidatePath("/admin/fares");
  return { results };
}
