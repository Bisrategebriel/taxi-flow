"use client";

// FR-SS-02, FR-SS-03
import { useState, useActionState, useTransition, useEffect } from "react";
import { Megaphone, Trash2, CheckCircle, Clock } from "lucide-react";
import {
  setBroadcastAnnouncement,
  resetNonCriticalData,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";
import type { SettingsMap } from "@/app/(admin)/admin/_actions/settings";
import type { AnnouncementHistoryItem } from "@/app/(admin)/admin/super-admin/page";

export default function SystemSettingsCard({
  settings,
  announcementHistory,
}: {
  settings: SettingsMap;
  announcementHistory: AnnouncementHistoryItem[];
}) {
  const rawAnnouncement = settings["announcement"];
  const currentAnnouncement =
    rawAnnouncement && rawAnnouncement !== "null"
      ? String(rawAnnouncement)
      : "";

  const [announcementText, setAnnouncementText] = useState(currentAnnouncement);
  const [announcementState, announcementAction, announcementPending] =
    useActionState(setBroadcastAnnouncement, {});

  // Clear textarea after successful publish
  useEffect(() => {
    if (announcementState?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnouncementText("");
    }
  }, [announcementState?.success]);

  const [resetPending, startReset] = useTransition();
  const [resetResult, setResetResult] = useState<SuperAdminState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    startReset(async () => {
      const result = await resetNonCriticalData();
      setResetResult(result);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 mt-0.5">
          <Megaphone size={16} className="text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">System Settings</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Broadcasts and data management
          </p>
        </div>
      </div>

      {/* Announcement broadcast */}
      <div className="px-6 py-5 border-b border-border">
        <p className="text-sm font-medium mb-1">Broadcast Announcement</p>
        <p className="text-xs text-muted-foreground mb-3">
          Show a banner to all users. Leave blank to clear the current announcement.
        </p>
        <form action={announcementAction} className="space-y-2">
          <textarea
            name="announcement"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            rows={3}
            placeholder="e.g. Scheduled maintenance on Saturday 10pm–2am UTC"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={announcementPending}
              className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {announcementPending ? "Saving…" : "Publish"}
            </button>
            {announcementState?.success && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle size={12} /> Published
              </span>
            )}
            {announcementState?.error && (
              <span className="text-xs text-destructive">{announcementState.error}</span>
            )}
          </div>
        </form>

        {/* Announcement history */}
        {announcementHistory.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock size={11} /> Previous Announcements
            </p>
            <div className="space-y-1.5">
              {announcementHistory.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                      item.action === "ANNOUNCEMENT_CLEARED"
                        ? "text-muted-foreground"
                        : "text-primary"
                    }`}>
                      {item.action === "ANNOUNCEMENT_CLEARED" ? "Cleared" : "Published"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {item.text ? (
                    <p className="text-xs text-foreground line-clamp-2">{item.text}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Banner cleared</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset non-critical data */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Trash2 size={15} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">Reset Non-Critical Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clear all chat logs and expired share tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={resetPending}
            onClick={handleReset}
            className={`shrink-0 h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmReset
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted border border-border text-foreground hover:bg-accent"
            }`}
          >
            {resetPending ? "Resetting…" : confirmReset ? "Confirm Reset" : "Reset"}
          </button>
        </div>
        {resetResult?.success && (
          <p className="mt-2 text-xs text-green-500">Data reset complete.</p>
        )}
        {resetResult?.error && (
          <p className="mt-2 text-xs text-destructive">{resetResult.error}</p>
        )}
      </div>
    </div>
  );
}
