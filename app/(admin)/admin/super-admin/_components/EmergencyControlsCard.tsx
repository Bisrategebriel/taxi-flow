"use client";

// FR-EC-01..02
import { useState, useTransition } from "react";
import { AlertOctagon, TriangleAlert } from "lucide-react";
import {
  emergencyStop,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";

export default function EmergencyControlsCard() {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [result, setResult] = useState<SuperAdminState | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFirstClick() {
    setStep("confirm");
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await emergencyStop();
      setResult(res);
      setStep("done");
    });
  }

  function handleCancel() {
    setStep("idle");
  }

  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/5 overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-destructive/30">
        <AlertOctagon size={16} className="text-destructive mt-1 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Emergency Controls</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immediately lock down the entire platform. This action is audit-logged.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {step === "idle" && (
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
              onClick={handleFirstClick}
              className="shrink-0 h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Emergency Stop
            </button>
          </div>
        )}

        {step === "confirm" && (
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
                  Only a Super Admin can reverse this.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Activating…" : "Yes, Emergency Stop"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 rounded-lg bg-muted border border-border px-4 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === "done" && result?.success && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3.5">
            <p className="text-sm font-semibold text-destructive">
              Emergency Stop activated.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform is now offline. Go to System Settings to restore service.
            </p>
          </div>
        )}

        {result?.error && (
          <p className="text-xs text-destructive">{result.error}</p>
        )}
      </div>
    </div>
  );
}
