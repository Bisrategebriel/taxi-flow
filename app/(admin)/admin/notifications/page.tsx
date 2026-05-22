import { createServiceClient } from "@/lib/supabase/service";
import {
  Car,
  CreditCard,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Info,
  Bell,
} from "lucide-react";
import PushToggle from "./_components/PushToggle";

function tripRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `TFR${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type NotifItem = {
  id: string;
  message: string;
  timestamp: string;
  type: "trip" | "payment" | "user";
  badge: "info" | "success" | "error";
};

export default async function AdminNotificationsPage() {
  const service = createServiceClient();

  const [{ data: trips }, { data: payments }, { data: users }] = await Promise.all([
    service
      .from("trips")
      .select("id, status, started_at, routes(name)")
      .order("started_at", { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("id, amount, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    service
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const notifs: NotifItem[] = [];

  for (const t of trips ?? []) {
    const route = t.routes as { name: string } | null;
    notifs.push({
      id: `trip-${t.id}`,
      message: `Trip ${tripRef(t.id)} started${route ? ` · ${route.name}` : ""}`,
      timestamp: t.started_at,
      type: "trip",
      badge: t.status === "paid" ? "success" : t.status === "cancelled" ? "error" : "info",
    });
  }
  for (const p of payments ?? []) {
    const method: string = p.payment_method ?? "card";
    notifs.push({
      id: `pay-${p.id}`,
      message: `Payment received · ETB ${Number(p.amount).toFixed(2)} via ${method}`,
      timestamp: p.created_at,
      type: "payment",
      badge: "success",
    });
  }
  for (const u of users ?? []) {
    notifs.push({
      id: `user-${u.id}`,
      message: `New user registered: ${u.full_name ?? "Unknown"}`,
      timestamp: u.created_at,
      type: "user",
      badge: "info",
    });
  }

  notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const ICON_MAP = {
    trip: Car,
    payment: CreditCard,
    user: UserPlus,
  };

  const BADGE_MAP = {
    success: { icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    error:   { icon: AlertCircle,  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    info:    { icon: Info,         cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{notifs.length} platform events</p>
      </div>

      {/* Push notification settings card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Bell size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Push Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive browser push alerts for new trips, payments, and registrations
              </p>
            </div>
          </div>
          <PushToggle />
        </div>
      </div>

      {/* Notification feed */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {notifs.map((n) => {
            const NIcon = ICON_MAP[n.type];
            const { icon: BIcon, cls: badgeCls } = BADGE_MAP[n.badge];
            return (
              <div
                key={n.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <NIcon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.timestamp)}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${badgeCls}`}>
                  <BIcon size={11} />
                  {n.badge}
                </span>
              </div>
            );
          })}
          {notifs.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No platform events yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
