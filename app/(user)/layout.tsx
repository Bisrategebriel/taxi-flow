// FR-UD-01, FR-AU-05
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserSidebar from "@/components/ui/UserSidebar";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";

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
      <UserSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
