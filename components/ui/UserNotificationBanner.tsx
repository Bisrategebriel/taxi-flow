"use client";

import { useState, useTransition } from "react";
import { X, ChevronRight } from "lucide-react";
import { getNotifConfig } from "@/lib/notification-config";
import { dismissNotification } from "@/app/(admin)/admin/_actions/notifications";

export type UserNotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
};

export default function UserNotificationBanner({
  notifications,
}: {
  notifications: UserNotifItem[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  const current = visible[0];
  const cfg = getNotifConfig(current.type);
  const Icon = cfg.icon;

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    startTransition(async () => {
      await dismissNotification(id);
    });
  }

  return (
    <div
      className={`relative flex items-center gap-3 border-b px-4 py-2.5 ${cfg.bgCls} ${cfg.borderCls}`}
    >
      <Icon size={13} className={`${cfg.textCls} shrink-0`} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold ${cfg.textCls}`}>
          {current.title}
        </span>
        <span className="text-xs text-foreground/80 ml-1">— {current.body}</span>
      </div>
      {visible.length > 1 && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            1 of {visible.length}
          </span>
          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            aria-label="Next notification"
            className="flex items-center justify-center rounded-md p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={12} className="text-muted-foreground" />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => handleDismiss(current.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X size={13} className="text-muted-foreground" />
      </button>
    </div>
  );
}
