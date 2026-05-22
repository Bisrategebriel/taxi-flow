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
