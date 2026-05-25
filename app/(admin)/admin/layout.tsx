import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AdminSidebar from "./_components/AdminSidebar";
import AdminTopBar, { type AdminNotification } from "./_components/AdminTopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  // Fetch last 7 platform events for the notification bell
  const service = createServiceClient();
  const [{ data: nTrips }, { data: nPayments }, { data: nUsers }] =
    await Promise.all([
      service
        .from("trips")
        .select("id, status, started_at, routes(name)")
        .order("started_at", { ascending: false })
        .limit(3),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service.from("payments") as any)
        .select("id, amount, payment_method, created_at")
        .order("created_at", { ascending: false })
        .limit(2),
      service
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

  function tripRef(id: string) {
    const hex = id.replace(/-/g, "").slice(-4);
    return `TFR${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
  }

  const rawNotifs: AdminNotification[] = [];

  for (const t of nTrips ?? []) {
    const route = t.routes as { name: string } | null;
    rawNotifs.push({
      id: `trip-${t.id}`,
      message: `Trip ${tripRef(t.id)} started${route ? ` · ${route.name}` : ""}`,
      timestamp: t.started_at,
      type: "trip",
      badge: t.status === "paid" ? "success" : t.status === "cancelled" ? "error" : "info",
    });
  }
  for (const p of nPayments ?? []) {
    const method: string = p.payment_method ?? "card";
    rawNotifs.push({
      id: `pay-${p.id}`,
      message: `Payment received · ETB ${Number(p.amount).toFixed(2)} via ${method}`,
      timestamp: p.created_at,
      type: "payment",
      badge: "success",
    });
  }
  for (const u of nUsers ?? []) {
    rawNotifs.push({
      id: `user-${u.id}`,
      message: `New user registered: ${u.full_name ?? "Unknown"}`,
      timestamp: u.created_at,
      type: "user",
      badge: "info",
    });
  }

  const notifications = rawNotifs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 7);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar role={profile.role} email={user.email ?? ""} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopBar
          fullName={profile.full_name}
          role={profile.role}
          notifications={notifications}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
