"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleNotifPref(
  pref: "notif_trip_updates" | "notif_payment_receipts" | "notif_promotions",
  value: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const patch =
    pref === "notif_trip_updates"
      ? { notif_trip_updates: value }
      : pref === "notif_payment_receipts"
      ? { notif_payment_receipts: value }
      : { notif_promotions: value };

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return {};
}

export async function updateAvatarUrl(url: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return {};
}
