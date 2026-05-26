"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Bell, CheckCheck, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getNotifConfig, timeAgo } from "@/lib/notification-config";
import {
  getUserNotifications,
  dismissNotification,
  markAllNotificationsRead,
  type UserNotifFull,
} from "@/app/(admin)/admin/_actions/notifications";

interface Props {
  greeting: string;
  displayName: string;
}

export default function DashboardHeader({ greeting, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotifFull[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserNotifications().then((n) => {
      setNotifications(n);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasUnread = loaded && notifications.some((n) => !n.read);
  const recent = notifications.slice(0, 6);

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

  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{greeting}</p>
        <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setOpen((o) => !o)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md
              text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell size={18} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck size={12} />
                    Mark all as read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-border">
                {!loaded ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : recent.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  recent.map((n) => {
                    const cfg = getNotifConfig(n.type);
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          n.read ? "opacity-50" : "bg-green-500/5"
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5 ${cfg.bgCls}`}
                        >
                          <Icon size={13} className={cfg.textCls} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold truncate">
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            aria-label="Mark as read"
                            title="Mark as read"
                            className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-2.5">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all notifications
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </div>
  );
}
