import { createServiceClient } from "@/lib/supabase/service";
import { Bell, MessageSquare, Send, BookOpen } from "lucide-react";
import PushToggle from "./_components/PushToggle";
import SendNotificationForm from "./_components/SendNotificationForm";
import NotifPanelsWrapper from "./_components/NotifPanelsWrapper";
import { type SentRow } from "./_components/SentNotifPanel";
import { type FeedItem } from "./_components/ActivityFeedPanel";

// ─── helpers ──────────────────────────────────────────────────────────────────

function tripRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `TF-${(parseInt(hex, 16) % 100000).toString().padStart(5, "0")}`;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminNotificationsPage() {
  const service = createServiceClient();

  const [
    { data: notifRows, error: notifError },
    { data: trips },
    { data: payments },
    { data: users },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).from("admin_notifications")
      .select("id, title, body, type, target, sent_count, read_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("trips")
      .select("id, status, started_at, routes(name)")
      .order("started_at", { ascending: false })
      .limit(50),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("id, amount, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    service
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const sentRows: SentRow[] = notifError ? [] : (notifRows ?? []);
  const totalNotifications = sentRows.length;
  const totalSent = sentRows.reduce(
    (s: number, n: SentRow) => s + (n.sent_count ?? 0),
    0
  );
  const totalRead = sentRows.reduce(
    (s: number, n: SentRow) => s + (n.read_count ?? 0),
    0
  );

  // ── Platform event feed ────────────────────────────────────────────────────
  const feed: FeedItem[] = [];

  for (const t of trips ?? []) {
    const route = t.routes as { name: string } | null;
    const isError = t.status === "cancelled";
    const isSuccess = t.status === "paid";
    feed.push({
      id: `trip-${t.id}`,
      message: `Trip ${tripRef(t.id)} started${route ? ` · ${route.name}` : ""}`,
      timestamp: t.started_at,
      iconType: "Car",
      badgeCls: isSuccess
        ? "border-green-500/60 text-green-400 bg-green-500/10"
        : isError
        ? "border-red-500/60 text-red-400 bg-red-500/10"
        : "border-blue-500/60 text-blue-400 bg-blue-500/10",
      badgeLabel: isSuccess ? "paid" : isError ? "cancelled" : "active",
    });
  }
  for (const p of payments ?? []) {
    const method: string = p.payment_method ?? "card";
    feed.push({
      id: `pay-${p.id}`,
      message: `Payment received · ETB ${Number(p.amount).toFixed(2)} via ${method}`,
      timestamp: p.created_at,
      iconType: "CreditCard",
      badgeCls: "border-green-500/60 text-green-400 bg-green-500/10",
      badgeLabel: "success",
    });
  }
  for (const u of users ?? []) {
    feed.push({
      id: `user-${u.id}`,
      message: `New user registered: ${u.full_name ?? "Unknown"}`,
      timestamp: u.created_at,
      iconType: "UserPlus",
      badgeCls: "border-blue-500/60 text-blue-400 bg-blue-500/10",
      badgeLabel: "new",
    });
  }

  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalNotifications} notification{totalNotifications !== 1 ? "s" : ""} sent
          </p>
        </div>
        {/* Push settings toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Bell size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Browser alerts</span>
          <PushToggle />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{totalNotifications}</p>
            <p className="text-xs text-muted-foreground mt-1.5">Total Notifications</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
            <Send size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-blue-400">{totalSent}</p>
            <p className="text-xs text-muted-foreground mt-1.5">Sent Notifications</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
            <BookOpen size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-green-400">{totalRead}</p>
            <p className="text-xs text-muted-foreground mt-1.5">Read Notifications</p>
          </div>
        </div>
      </div>

      {/* ── Compose form ── */}
      <SendNotificationForm />

      {/* ── Filtered panels: sent history + platform feed ── */}
      <NotifPanelsWrapper sentRows={sentRows} feed={feed} hasError={!!notifError} />
    </div>
  );
}
