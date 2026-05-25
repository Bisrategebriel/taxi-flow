// FR-UD-01, FR-AU-05, FR-SS-02
// Leaflet CSS must be in the initial bundle, not a lazy chunk, or the map renders blank.
import "leaflet/dist/leaflet.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import UserSidebar from "@/components/ui/UserSidebar";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import ActiveTripBanner from "@/components/trip/ActiveTripBanner";
import ActiveTripSpacer from "@/components/trip/ActiveTripSpacer";
import AnnouncementBanner from "@/components/ui/AnnouncementBanner";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch active broadcast announcement (service client bypasses RLS)
  const service = createServiceClient();
  const { data: announcementRow } = await service
    .from("system_settings")
    .select("value")
    .eq("key", "announcement")
    .single();

  const announcement =
    announcementRow?.value &&
    announcementRow.value !== "null" &&
    typeof announcementRow.value === "string"
      ? announcementRow.value
      : null;

  return (
    <div className="flex min-h-screen bg-background flex-col">
      {announcement && <AnnouncementBanner text={announcement} />}
      <div className="flex flex-1 min-h-0">
        <ActiveTripBanner />
        <UserSidebar />
        <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <ActiveTripSpacer />
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </div>
  );
}
