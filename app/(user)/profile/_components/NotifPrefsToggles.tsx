"use client";

import { useState, useTransition } from "react";
import { toggleNotifPref } from "../_actions";

interface NotifPrefs {
  notif_trip_updates: boolean;
  notif_payment_receipts: boolean;
  notif_promotions: boolean;
}

const PREFS: Array<{
  key: keyof NotifPrefs;
  label: string;
  description: string;
}> = [
  {
    key: "notif_trip_updates",
    label: "Trip updates",
    description: "Status changes and trip completion alerts",
  },
  {
    key: "notif_payment_receipts",
    label: "Payment receipts",
    description: "Confirmation when a payment is processed",
  },
  {
    key: "notif_promotions",
    label: "Promotions & offers",
    description: "Discounts, referrals, and special events",
  },
];

export default function NotifPrefsToggles({ prefs }: { prefs: NotifPrefs }) {
  const [state, setState] = useState(prefs);
  const [, startTransition] = useTransition();

  function toggle(key: keyof NotifPrefs) {
    const newValue = !state[key];
    setState((s) => ({ ...s, [key]: newValue }));
    startTransition(async () => {
      const result = await toggleNotifPref(key, newValue);
      if (result.error) {
        setState((s) => ({ ...s, [key]: !newValue }));
      }
    });
  }

  return (
    <>
      {PREFS.map((pref, i) => (
        <div key={pref.key}>
          {i > 0 && <div className="border-t border-border" />}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium text-foreground">{pref.label}</p>
              <p className="text-xs text-muted-foreground">{pref.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[pref.key]}
              onClick={() => toggle(pref.key)}
              className={`relative shrink-0 h-6 w-11 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                state[pref.key]
                  ? "bg-primary border-primary"
                  : "bg-muted border-border"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  state[pref.key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
