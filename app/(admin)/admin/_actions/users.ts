"use server";

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
  return { userId: user.id, role: profile.role };
}

export async function suspendUser(userId: string) {
  await assertAdmin();
  const service = createServiceClient();
  await service.from("profiles").update({ is_suspended: true }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function unsuspendUser(userId: string) {
  await assertAdmin();
  const service = createServiceClient();
  await service.from("profiles").update({ is_suspended: false }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setRole(userId: string, role: "user" | "admin" | "super_admin") {
  const caller = await assertAdmin();
  if (caller.role !== "super_admin") throw new Error("Forbidden");
  const service = createServiceClient();
  await service.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function createUser(data: {
  email: string;
  full_name: string;
  phone: string;
  role: string;
  password: string;
}): Promise<{ error: string } | { success: true }> {
  await assertAdmin();

  if (!data.email || !data.full_name || !data.password) {
    return { error: "Name, email, and password are required." };
  }

  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create user." };
  }

  await service.from("profiles").upsert({
    id: authData.user.id,
    full_name: data.full_name,
    phone: data.phone || null,
    role: ["user", "admin", "super_admin"].includes(data.role) ? data.role : "user",
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function importUsers(
  users: Array<{ email: string; full_name: string; phone: string; role: string }>
): Promise<{ results: Array<{ email: string; success: boolean; error?: string; password?: string }> }> {
  await assertAdmin();
  const service = createServiceClient();

  const results: Array<{ email: string; success: boolean; error?: string; password?: string }> = [];

  for (const u of users) {
    const a = Math.random().toString(36).slice(2, 8);
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    const password = `${a}${b}!1`;

    const { data: authData, error } = await service.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    if (!error && authData.user) {
      await service.from("profiles").upsert({
        id: authData.user.id,
        full_name: u.full_name,
        phone: u.phone || null,
        role: ["user", "admin", "super_admin"].includes(u.role) ? u.role : "user",
      });
      results.push({ email: u.email, success: true, password });
    } else {
      results.push({ email: u.email, success: false, error: error?.message });
    }
  }

  revalidatePath("/admin/users");
  return { results };
}

export async function exportUsers(): Promise<{ csv: string }> {
  await assertAdmin();
  const service = createServiceClient();

  const [{ data: profiles }, authList] = await Promise.all([
    service
      .from("profiles")
      .select("id, full_name, phone, role, is_suspended, created_at")
      .order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailMap = new Map(
    (authList.data?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const rows = (profiles ?? []).map((p) => [
    `"${(p.full_name ?? "").replace(/"/g, '""')}"`,
    `"${emailMap.get(p.id) ?? ""}"`,
    `"${(p.phone ?? "").replace(/"/g, '""')}"`,
    `"${p.role}"`,
    `"${p.is_suspended ? "suspended" : "active"}"`,
    `"${new Date(p.created_at).toLocaleDateString()}"`,
  ]);

  const csv = [
    "Name,Email,Phone,Role,Status,Joined",
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  return { csv };
}
