"use client";

import { useActionState } from "react";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import Link from "next/link";
import { updateProfile, type EditProfileState } from "../_actions";

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  auto_share_location: boolean;
  home_address: string | null;
  work_address: string | null;
  language_pref: string;
  notif_trip_updates: boolean;
  notif_payment_receipts: boolean;
  notif_promotions: boolean;
  email: string;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "am", label: "Amharic (አማርኛ)" },
  { value: "om", label: "Afaan Oromoo" },
  { value: "ti", label: "Tigrinya (ትግርኛ)" },
];

export default function EditProfileForm({ profile }: { profile: ProfileData }) {
  const [state, action, pending] = useActionState<EditProfileState, FormData>(updateProfile, {});

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Edit Profile</h1>
            <p className="text-xs text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <form action={action} className="space-y-4">

          {/* Identity */}
          <Section title="Identity">
            <Field label="Display Name" name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Your full name" />
            <Field label="Phone Number" name="phone" defaultValue={profile.phone ?? ""} placeholder="+251 9XX XXX XXX" type="tel" />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Email Address</label>
              <div className="h-10 rounded-lg border border-border bg-muted/50 px-3 flex items-center text-sm text-muted-foreground">
                {profile.email}
                <span className="ml-auto text-[10px] text-muted-foreground">Not editable</span>
              </div>
            </div>
          </Section>

          {/* Safety & Sharing */}
          <Section title="Safety & Sharing">
            <Field label="Emergency Contact Name" name="emergency_contact_name" defaultValue={profile.emergency_contact_name ?? ""} placeholder="Contact person's name" />
            <Field label="Emergency Contact Phone" name="emergency_contact_phone" defaultValue={profile.emergency_contact_phone ?? ""} placeholder="+251 9XX XXX XXX" type="tel" />
            <Toggle
              name="auto_share_location"
              label="Auto-share location"
              description="Automatically share your live location with your emergency contact during trips"
              defaultChecked={profile.auto_share_location}
            />
          </Section>

          {/* Saved Places */}
          <Section title="Saved Places">
            <Field label="Home Address" name="home_address" defaultValue={profile.home_address ?? ""} placeholder="e.g. Bole, Addis Ababa" />
            <Field label="Work Address" name="work_address" defaultValue={profile.work_address ?? ""} placeholder="e.g. Piazza, Addis Ababa" />
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Language</label>
              <select
                name="language_pref"
                defaultValue={profile.language_pref}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <Toggle
              name="notif_trip_updates"
              label="Trip updates"
              description="Status changes, driver arrival, and trip completion"
              defaultChecked={profile.notif_trip_updates}
            />
            <Toggle
              name="notif_payment_receipts"
              label="Payment receipts"
              description="Confirmation when a payment is processed"
              defaultChecked={profile.notif_payment_receipts}
            />
            <Toggle
              name="notif_promotions"
              label="Promotions & offers"
              description="Discounts, referral bonuses, and special events"
              defaultChecked={profile.notif_promotions}
            />
          </Section>

          {/* Save button */}
          <div className="pt-2 space-y-2">
            {state?.error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-500">
                <CheckCircle size={14} /> Profile updated successfully.
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="h-5 w-9 rounded-full border-2 border-border bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary" />
        <div className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
