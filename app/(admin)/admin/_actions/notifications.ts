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

export type UserNotifFull = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read: boolean;
};

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
  const { error } = await (service as any).from("admin_notifications").insert({
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

// ── User-facing notification queries ─────────────────────────────────────────

const THIRTY_DAYS_AGO = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

/** Fetch all admin notifications visible to the current user (last 30 days). */
export async function getUserNotifications(): Promise<UserNotifFull[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const service = createServiceClient();
  const [{ data: allNotifs }, { data: myReads }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from("admin_notifications")
      .select("id, title, body, type, target, created_at")
      .gte("created_at", THIRTY_DAYS_AGO())
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id),
  ]);

  const readSet = new Set<string>(
    (myReads ?? []).map(
      (r: { notification_id: string }) => r.notification_id
    )
  );

  return (allNotifs ?? [])
    .filter(
      (n: { target: string }) =>
        n.target === "all" ||
        n.target === "active" ||
        n.target === user.id
    )
    .map(
      (n: {
        id: string;
        title: string;
        body: string;
        type: string;
        created_at: string;
      }) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        created_at: n.created_at,
        read: readSet.has(n.id),
      })
    );
}

/** Mark all visible unread notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();
  const [{ data: allNotifs }, { data: myReads }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from("admin_notifications")
      .select("id, target")
      .gte("created_at", THIRTY_DAYS_AGO()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id),
  ]);

  const readSet = new Set<string>(
    (myReads ?? []).map(
      (r: { notification_id: string }) => r.notification_id
    )
  );

  const unreadIds = (allNotifs ?? [])
    .filter(
      (n: { id: string; target: string }) =>
        (n.target === "all" ||
          n.target === "active" ||
          n.target === user.id) &&
        !readSet.has(n.id)
    )
    .map((n: { id: string }) => n.id);

  if (unreadIds.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any)
    .from("notification_reads")
    .upsert(
      unreadIds.map((id: string) => ({
        notification_id: id,
        user_id: user.id,
      })),
      { onConflict: "notification_id,user_id" }
    );
}

/** Mark a notification as read/dismissed for the current user. */
export async function dismissNotification(notificationId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();
  // Upsert so duplicate dismissals are harmless; trigger increments read_count on first insert.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any)
    .from("notification_reads")
    .upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: "notification_id,user_id" }
    );
}
