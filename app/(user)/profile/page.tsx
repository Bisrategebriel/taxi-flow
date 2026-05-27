import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserNotifications } from "@/app/(admin)/admin/_actions/notifications";
import { signout } from "@/app/auth/signout/actions";
import { Bell, CreditCard, Shield, Settings, ChevronRight, LogOut, User } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const [{ data: profile }, { data: tripStats }, notifications] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).single(),
    // Aggregate trip stats for this user
    service.from("trips")
      .select("id, status, start_terminal_id, end_terminal_id")
      .eq("user_id", user.id)
      .in("status", ["completed", "paid"]),
    getUserNotifications(),
  ]);

  // Compute total distance from distances table using paid/completed trips
  const terminalPairs = (tripStats ?? [])
    .filter((t) => t.start_terminal_id && t.end_terminal_id)
    .map((t) => ({ from: t.start_terminal_id as string, to: t.end_terminal_id as string }));

  let totalDistanceKm = 0;
  if (terminalPairs.length > 0) {
    const uniquePairKeys = [...new Set(terminalPairs.map((p) => `${p.from}-${p.to}`))];
    const fromIds = [...new Set(terminalPairs.map((p) => p.from))];
    const toIds = [...new Set(terminalPairs.map((p) => p.to))];
    const allIds = [...new Set([...fromIds, ...toIds])];
    const { data: distances } = await service
      .from("distances")
      .select("from_terminal_id, to_terminal_id, distance_km")
      .in("from_terminal_id", allIds)
      .in("to_terminal_id", allIds);
    const distMap = new Map((distances ?? []).map((d) => [`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km]));
    for (const key of uniquePairKeys) {
      const d = distMap.get(key);
      const count = terminalPairs.filter((p) => `${p.from}-${p.to}` === key).length;
      if (d) totalDistanceKm += d * count;
    }
  }

  const tripCount = tripStats?.length ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const initials = (profile?.full_name ?? user.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const NAV_LINKS = [
    {
      href: "/notifications",
      icon: Bell,
      label: "Notifications",
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      href: "/payment-methods",
      icon: CreditCard,
      label: "Payment Methods",
      badge: null,
    },
    {
      href: "/settings/privacy",
      icon: Shield,
      label: "Privacy & Security",
      badge: null,
    },
    {
      href: "/settings",
      icon: Settings,
      label: "App Settings",
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <h1 className="text-xl font-bold mb-5">Profile</h1>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card px-5 py-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-tight">
                {profile?.full_name ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              {profile?.phone && (
                <p className="text-sm text-muted-foreground">{profile.phone}</p>
              )}
            </div>
          </div>
          {/* Silhouette icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
            <User size={20} className="text-muted-foreground" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col items-center py-3 px-2 gap-0.5">
            <span className="text-lg font-bold text-foreground leading-none">{tripCount}</span>
            <span className="text-[11px] text-muted-foreground">Trips</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 gap-0.5">
            <span className="text-lg font-bold text-foreground leading-none">
              {totalDistanceKm >= 1000
                ? `${(totalDistanceKm / 1000).toFixed(1)}k`
                : `${Math.round(totalDistanceKm)}`}
              <span className="text-xs font-normal ml-0.5">km</span>
            </span>
            <span className="text-[11px] text-muted-foreground">Distance</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 gap-0.5">
            <span className="text-lg font-bold text-foreground leading-none">4.9</span>
            <span className="text-[11px] text-muted-foreground">Rating</span>
          </div>
        </div>

        {/* Edit profile */}
        <Link
          href="/settings/profile"
          className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <User size={14} />
          Edit Profile
        </Link>
      </div>

      {/* Navigation rows */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
        {NAV_LINKS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors ${
                i < NAV_LINKS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Icon size={16} className="text-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge !== null && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
      <form action={signout}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 text-sm font-semibold transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        TaxiFlow v2.4.1 · Made with care
      </p>
    </div>
  );
}
