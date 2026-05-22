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
