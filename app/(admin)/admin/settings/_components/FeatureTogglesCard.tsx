"use client";

import { useState, useTransition } from "react";
import {
  Sliders,
  UserPlus,
  Bot,
  MapPin,
  Share2,
  Smartphone,
  CreditCard,
  Bell,
  BarChart2,
} from "lucide-react";
import { toggleSetting, type SettingsMap } from "@/app/(admin)/admin/_actions/settings";

// ─── primitives ───────────────────────────────────────────────────────────────

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

// ─── feature row ──────────────────────────────────────────────────────────────

function FeatureRow({
  icon: Icon,
  label,
  description,
  settingKey,
  initialValue,
}: {
  icon: React.ElementType;
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
    <div className="flex items-center gap-4 py-4 px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60">
        <Icon size={15} className="text-muted-foreground" />
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

// ─── section divider ──────────────────────────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-t border-border bg-muted/30">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

export default function FeatureTogglesCard({ settings }: { settings: SettingsMap }) {
  const b = (key: string, fallback = true) =>
    typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
          <Sliders size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Feature Toggles</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable or disable platform features instantly
          </p>
        </div>
      </div>

      {/* Rows */}
      <Section label="Access & Registration" />
      <FeatureRow
        icon={UserPlus}
        label="User Registration"
        description="Allow new users to create accounts"
        settingKey="registration_enabled"
        initialValue={b("registration_enabled")}
      />

      <Section label="Features" />
      <FeatureRow
        icon={Bot}
        label="AI Chat Assistant"
        description="Enable the AI support chatbot for users"
        settingKey="ai_chat_enabled"
        initialValue={b("ai_chat_enabled")}
      />
      <FeatureRow
        icon={MapPin}
        label="Live GPS Tracking"
        description="Enable real-time trip location tracking"
        settingKey="feature_live_gps"
        initialValue={b("feature_live_gps")}
      />
      <FeatureRow
        icon={Share2}
        label="Trip Location Sharing"
        description="Allow users to share live location via link"
        settingKey="share_tracking_enabled"
        initialValue={b("share_tracking_enabled")}
      />

      <Section label="Payments" />
      <FeatureRow
        icon={Smartphone}
        label="Mobile Money Payments"
        description="Accept mobile money transactions"
        settingKey="feature_mobile_money"
        initialValue={b("feature_mobile_money")}
      />
      <FeatureRow
        icon={CreditCard}
        label="Card Payments"
        description="Accept debit/credit card payments"
        settingKey="feature_card_payments"
        initialValue={b("feature_card_payments")}
      />

      <Section label="System" />
      <FeatureRow
        icon={Bell}
        label="Push Notifications"
        description="Send push notifications to mobile users"
        settingKey="feature_push_notifications"
        initialValue={b("feature_push_notifications", false)}
      />
      <FeatureRow
        icon={BarChart2}
        label="Usage Analytics"
        description="Collect anonymized usage data for improvements"
        settingKey="feature_usage_analytics"
        initialValue={b("feature_usage_analytics")}
      />
    </div>
  );
}
