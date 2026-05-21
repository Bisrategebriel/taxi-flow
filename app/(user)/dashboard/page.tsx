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
  TrendingUp,
  CheckCircle2,
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
    iconBg: "bg-primary",
    iconColor: "text-primary-foreground",
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
    href: "/trip",
    icon: Clock,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
];

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
}

const STATS: Stat[] = [
  { label: "Trips", value: "0", icon: TrendingUp, iconColor: "text-emerald-500" },
  { label: "Distance", value: "0 km", icon: Navigation, iconColor: "text-cyan-500" },
  { label: "Saved", value: "$0", icon: Zap, iconColor: "text-yellow-500" },
];

export default function UserDashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("there");
  const [showTripEndedToast, setShowTripEndedToast] = useState(false);

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const first = data?.full_name?.split(" ")[0];
          if (first) setDisplayName(first);
        });
    });
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
              <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Recent Trips</h2>
          <Link href="/trip" className="text-xs text-primary font-medium hover:underline">
            See all
          </Link>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            Your trips will appear here once you start travelling.
          </p>
        </div>
      </div>

    </div>
  );
}
