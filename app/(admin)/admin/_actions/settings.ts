"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

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
  return user;
}

export type SettingsMap = Record<string, Json>;

export async function fetchSettings(): Promise<SettingsMap> {
  const service = createServiceClient();
  const { data } = await service.from("system_settings").select("key, value");
  const map: SettingsMap = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

async function upsertBatch(
  userId: string,
  entries: Array<{ key: string; value: Json; description?: string }>
) {
  const service = createServiceClient();
  await Promise.all(
    entries.map((e) =>
      service.from("system_settings").upsert(
        { key: e.key, value: e.value, updated_by: userId, ...(e.description && { description: e.description }) },
        { onConflict: "key" }
      )
    )
  );
}

// ── General ───────────────────────────────────────────────────────────────────

export type FormState = { error?: string; success?: boolean };

export async function saveGeneralSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await assertAdmin();
  const platformName = (formData.get("platform_name") as string)?.trim();
  const supportEmail = (formData.get("support_email") as string)?.trim();
  const maxDist = Number(formData.get("max_route_distance_km"));

  if (!platformName) return { error: "Platform name is required." };
  if (!supportEmail) return { error: "Support email is required." };
  if (!maxDist || maxDist <= 0) return { error: "Max distance must be a positive number." };

  await upsertBatch(user.id, [
    { key: "platform_name", value: platformName },
    { key: "support_email", value: supportEmail },
    { key: "max_route_distance_km", value: maxDist },
  ]);

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}

// ── Landing Page ───────────────────────────────────────────────────────────────

export async function saveLandingSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await assertAdmin();
  const headline = (formData.get("landing_hero_headline") as string)?.trim() ?? "";
  const subtitle = (formData.get("landing_hero_subtitle") as string)?.trim() ?? "";
  const ctaText = (formData.get("landing_cta_text") as string)?.trim() ?? "";
  const phone = (formData.get("landing_contact_phone") as string)?.trim() ?? "";
  const address = (formData.get("landing_contact_address") as string)?.trim() ?? "";
  const showFeatures = formData.get("landing_show_features") === "1";
  const showHowItWorks = formData.get("landing_show_how_it_works") === "1";

  if (!headline) return { error: "Hero headline is required." };
  if (!ctaText) return { error: "CTA button text is required." };

  await upsertBatch(user.id, [
    { key: "landing_hero_headline", value: headline },
    { key: "landing_hero_subtitle", value: subtitle },
    { key: "landing_cta_text", value: ctaText },
    { key: "landing_contact_phone", value: phone },
    { key: "landing_contact_address", value: address },
    { key: "landing_show_features", value: showFeatures },
    { key: "landing_show_how_it_works", value: showHowItWorks },
  ]);

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}

// ── Toggle (feature / security) ───────────────────────────────────────────────

export async function toggleSetting(key: string, enabled: boolean): Promise<void> {
  const user = await assertAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert({ key, value: enabled as Json, updated_by: user.id }, { onConflict: "key" });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
