import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserNotifications } from "@/app/(admin)/admin/_actions/notifications";
import { signout } from "@/app/auth/signout/actions";
import {
  Bell, CreditCard, ChevronRight, LogOut,
  MapPin, Phone, Mail, CheckCircle2, AlertCircle,
  Globe, Home, Briefcase, Plus, Navigation2,
  KeyRound, FileText, Download, UserX, Users,
} from "lucide-react";
import { tripDisplayId } from "@/lib/utils/trip-id";
import AvatarUpload from "./_components/AvatarUpload";
import NotifPrefsToggles from "./_components/NotifPrefsToggles";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const [
    { data: profile },
    { data: completedTrips },
    { data: recentTrips },
    { data: defaultPayment },
    notifications,
  ] = await Promise.all([
    supabase.from("profiles")
      .select("full_name, phone, avatar_url, role, created_at, emergency_contact_name, emergency_contact_phone, auto_share_location, home_address, work_address, custom_places, language_pref, notif_trip_updates, notif_payment_receipts, notif_promotions")
      .eq("id", user.id).single(),
    service.from("trips")
      .select("id, start_terminal_id, end_terminal_id")
      .eq("user_id", user.id).in("status", ["completed", "paid"]),
    // Recent 3 trips
    service.from("trips")
      .select("id, status, started_at, start_terminal_id, end_terminal_id, route:routes(name)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(3),
    // Last successful payment for default payment method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("payment_method, stripe_payment_intent_id")
      .eq("user_id", user.id).eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle(),
    getUserNotifications(),
  ]);

  // Compute total distance
  const terminalPairs = (completedTrips ?? [])
    .filter((t) => t.start_terminal_id && t.end_terminal_id);
  let totalDistanceKm = 0;
  if (terminalPairs.length > 0) {
    const allIds = [...new Set(terminalPairs.flatMap((t) => [t.start_terminal_id!, t.end_terminal_id!]))];
    const { data: distances } = await service.from("distances")
      .select("from_terminal_id, to_terminal_id, distance_km")
      .in("from_terminal_id", allIds).in("to_terminal_id", allIds);
    const distMap = new Map((distances ?? []).map((d) => [`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km]));
    for (const t of terminalPairs) {
      totalDistanceKm += distMap.get(`${t.start_terminal_id}-${t.end_terminal_id}`) ?? 0;
    }
  }

  // Fetch terminal names for recent trips
  const termIds = new Set<string>();
  for (const t of recentTrips ?? []) {
    if (t.start_terminal_id) termIds.add(t.start_terminal_id);
    if (t.end_terminal_id) termIds.add(t.end_terminal_id);
  }
  const { data: terminals } = termIds.size > 0
    ? await service.from("terminals").select("id, name").in("id", [...termIds])
    : { data: [] };
  const termMap = new Map((terminals ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));

  const tripCount = completedTrips?.length ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const initials = (profile?.full_name ?? user.email ?? "?")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const emailVerified = !!user.email_confirmed_at;
  const phoneVerified = false; // phone OTP not yet implemented

  const customPlaces = Array.isArray(profile?.custom_places) ? profile.custom_places : [];

  const statusColors: Record<string, string> = {
    active: "text-blue-400 bg-blue-500/10 border-blue-500/40",
    completed: "text-green-400 bg-green-500/10 border-green-500/40",
    paid: "text-green-400 bg-green-500/10 border-green-500/40",
    cancelled: "text-red-400 bg-red-500/10 border-red-500/40",
    payment_pending: "text-amber-400 bg-amber-500/10 border-amber-500/40",
  };
  const statusLabels: Record<string, string> = {
    active: "Active", completed: "Completed", paid: "Paid",
    cancelled: "Cancelled", payment_pending: "Pending Payment",
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* ── 1. Identity ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Cover bar */}
          <div className="h-20 bg-linear-to-r from-primary/30 via-primary/20 to-transparent" />
          <div className="px-5 pb-5">
            {/* Avatar overlapping cover */}
            <div className="flex items-end justify-between -mt-10 mb-3">
              <AvatarUpload
                userId={user.id}
                avatarUrl={profile?.avatar_url ?? null}
                initials={initials}
              />
              <Link
                href="/settings/profile"
                className="flex items-center gap-1.5 h-8 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Edit Profile
              </Link>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">
              {profile?.full_name ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {memberSince && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">Member since {memberSince}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border overflow-hidden mt-4">
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold">{tripCount}</span>
                <span className="text-[10px] text-muted-foreground">Trips</span>
              </div>
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold">
                  {totalDistanceKm >= 1000
                    ? `${(totalDistanceKm / 1000).toFixed(1)}k`
                    : Math.round(totalDistanceKm)}
                  <span className="text-xs font-normal">km</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Distance</span>
              </div>
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold">4.9</span>
                <span className="text-[10px] text-muted-foreground">Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Contact Information ─────────────────────────────────────── */}
        <SectionCard title="Contact Information">
          <InfoRow
            icon={<Mail size={15} />}
            label="Email"
            value={user.email ?? "—"}
            badge={emailVerified
              ? <Badge color="green"><CheckCircle2 size={10} /> Verified</Badge>
              : <Badge color="amber"><AlertCircle size={10} /> Unverified</Badge>}
          />
          <div className="border-t border-border" />
          <InfoRow
            icon={<Phone size={15} />}
            label="Phone"
            value={profile?.phone ?? <span className="text-muted-foreground/60 italic text-sm">Not set</span>}
            badge={profile?.phone
              ? phoneVerified
                ? <Badge color="green"><CheckCircle2 size={10} /> Verified</Badge>
                : <Badge color="amber"><AlertCircle size={10} /> Unverified</Badge>
              : null}
            action={<Link href="/settings/profile" className="text-xs text-primary hover:underline">Add</Link>}
          />
        </SectionCard>

        {/* ── 3. Safety & Sharing ────────────────────────────────────────── */}
        <SectionCard title="Safety & Sharing">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users size={14} className="text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Emergency Contact</p>
                  {profile?.emergency_contact_name ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.emergency_contact_name}
                      {profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">Not set</p>
                  )}
                </div>
              </div>
              <Link href="/settings/profile#emergency" className="shrink-0 text-xs text-primary hover:underline">
                {profile?.emergency_contact_name ? "Edit" : "Add"}
              </Link>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-share with emergency contact</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically share live location when a trip starts</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${profile?.auto_share_location ? "border-green-500/60 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}>
                {profile?.auto_share_location ? "On" : "Off"}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ── 4. Saved Places ────────────────────────────────────────────── */}
        <SectionCard title="Saved Places">
          <PlaceRow icon={<Home size={14} />} label="Home" address={profile?.home_address ?? null} />
          <div className="border-t border-border" />
          <PlaceRow icon={<Briefcase size={14} />} label="Work" address={profile?.work_address ?? null} />
          {(customPlaces as Array<{ label: string; address: string }>).map((place, i) => (
            <div key={i}>
              <div className="border-t border-border" />
              <PlaceRow icon={<MapPin size={14} />} label={place.label} address={place.address} />
            </div>
          ))}
          {customPlaces.length < 3 && (
            <>
              <div className="border-t border-border" />
              <Link
                href="/settings/profile#places"
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
                  <Plus size={13} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add a place</span>
              </Link>
            </>
          )}
        </SectionCard>

        {/* ── 5. Payment ─────────────────────────────────────────────────── */}
        <SectionCard title="Payment">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <CreditCard size={14} className="text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Default Method</p>
                  <p className="text-xs text-muted-foreground">
                    {defaultPayment?.payment_method === "card"
                      ? "Card payment"
                      : defaultPayment?.payment_method === "cash"
                      ? "Cash"
                      : "No payments yet"}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <Link
                href="/trip-history"
                className="flex items-center justify-between text-sm text-primary hover:underline"
              >
                View payment history
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </SectionCard>

        {/* ── 6. Trip History ─────────────────────────────────────────────── */}
        <SectionCard title="Trip History">
          {(recentTrips ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No trips yet</div>
          ) : (
            (recentTrips ?? []).map((trip, i) => {
              const route = trip.route as { name: string } | null;
              const from = trip.start_terminal_id ? termMap.get(trip.start_terminal_id) : null;
              const to = trip.end_terminal_id ? termMap.get(trip.end_terminal_id) : null;
              const routeLabel = from && to ? `${from} → ${to}` : route?.name ?? "Trip";
              const date = new Date(trip.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={trip.id}>
                  {i > 0 && <div className="border-t border-border" />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Navigation2 size={13} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{routeLabel}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{date}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusColors[trip.status] ?? "border-border text-muted-foreground"}`}>
                          {statusLabels[trip.status] ?? trip.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="border-t border-border">
            <Link href="/trip-history" className="flex items-center justify-between px-4 py-3 text-sm text-primary hover:bg-muted transition-colors">
              View all trips
              <ChevronRight size={14} />
            </Link>
          </div>
        </SectionCard>

        {/* ── 7. Preferences ──────────────────────────────────────────────── */}
        <SectionCard title="Preferences">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Globe size={14} className="text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.language_pref === "am" ? "Amharic" : "English"}</p>
              </div>
            </div>
            <Link href="/settings/profile#preferences" className="text-xs text-primary hover:underline">Change</Link>
          </div>
          <div className="border-t border-border">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notifications</p>
            </div>
            <NotifPrefsToggles
              prefs={{
                notif_trip_updates: profile?.notif_trip_updates ?? true,
                notif_payment_receipts: profile?.notif_payment_receipts ?? true,
                notif_promotions: profile?.notif_promotions ?? false,
              }}
            />
          </div>
        </SectionCard>

        {/* ── 8. Account & Privacy ────────────────────────────────────────── */}
        <SectionCard title="Account & Privacy">
          {[
            { href: "/settings/change-password", icon: KeyRound, label: "Change Password" },
            { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount > 0 ? unreadCount : null },
            { href: "/privacy-policy", icon: FileText, label: "Privacy Policy" },
            { href: "/terms", icon: FileText, label: "Terms of Service" },
            { href: "/settings/download-data", icon: Download, label: "Download My Data" },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {i > 0 && <div className="border-t border-border" />}
                <Link href={item.href} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Icon size={14} className="text-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {"badge" in item && item.badge !== null && item.badge !== undefined && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </Link>
              </div>
            );
          })}
        </SectionCard>

        {/* ── 9. Destructive Actions ──────────────────────────────────────── */}
        <div className="space-y-2">
          <form action={signout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </form>
          <Link
            href="/settings/delete-account"
            className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <UserX size={15} />
            Delete Account
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          TaxiFlow v1.0.0 · Built with purpose &copy; 2026
        </p>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, badge, action }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{value}</span>
          {badge}
        </div>
      </div>
      {action}
    </div>
  );
}

function Badge({ color, children }: { color: "green" | "amber" | "blue"; children: React.ReactNode }) {
  const cls = {
    green: "border-green-500/50 text-green-500 bg-green-500/10",
    amber: "border-amber-500/50 text-amber-500 bg-amber-500/10",
    blue: "border-blue-500/50 text-blue-400 bg-blue-500/10",
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function PlaceRow({ icon, label, address }: { icon: React.ReactNode; label: string; address: string | null }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {address ?? <span className="italic opacity-60">Not set</span>}
          </p>
        </div>
      </div>
      <Link href="/settings/profile#places" className="shrink-0 text-xs text-primary hover:underline ml-3">
        {address ? "Edit" : "Set"}
      </Link>
    </div>
  );
}
