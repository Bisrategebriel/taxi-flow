"use client";

import { useActionState } from "react";
import { Globe, Save } from "lucide-react";
import {
  saveGeneralSettings,
  type FormState,
  type SettingsMap,
} from "@/app/(admin)/admin/_actions/settings";

export default function GeneralCard({ settings }: { settings: SettingsMap }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveGeneralSettings,
    {}
  );

  const str = (key: string, fallback: string) =>
    typeof settings[key] === "string" ? (settings[key] as string) : fallback;
  const num = (key: string, fallback: number) =>
    typeof settings[key] === "number" ? (settings[key] as number) : fallback;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
          <Globe size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">General</p>
          <p className="text-xs text-muted-foreground mt-0.5">Basic platform configuration</p>
        </div>
      </div>

      {/* Form */}
      <form action={formAction} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Platform Name</label>
            <input
              name="platform_name"
              type="text"
              required
              defaultValue={str("platform_name", "TaxiFlow")}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Support Email</label>
            <input
              name="support_email"
              type="email"
              required
              defaultValue={str("support_email", "support@taxiflow.gh")}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Max Route Distance (km)</label>
            <input
              name="max_route_distance_km"
              type="number"
              min="1"
              required
              defaultValue={num("max_route_distance_km", 150)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-xs">
            {state.error && <p className="text-destructive">{state.error}</p>}
            {state.success && <p className="text-green-500">Changes saved.</p>}
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
