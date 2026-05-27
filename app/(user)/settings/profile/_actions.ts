"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EditProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prev: EditProfileState,
  formData: FormData
): Promise<EditProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const fullName = (formData.get("full_name") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const emergencyContactName = (formData.get("emergency_contact_name") as string)?.trim() || null;
  const emergencyContactPhone = (formData.get("emergency_contact_phone") as string)?.trim() || null;
  const autoShareLocation = formData.get("auto_share_location") === "on";
  const homeAddress = (formData.get("home_address") as string)?.trim() || null;
  const workAddress = (formData.get("work_address") as string)?.trim() || null;
  const languagePref = (formData.get("language_pref") as string) || "en";
  const notifTripUpdates = formData.get("notif_trip_updates") === "on";
  const notifPaymentReceipts = formData.get("notif_payment_receipts") === "on";
  const notifPromotions = formData.get("notif_promotions") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      auto_share_location: autoShareLocation,
      home_address: homeAddress,
      work_address: workAddress,
      language_pref: languagePref,
      notif_trip_updates: notifTripUpdates,
      notif_payment_receipts: notifPaymentReceipts,
      notif_promotions: notifPromotions,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/settings/profile");
  return { success: true };
}
