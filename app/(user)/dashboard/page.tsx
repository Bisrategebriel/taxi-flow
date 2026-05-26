"use client";
// FR-UD-03, FR-UD-04, FR-UD-05
// Auth is enforced by app/(user)/layout.tsx — no server-side guard needed here.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Navigation,
  MapPin,
  MessageSquare,
  Clock,
  Zap,
  Banknote,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DashboardHeader from "@/components/ui/DashboardHeader";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Search Route",
    href: "/route-search",
    icon: Navigation,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  {
    label: "Nearest Terminal",
    href: "/terminals",
    icon: MapPin,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  {
    label: "Ask AI",
    href: "/chat",
    icon: MessageSquare,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    badge: "New",
  },
  {
    label: "Trip History",
    href: "/trip-history",
    icon: Clock,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
];

interface TripStats {
  trips: number;
  distanceKm: number;
  spent: number;
}

interface RecentTrip {
  id: string;
  displayId: string;
  fromName: string | null;
  toName: string | null;
  routeName: string | null;
  fareAmount: number | null;
  status: string;
  startedAt: string;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active:          { label: "Active",   cls: "border border-blue-500/60 text-blue-400 bg-blue-500/10" },
  completed:       { label: "Done",     cls: "border border-green-500/60 text-green-400 bg-green-500/10" },
  paid:            { label: "Paid",     cls: "border border-emerald-500/60 text-emerald-400 bg-emerald-500/10" },
  payment_pending: { label: "Pending",  cls: "border border-amber-500/60 text-amber-400 bg-amber-500/10" },
  cancelled:       { label: "Cancelled",cls: "border border-red-500/60 text-red-400 bg-red-500/10" },
};

function tripDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").slice(-6);
  const num = parseInt(hex, 16) % 100000;
  return `TF-${num.toString().padStart(5, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("there");
  const [showTripEndedToast, setShowTripEndedToast] = useState(false);
  const [stats, setStats] = useState<TripStats>({ trips: 0, distanceKm: 0, spent: 0 });
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tripEnded") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowTripEndedToast(true);
      router.replace("/dashboard");
      const t = setTimeout(() => setShowTripEndedToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set display name
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const first = data?.full_name?.split(" ")[0];
          if (first) setDisplayName(first);
        });

      // Fetch all user trips
      const { data: tripsData } = await supabase
        .from("trips")
        .select("id, fare_amount, status, start_terminal_id, end_terminal_id, route_id, started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (!tripsData || tripsData.length === 0) {
        setLoadingData(false);
        return;
      }

      // Collect unique IDs for joins
      const terminalIds = [
        ...new Set([
          ...tripsData.map((t) => t.start_terminal_id).filter(Boolean),
          ...tripsData.map((t) => t.end_terminal_id).filter(Boolean),
        ]),
      ] as string[];

      const routeIds = [
        ...new Set(tripsData.map((t) => t.route_id).filter(Boolean)),
      ] as string[];

      const [{ data: terminals }, { data: distances }, { data: routes }] =
        await Promise.all([
          terminalIds.length > 0
            ? supabase.from("terminals").select("id, name").in("id", terminalIds)
            : { data: [] as { id: string; name: string }[] },
          terminalIds.length > 0
            ? supabase
                .from("distances")
                .select("from_terminal_id, to_terminal_id, distance_km")
                .in("from_terminal_id", terminalIds)
                .in("to_terminal_id", terminalIds)
            : { data: [] as { from_terminal_id: string; to_terminal_id: string; distance_km: number }[] },
          routeIds.length > 0
            ? supabase.from("routes").select("id, name").in("id", routeIds)
            : { data: [] as { id: string; name: string }[] },
        ]);

      const termMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));
      const distMap = new Map(
        (distances ?? []).map((d) => [`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km])
      );
      const routeMap = new Map((routes ?? []).map((r) => [r.id, r.name]));

      // Compute stats from finished trips
      const finishedTrips = tripsData.filter((t) =>
        ["completed", "paid", "payment_pending"].includes(t.status)
      );
      const totalDistanceKm = finishedTrips.reduce((sum, t) => {
        const km =
          t.start_terminal_id && t.end_terminal_id
            ? (distMap.get(`${t.start_terminal_id}-${t.end_terminal_id}`) ?? 0)
            : 0;
        return sum + km;
      }, 0);
      const totalSpent = tripsData
        .filter((t) => t.status === "paid")
        .reduce((sum, t) => sum + (t.fare_amount ?? 0), 0);

      setStats({
        trips: finishedTrips.length,
        distanceKm: totalDistanceKm,
        spent: totalSpent,
      });

      // Recent 7 trips
      const recent: RecentTrip[] = tripsData.slice(0, 7).map((t) => ({
        id: t.id,
        displayId: tripDisplayId(t.id),
        fromName: t.start_terminal_id ? (termMap.get(t.start_terminal_id) ?? null) : null,
        toName: t.end_terminal_id ? (termMap.get(t.end_terminal_id) ?? null) : null,
        routeName: t.route_id ? (routeMap.get(t.route_id) ?? null) : null,
        fareAmount: t.fare_amount,
        status: t.status,
        startedAt: t.started_at,
      }));
      setRecentTrips(recent);
      setLoadingData(false);
    }

    loadDashboardData();
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const STATS = [
    {
      label: "Trips",
      value: loadingData ? "—" : String(stats.trips),
      icon: TrendingUp,
      iconColor: "text-emerald-500",
    },
    {
      label: "Distance",
      value: loadingData ? "—" : `${stats.distanceKm.toFixed(1)} km`,
      icon: Navigation,
      iconColor: "text-cyan-500",
    },
    {
      label: "Spent",
      value: loadingData ? "—" : `ETB ${stats.spent.toFixed(0)}`,
      icon: Banknote,
      iconColor: "text-yellow-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-5 pb-8 max-w-lg mx-auto w-full md:max-w-none md:px-6">

      {/* Trip ended toast */}
      {showTripEndedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-2.5
          rounded-xl bg-emerald-600 px-5 py-3 shadow-lg text-white text-sm font-semibold
          animate-in fade-in slide-in-from-top-2 duration-300 whitespace-nowrap">
          <CheckCircle2 size={16} strokeWidth={2.5} />
          Trip ended successfully
        </div>
      )}

      {/* Header */}
      <DashboardHeader
        greeting={`Good ${timeOfDay}`}
        displayName={displayName}
      />

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-5">
        <div className="relative z-10">
          <p className="text-primary-foreground/70 text-xs font-medium">{formattedDate}</p>
          <h2 className="text-primary-foreground text-2xl font-bold mt-1 leading-tight">
            Where to today?
          </h2>
          <p className="text-primary-foreground/70 text-sm mt-1">
            Tap below to find your route
          </p>
          <Link
            href="/route-search"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
          >
            <Navigation size={14} />
            Search Route
          </Link>
        </div>
        <Zap
          size={96}
          className="absolute -right-4 -top-4 text-primary-foreground/10"
          strokeWidth={1}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className="relative rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                  {action.badge && (
                    <span className="absolute top-3 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {action.badge}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                      action.iconBg
                    )}
                  >
                    <Icon size={20} strokeWidth={1.75} className={action.iconColor} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1"
            >
              <Icon size={18} strokeWidth={1.75} className={stat.iconColor} />
              <p className="text-[0.8rem] font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Recent Trips</h2>
          <Link href="/trip-history" className="text-xs text-primary font-medium hover:underline">
            See all
          </Link>
        </div>

        {loadingData ? (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
                <div className="h-5 bg-muted rounded-full w-14" />
              </div>
            ))}
          </div>
        ) : recentTrips.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Your trips will appear here once you start travelling.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {recentTrips.map((trip) => {
              const badge = STATUS_STYLE[trip.status] ?? {
                label: trip.status,
                cls: "border border-border text-muted-foreground",
              };
              return (
                <div key={trip.id} className="flex items-center gap-3 px-4 py-3.5">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Navigation size={14} className="text-muted-foreground" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {trip.fromName && trip.toName
                        ? `${trip.fromName} → ${trip.toName}`
                        : (trip.routeName ?? trip.displayId)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(trip.startedAt)}
                      {trip.fareAmount != null && (
                        <> · ETB {trip.fareAmount.toFixed(2)}</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      badge.cls
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}

            {/* Footer link */}
            <Link
              href="/trip-history"
              className="flex items-center justify-center gap-1.5 py-3 text-xs text-primary font-medium hover:bg-muted/50 transition-colors"
            >
              View all trips
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
