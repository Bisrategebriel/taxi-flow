"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { changePassword, type ChangePasswordState } from "./_actions";

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {}
  );
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  function toggle(field: keyof typeof show) {
    setShow((s) => ({ ...s, [field]: !s[field] }));
  }

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
            <h1 className="text-lg font-bold">Change Password</h1>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
        </div>

        {state.success ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="text-base font-semibold">Password updated</p>
            <p className="text-sm text-muted-foreground">Your password has been changed successfully.</p>
            <Link
              href="/profile"
              className="mt-2 h-10 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground flex items-center hover:bg-primary/90 transition-colors"
            >
              Back to Profile
            </Link>
          </div>
        ) : (
          <form action={action} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Security</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <PasswordField
                name="current_password"
                label="Current Password"
                show={show.current}
                onToggle={() => toggle("current")}
              />
              <PasswordField
                name="new_password"
                label="New Password"
                show={show.next}
                onToggle={() => toggle("next")}
                hint="Minimum 8 characters"
              />
              <PasswordField
                name="confirm_password"
                label="Confirm New Password"
                show={show.confirm}
                onToggle={() => toggle("confirm")}
              />

              {state.error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {pending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Lock size={15} />
                )}
                {pending ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  name,
  label,
  show,
  onToggle,
  hint,
}: {
  name: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          required
          className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
