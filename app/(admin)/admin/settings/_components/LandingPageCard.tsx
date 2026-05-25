"use client";

import { useActionState, useState } from "react";
import { Monitor, Save } from "lucide-react";
import {
  saveLandingSettings,
  type FormState,
  type SettingsMap,
} from "@/app/(admin)/admin/_actions/settings";

function Toggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={on ? "1" : "0"} />
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
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
        onClick={() => setOn((v) => !v)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
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
  );
}

export default function LandingPageCard({ settings }: { settings: SettingsMap }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveLandingSettings,
    {}
  );

  const str = (key: string, fallback: string) =>
    typeof settings[key] === "string" ? (settings[key] as string) : fallback;
  const bool = (key: string, fallback: boolean) =>
    typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 mt-0.5">
          <Monitor size={16} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Landing Page</p>
          <p className="text-xs text-muted-foreground mt-0.5">Public homepage configuration</p>
        </div>
      </div>

      <form action={formAction} className="p-6 space-y-6">
        {/* Hero Content */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Hero Content
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Hero Headline</label>
            <input
              name="landing_hero_headline"
              type="text"
              required
              defaultValue={str("landing_hero_headline", "Navigate the city with confidence")}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Hero Subtitle</label>
            <textarea
              name="landing_hero_subtitle"
              rows={3}
              defaultValue={str("landing_hero_subtitle", "TaxiFlow maps Addis Ababa's shared taxi network.")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">CTA Button Text</label>
              <input
                name="landing_cta_text"
                type="text"
                required
                defaultValue={str("landing_cta_text", "Get Started — It's Free")}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Contact Info */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Contact Info
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Phone</label>
              <input
                name="landing_contact_phone"
                type="text"
                defaultValue={str("landing_contact_phone", "+251 000 000 0000")}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Address</label>
              <input
                name="landing_contact_address"
                type="text"
                defaultValue={str("landing_contact_address", "Addis Ababa, Ethiopia")}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Section visibility */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Page Sections
          </p>

          <div className="flex items-center justify-between py-2.5 px-4 rounded-lg border border-border bg-background/50">
            <div>
              <p className="text-sm font-medium">Features Section</p>
              <p className="text-xs text-muted-foreground mt-0.5">Show the product features grid</p>
            </div>
            <Toggle
              name="landing_show_features"
              defaultChecked={bool("landing_show_features", true)}
            />
          </div>

          <div className="flex items-center justify-between py-2.5 px-4 rounded-lg border border-border bg-background/50">
            <div>
              <p className="text-sm font-medium">How It Works Section</p>
              <p className="text-xs text-muted-foreground mt-0.5">Show the 3-step onboarding flow</p>
            </div>
            <Toggle
              name="landing_show_how_it_works"
              defaultChecked={bool("landing_show_how_it_works", true)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-xs">
            {state.error && <p className="text-destructive">{state.error}</p>}
            {state.success && <p className="text-green-500">Landing page updated.</p>}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save size={13} />
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
