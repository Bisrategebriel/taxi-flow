"use client";

// FR-AS-01..04
import { useState, useTransition, useActionState } from "react";
import { ShieldCheck, LogOut, Clock, UserPlus, Lock } from "lucide-react";
import {
  toggleLoginEnabled,
  toggleRegistrationEnabled,
  forceLogoutAll,
  setSessionTimeout,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";
import type { SettingsMap } from "@/app/(admin)/admin/_actions/settings";

function ToggleRow({
  label,
  description,
  icon: Icon,
  initialValue,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  initialValue: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
}) {
  const [on, setOn] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await onToggle(next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <div className="flex items-center gap-4 py-4 px-6 border-b border-border last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60">
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
            on
              ? "border-green-500/60 text-green-400 bg-green-500/10"
              : "border-border text-muted-foreground"
          }`}
        >
          {on ? "On" : "Off"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-60 ${
            on ? "border-primary bg-primary" : "border-border bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function AuthSettingsCard({ settings }: { settings: SettingsMap }) {
  const b = (key: string, fallback = true) =>
    typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;

  const [logoutPending, startLogout] = useTransition();
  const [logoutResult, setLogoutResult] = useState<SuperAdminState | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const [timeoutState, timeoutAction, timeoutPending] = useActionState(
    setSessionTimeout,
    {}
  );

  function handleForceLogout() {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }
    setConfirmLogout(false);
    startLogout(async () => {
      const result = await forceLogoutAll();
      setLogoutResult(result);
    });
  }

  const rawTimeout = settings["session_timeout_minutes"];
  const defaultTimeout = typeof rawTimeout === "number" ? rawTimeout : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 mt-0.5">
          <ShieldCheck size={16} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Auth Settings</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control who can access the platform
          </p>
        </div>
      </div>

      <ToggleRow
        label="User Login"
        description="Allow existing users to sign in"
        icon={Lock}
        initialValue={b("login_enabled")}
        onToggle={toggleLoginEnabled}
      />
      <ToggleRow
        label="User Registration"
        description="Allow new users to create accounts"
        icon={UserPlus}
        initialValue={b("registration_enabled")}
        onToggle={toggleRegistrationEnabled}
      />

      {/* Session Timeout */}
      <div className="flex items-center gap-4 py-4 px-6 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60">
          <Clock size={14} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Session Timeout</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-logout inactive users after N minutes (0 = disabled)
          </p>
        </div>
        <form action={timeoutAction} className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            name="session_timeout_minutes"
            defaultValue={defaultTimeout}
            min={0}
            max={1440}
            className="w-20 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={timeoutPending}
            className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
        </form>
      </div>
      {timeoutState?.error && (
        <p className="px-6 pb-3 text-xs text-destructive">{timeoutState.error}</p>
      )}
      {timeoutState?.success && (
        <p className="px-6 pb-3 text-xs text-green-500">Saved.</p>
      )}

      {/* Force Logout All */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <LogOut size={15} className="text-orange-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Force Logout All</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immediately sign out all active user sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={logoutPending}
            onClick={handleForceLogout}
            className={`shrink-0 h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmLogout
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-muted border border-border text-foreground hover:bg-accent"
            }`}
          >
            {logoutPending
              ? "Signing out…"
              : confirmLogout
              ? "Confirm"
              : "Force Logout"}
          </button>
        </div>
        {confirmLogout && (
          <p className="mt-2 text-xs text-orange-400">
            Click Confirm to sign out all users. You will remain signed in.
          </p>
        )}
        {logoutResult?.success && (
          <p className="mt-2 text-xs text-green-500">
            Refresh tokens revoked. Users will be signed out within 1 hour as access
            tokens expire. For immediate lockdown, use Emergency Stop.
          </p>
        )}
        {logoutResult?.error && (
          <p className="mt-2 text-xs text-orange-400">{logoutResult.error}</p>
        )}
      </div>
    </div>
  );
}
