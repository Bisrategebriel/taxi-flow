"use client";

import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { getNotifConfig, timeAgo } from "@/lib/notification-config";
import {
  dismissNotification,
  markAllNotificationsRead,
  type UserNotifFull,
} from "@/app/(admin)/admin/_actions/notifications";

function NotifCard({
  n,
  onRead,
}: {
  n: UserNotifFull;
  onRead: (id: string) => void;
}) {
  const cfg = getNotifConfig(n.type);
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => !n.read && onRead(n.id)}
      className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
        n.read
          ? "border-border bg-card opacity-50"
          : `border-l-2 ${cfg.borderCls} border-r border-t border-b border-border bg-card hover:bg-muted/20 cursor-pointer`
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bgCls}`}
      >
        <Icon size={16} className={cfg.textCls} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{n.title}</p>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bgCls} ${cfg.textCls} ${cfg.borderCls}`}
          >
            {cfg.label}
          </span>
          {!n.read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {n.body}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {timeAgo(n.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function NotificationsView({
  notifications: initial,
}: {
  notifications: UserNotifFull[];
}) {
  const [notifications, setNotifications] = useState(initial);
  const [, startTransition] = useTransition();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    startTransition(async () => {
      await dismissNotification(id);
    });
  }

  function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No notifications in the last 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unread · {unread.length}
            </h2>
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>
          <div className="space-y-2">
            {unread.map((n) => (
              <NotifCard key={n.id} n={n} onRead={handleMarkRead} />
            ))}
          </div>
        </section>
      )}

      {read.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Read · {read.length}
          </h2>
          <div className="space-y-2">
            {read.map((n) => (
              <NotifCard key={n.id} n={n} onRead={handleMarkRead} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
