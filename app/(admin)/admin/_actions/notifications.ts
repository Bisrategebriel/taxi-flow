"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_TYPES = [
  "promotional",
  "info",
  "warning",
  "success",
  "decline",
  "alert",
  "reminder",
] as const;

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

export type SendNotifState = { error?: string; success?: boolean };

export async function searchUsersByName(
  query: string
): Promise<{ id: string; full_name: string }[]> {
  await assertAdmin();
  if (!query.trim()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("role", "user")
    .ilike("full_name", `%${query.trim()}%`)
    .limit(8);
  return (data ?? []).map((u: { id: string; full_name: string | null }) => ({
    id: u.id,
    full_name: u.full_name ?? "Unknown",
  }));
}

export async function sendAdminNotification(
  _prev: SendNotifState,
  formData: FormData
): Promise<SendNotifState> {
  const user = await assertAdmin();

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const type = (formData.get("type") as string | null) ?? "info";
  const rawTarget = (formData.get("target") as string | null) ?? "all";
  const targetUserId = (formData.get("target_user_id") as string | null)?.trim() ?? null;

  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Message body is required." };
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return { error: "Invalid notification type." };
  }
  if (!["all", "active", "specific"].includes(rawTarget)) {
    return { error: "Invalid target." };
  }
  if (rawTarget === "specific" && !targetUserId) {
    return { error: "Please select a user." };
  }

  const service = createServiceClient();

  let finalTarget: string;
  let sentCount: number;

  if (rawTarget === "specific" && targetUserId) {
    finalTarget = targetUserId;
    sentCount = 1;
  } else {
    const { count: userCount } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user");
    finalTarget = rawTarget;
    sentCount = userCount ?? 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = service as any;
  const { error } = await db.from("admin_notifications").insert({
    title,
    body,
    type,
    target: finalTarget,
    sent_count: sentCount,
    read_count: 0,
    sent_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  return { success: true };
}
