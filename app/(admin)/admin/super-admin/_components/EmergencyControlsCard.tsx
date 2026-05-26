"use client";

// FR-EC-01..02
import { useState, useTransition } from "react";
import { AlertOctagon, TriangleAlert, CheckCircle2 } from "lucide-react";
import {
  emergencyStop,
  restorePlatform,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";
import type { SettingsMap } from "@/app/(admin)/admin/_actions/settings";

function isEmergencyActive(settings: SettingsMap) {
  const maintenance =
    settings["maintenance_mode"] === true ||
    settings["maintenance_mode"] === "true";
  const loginOff =
    settings["login_enabled"] === false ||
    settings["login_enabled"] === "false";
  return maintenance && loginOff;
}

export default function EmergencyControlsCard({
  settings,
}: {
  settings: SettingsMap;
}) {
  const platformLocked = isEmergencyActive(settings);

  // Stop flow
  const [stopStep, setStopStep] = useState<"idle" | "confirm">("idle");
  const [stopResult, setStopResult] = useState<SuperAdminState | null>(null);
  const [stopPending, startStop] = useTransition();

  // Restore flow
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoreResult, setRestoreResult] = useState<SuperAdminState | null>(null);
  const [restorePending, startRestore] = useTransition();

  function handleStopConfirm() {
    startStop(async () => {
      const res = await emergencyStop();
      setStopResult(res);
      setStopStep("idle");
    });
  }

  function handleRestore() {
    if (!restoreConfirm) {
      setRestoreConfirm(true);
      return;
    }
    setRestoreConfirm(false);
    startRestore(async () => {
      const res = await restorePlatform();
      setRestoreResult(res);
    });
  }

  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/5 overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-destructive/30">
        <AlertOctagon size={16} className="text-destructive mt-1 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Emergency Controls</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immediately lock down or restore the entire platform. All actions are audit-logged.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* ── Platform locked state ── */}
        {platformLocked && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertOctagon size={15} className="text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Platform is in Emergency Stop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maintenance mode is active and user login is disabled. Click
                  &quot;Restore Platform&quot; to bring the platform back online.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={restorePending}
                onClick={handleRestore}
                className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                  restoreConfirm
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-muted border border-border text-foreground hover:bg-accent"
                }`}
              >
                {restorePending
                  ? "Restoring…"
                  : restoreConfirm
                  ? "Confirm Restore"
                  : "Restore Platform"}
              </button>
              {restoreConfirm && (
                <button
                  type="button"
                  onClick={() => setRestoreConfirm(false)}
                  className="h-9 rounded-lg bg-muted border border-border px-4 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            {restoreConfirm && (
              <p className="text-xs text-muted-foreground">
                This will re-enable maintenance mode off, login, registration, sharing, and AI chat.
              </p>
            )}
            {restoreResult?.success && (
              <p className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle2 size={12} /> Platform restored. All features re-enabled.
              </p>
            )}
            {restoreResult?.error && (
              <p className="text-xs text-destructive">{restoreResult.error}</p>
            )}
          </div>
        )}

        {/* ── Normal state: show Emergency Stop button ── */}
        {!platformLocked && (
          <>
            {stopStep === "idle" && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-background px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <TriangleAlert size={15} className="text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Emergency Stop</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enables maintenance mode, disables login, registration, sharing, and AI chat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStopStep("confirm")}
                  className="shrink-0 h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Emergency Stop
                </button>
              </div>
            )}

            {stopStep === "confirm" && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertOctagon size={15} className="text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Are you absolutely sure?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will immediately shut down the platform for all users.
                      Maintenance mode activates and login is disabled.
                      You can reverse this from this same page.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={stopPending}
                    onClick={handleStopConfirm}
                    className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    {stopPending ? "Activating…" : "Yes, Emergency Stop"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStopStep("idle")}
                    className="h-9 rounded-lg bg-muted border border-border px-4 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {stopResult?.error && (
              <p className="text-xs text-destructive">{stopResult.error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
