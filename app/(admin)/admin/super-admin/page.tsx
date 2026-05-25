// FR-AS-01..04, FR-SS-01..03, FR-EC-01..03
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSettings } from "@/app/(admin)/admin/_actions/settings";
import AuthSettingsCard from "./_components/AuthSettingsCard";
import SystemSettingsCard from "./_components/SystemSettingsCard";
import EmergencyControlsCard from "./_components/EmergencyControlsCard";

export default async function SuperAdminPage() {
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

  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const settings = await fetchSettings();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Super Admin Controls</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Restricted to Super Admin. All actions are audit-logged.
        </p>
      </div>

      <div className="w-3/4 space-y-5">
        <AuthSettingsCard settings={settings} />
        <SystemSettingsCard settings={settings} />
        <EmergencyControlsCard />
      </div>
    </div>
  );
}
