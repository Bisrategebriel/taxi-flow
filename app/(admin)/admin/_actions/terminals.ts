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

const TerminalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  lat: z.coerce.number({ error: "Latitude must be a number" }),
  lng: z.coerce.number({ error: "Longitude must be a number" }),
  is_active: z.coerce.boolean().default(true),
});

export type TerminalFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createTerminal(
  _prev: TerminalFormState,
  formData: FormData
): Promise<TerminalFormState> {
  await assertAdmin();

  const parsed = TerminalSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const service = createServiceClient();
  const { error } = await service.from("terminals").insert(parsed.data);
  if (error) return { message: error.message };

  revalidatePath("/admin/terminals");
  redirect("/admin/terminals");
}

export async function updateTerminal(
  id: string,
  _prev: TerminalFormState,
  formData: FormData
): Promise<TerminalFormState> {
  await assertAdmin();

  const parsed = TerminalSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const service = createServiceClient();
  const { error } = await service.from("terminals").update(parsed.data).eq("id", id);
  if (error) return { message: error.message };

  revalidatePath("/admin/terminals");
  redirect("/admin/terminals");
}

export async function toggleTerminalActive(id: string, current: boolean) {
  await assertAdmin();
  const service = createServiceClient();
  await service.from("terminals").update({ is_active: !current }).eq("id", id);
  revalidatePath("/admin/terminals");
}
