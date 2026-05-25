"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Lock, AlertTriangle, Wrench } from "lucide-react";
import { toggleSetting, type SettingsMap } from "@/app/(admin)/admin/_actions/settings";

// ─── shared primitives ────────────────────────────────────────────────────────

function StatusBadge({ on }: { on: boolean }) {
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
        on
          ? "border-green-500/60 text-green-400 bg-green-500/10"
          : "border-border text-muted-foreground"
      }`}
    >
      {on ? "On" : "Off"}
    </span>
  );
}

function ToggleSwitch({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
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
  );
}

function SecurityRow({
  label,
  description,
  settingKey,
  initialValue,
}: {
  label: string;
  description: string;
  settingKey: string;
  initialValue: boolean;
}) {
  const [on, setOn] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await toggleSetting(settingKey, next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <div className="flex items-center gap-4 py-4 px-6 border-b border-border last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60">
        <Lock size={14} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <StatusBadge on={on} />
        <ToggleSwitch on={on} disabled={pending} onChange={handleToggle} />
      </div>
    </div>
  );
}

// ─── Security card ────────────────────────────────────────────────────────────

export function SecurityCard({ settings }: { settings: SettingsMap }) {
  const b = (key: string, fallback = true) =>
    typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 mt-0.5">
          <ShieldCheck size={16} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Security</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authentication and access control settings
          </p>
        </div>
      </div>

      <SecurityRow
        label="Two-Factor Authentication (Admin)"
        description="Require 2FA for all admin logins"
        settingKey="security_2fa_admin"
        initialValue={b("security_2fa_admin")}
      />
      <SecurityRow
        label="Session Timeout"
        description="Auto-logout inactive admin sessions after 30 minutes"
        settingKey="security_session_timeout"
        initialValue={b("security_session_timeout")}
      />
      <SecurityRow
        label="IP Allowlist for Admin"
        description="Restrict admin access to approved IP addresses"
        settingKey="security_ip_allowlist"
        initialValue={b("security_ip_allowlist", false)}
      />
    </div>
  );
}

// ─── Danger Zone card ─────────────────────────────────────────────────────────

export function DangerZoneCard({ settings }: { settings: SettingsMap }) {
  const rawMaintenance = settings["maintenance_mode"];
  const initialOn =
    rawMaintenance === true ||
    rawMaintenance === "true" ||
    rawMaintenance === 1;

  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await toggleSetting("maintenance_mode", next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/5 overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-destructive/30">
        <AlertTriangle size={16} className="text-destructive mt-1 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Danger Zone</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            These actions affect all platform users immediately
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-background px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Wrench size={15} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Take the platform offline for all users. Only admins can log in.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleToggle}
            className={`shrink-0 flex items-center gap-2 h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              on
                ? "bg-muted border border-border text-foreground hover:bg-accent"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
          >
            <Wrench size={13} />
            {on ? "Deactivate" : "Activate"}
          </button>
        </div>

        {on && (
          <p className="mt-3 text-xs text-destructive flex items-center gap-1.5">
            <AlertTriangle size={11} />
            Maintenance mode is active — users cannot access the platform.
          </p>
        )}
      </div>
    </div>
  );
}
