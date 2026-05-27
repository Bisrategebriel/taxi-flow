import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "./_components/EditProfileForm";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, phone, emergency_contact_name, emergency_contact_phone, auto_share_location, home_address, work_address, language_pref, notif_trip_updates, notif_payment_receipts, notif_promotions"
    )
    .eq("id", user.id)
    .single();

  return (
    <EditProfileForm
      profile={{
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        emergency_contact_name: profile?.emergency_contact_name ?? null,
        emergency_contact_phone: profile?.emergency_contact_phone ?? null,
        auto_share_location: profile?.auto_share_location ?? false,
        home_address: profile?.home_address ?? null,
        work_address: profile?.work_address ?? null,
        language_pref: profile?.language_pref ?? "en",
        notif_trip_updates: profile?.notif_trip_updates ?? true,
        notif_payment_receipts: profile?.notif_payment_receipts ?? true,
        notif_promotions: profile?.notif_promotions ?? false,
        email: user.email ?? "",
      }}
    />
  );
}
