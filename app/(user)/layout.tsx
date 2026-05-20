// FR-UD-01, FR-AU-05
// Leaflet CSS must be in the initial bundle, not a lazy chunk, or the map renders blank.
import "leaflet/dist/leaflet.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserSidebar from "@/components/ui/UserSidebar";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import ActiveTripBanner from "@/components/trip/ActiveTripBanner";

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

  return (
    <div className="flex min-h-screen bg-background">
      <ActiveTripBanner />
      <UserSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
