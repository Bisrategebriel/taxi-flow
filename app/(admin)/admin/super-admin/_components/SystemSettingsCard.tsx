"use client";

// FR-SS-02, FR-SS-03
import { useState, useActionState, useTransition } from "react";
import { Megaphone, Trash2, CheckCircle } from "lucide-react";
import {
  setBroadcastAnnouncement,
  resetNonCriticalData,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";
import type { SettingsMap } from "@/app/(admin)/admin/_actions/settings";

export default function SystemSettingsCard({ settings }: { settings: SettingsMap }) {
  const rawAnnouncement = settings["announcement"];
  const currentAnnouncement =
    rawAnnouncement && rawAnnouncement !== "null"
      ? String(rawAnnouncement)
      : "";

  const [announcementState, announcementAction, announcementPending] =
    useActionState(setBroadcastAnnouncement, {});

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
            defaultValue={currentAnnouncement}
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
