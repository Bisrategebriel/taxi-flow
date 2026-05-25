"use server";

// FR-AS-01..04, FR-SS-01..03, FR-EC-01..03
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

async function assertSuperAdmin() {
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
  if (profile?.role !== "super_admin") {
    throw new Error("Forbidden — Super Admin only");
  }
  return user;
}

async function writeAuditLog(
  actorId: string,
  action: string,
  newData?: Record<string, unknown>
) {
  const service = createServiceClient();
  await service.from("audit_logs").insert({
    actor_id: actorId,
    action,
    table_name: "system_settings",
    new_data: (newData ?? null) as Json,
  });
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type SuperAdminState = { error?: string; success?: boolean };

// ── Auth Settings ─────────────────────────────────────────────────────────────

/** FR-AS-02 — Toggle login_enabled */
export async function toggleLoginEnabled(enabled: boolean): Promise<void> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "login_enabled", value: enabled as Json, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(user.id, enabled ? "LOGIN_ENABLED" : "LOGIN_DISABLED");
  revalidatePath("/admin/super-admin");
}

/** FR-AS-01 — Toggle registration_enabled */
export async function toggleRegistrationEnabled(enabled: boolean): Promise<void> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "registration_enabled", value: enabled as Json, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(
    user.id,
    enabled ? "REGISTRATION_ENABLED" : "REGISTRATION_DISABLED"
  );
  revalidatePath("/admin/super-admin");
  revalidatePath("/admin/settings");
}

/** FR-AS-03 — Force logout all non-super-admin users */
export async function forceLogoutAll(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();

  const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { error: "Failed to list users: " + error.message };

  const others = (data?.users ?? []).filter((u) => u.id !== user.id);
  await Promise.allSettled(others.map((u) => service.auth.admin.signOut(u.id)));

  await writeAuditLog(user.id, "FORCE_LOGOUT_ALL", {
    affected_count: others.length,
  });
  revalidatePath("/admin/super-admin");
  return { success: true };
}

/** FR-AS-04 — Set session timeout minutes (0 = disabled) */
export async function setSessionTimeout(
  _prev: SuperAdminState,
  formData: FormData
): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const minutes = Number(formData.get("session_timeout_minutes"));
  if (isNaN(minutes) || minutes < 0) {
    return { error: "Timeout must be a non-negative number." };
  }
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "session_timeout_minutes", value: minutes as Json, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(user.id, "SESSION_TIMEOUT_UPDATED", { minutes });
  revalidatePath("/admin/super-admin");
  return { success: true };
}

// ── System Settings ───────────────────────────────────────────────────────────

/** FR-SS-02 — Broadcast announcement (empty string = clear) */
export async function setBroadcastAnnouncement(
  _prev: SuperAdminState,
  formData: FormData
): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const text = (formData.get("announcement") as string)?.trim() ?? "";
  const value: Json = text === "" ? null : text;
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "announcement", value, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(
    user.id,
    text ? "ANNOUNCEMENT_SET" : "ANNOUNCEMENT_CLEARED",
    { text: text || null }
  );
  revalidatePath("/admin/super-admin");
  revalidatePath("/");
  return { success: true };
}

/** FR-SS-03 — Reset non-critical data (chat_logs + expired share_tokens) */
export async function resetNonCriticalData(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();

  const [chatResult, tokenResult] = await Promise.allSettled([
    // Delete all chat logs (non-critical operational data)
    service
      .from("chat_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"),
    // Delete expired share tokens
    service
      .from("share_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString()),
  ]);

  const errors: string[] = [];
  if (chatResult.status === "rejected")
    errors.push("chat_logs: " + String(chatResult.reason));
  if (tokenResult.status === "rejected")
    errors.push("share_tokens: " + String(tokenResult.reason));

  if (errors.length) return { error: errors.join("; ") };

  await writeAuditLog(user.id, "NON_CRITICAL_DATA_RESET");
  revalidatePath("/admin/super-admin");
  return { success: true };
}

// ── Emergency Controls ────────────────────────────────────────────────────────

/** FR-EC-01..02 — Emergency stop: lock down the entire platform immediately */
export async function emergencyStop(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  const cookieStore = await cookies();

  const lockKeys: Array<{ key: string; value: Json }> = [
    { key: "maintenance_mode", value: true },
    { key: "login_enabled", value: false },
    { key: "registration_enabled", value: false },
    { key: "share_tracking_enabled", value: false },
    { key: "ai_chat_enabled", value: false },
  ];

  await Promise.all(
    lockKeys.map((entry) =>
      service
        .from("system_settings")
        .upsert({ ...entry, updated_by: user.id }, { onConflict: "key" })
    )
  );

  // Sync maintenance cookie so proxy.ts gates non-admin requests immediately.
  cookieStore.set("tf_maintenance", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  await writeAuditLog(user.id, "EMERGENCY_STOP", {
    keys_locked: lockKeys.map((k) => k.key),
  });

  revalidatePath("/admin/super-admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}
