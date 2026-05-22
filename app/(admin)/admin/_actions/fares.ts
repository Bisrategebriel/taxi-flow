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
