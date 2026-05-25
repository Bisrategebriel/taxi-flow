# Phase 09 — Super Admin: auth, system, emergency controls

## Pre-flight check

- Phase 08 branch (`phase-08-admin-dashboard`) is merged to `main` (PR #14).
- PR #14 includes the notifications page and system settings page with graceful handling.
- Local Supabase is running (`supabase status` shows all services up).
- `pnpm dev` starts without errors.
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Test credentials (after `supabase db reset`):
  - `superadmin@taxiflow.test / Admin1234!` — Super Admin
  - `admin@taxiflow.test / Admin1234!` — Admin
  - `alice@taxiflow.test / User1234!` — regular user

**Before starting:** read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — Next.js 16 uses `proxy.ts`, not `middleware.ts`.

---

## Numbered task list

### Task 1 — Create branch

```bash
git checkout main && git pull
git checkout -b phase-09-super-admin
```

---

### Task 2 — Create `proxy.ts` (maintenance mode + session refresh)

**File:** `proxy.ts` at the project root (same level as `app/`, `package.json`).

This proxy does two things:
1. Refreshes the Supabase auth session on every request (required by `@supabase/ssr`).
2. Redirects non-admin visitors to `/maintenance` when maintenance mode is active (checked via cookie `tf_maintenance`, set by the Server Action).

```ts
// proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT add code between createServerClient and auth.getUser().
  // See @supabase/ssr docs — this call is required to refresh the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Check maintenance mode via cookie (set by Server Action, avoids DB call in proxy).
  const isMaintenance =
    request.cookies.get("tf_maintenance")?.value === "1";

  if (isMaintenance) {
    // Admin and super_admin bypass maintenance. We check role via a separate cookie
    // set at login time (tf_role), or fall back to letting the admin layout guard itself.
    const role = request.cookies.get("tf_role")?.value;
    const isAdmin = role === "admin" || role === "super_admin";

    const isExcluded =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/track") ||
      pathname === "/maintenance" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/icons") ||
      pathname.startsWith("/taxiflow");

    if (!isAdmin && !isExcluded) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

> **Note on `tf_role` cookie:** The admin layout already reads the profile role from Supabase. We need to set the `tf_role` cookie at login so `proxy.ts` can read it without a DB call. Add the cookie in the auth sign-in Server Action (see Task 3).

---

### Task 3 — Set `tf_role` cookie on login and clear on logout

**File:** `app/auth/signout/actions.ts` (existing) — add cookie clearing.

Find the existing signout action and add:
```ts
cookieStore.delete("tf_role");
cookieStore.delete("tf_maintenance"); // ensure cleared on logout
```

**File:** `app/auth/login/actions.ts` (or wherever sign-in happens) — after successful sign-in, set the role cookie:
```ts
// After confirming sign-in, fetch the profile role and set tf_role cookie
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
const cookieStore = await cookies();
cookieStore.set("tf_role", profile?.role ?? "user", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

**Locate the sign-in action first** (`grep -r "signInWithPassword" app/`) to find the exact file, then add the cookie after successful login.

---

### Task 4 — Update `toggleSetting` to set/clear maintenance cookie

**File:** `app/(admin)/admin/_actions/settings.ts`

At the end of `toggleSetting`, add maintenance cookie sync:

```ts
export async function toggleSetting(key: string, enabled: boolean): Promise<void> {
  const user = await assertAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert({ key, value: enabled as Json, updated_by: user.id }, { onConflict: "key" });

  // Sync maintenance mode to cookie so proxy.ts can check it without a DB call.
  if (key === "maintenance_mode") {
    const cookieStore = await cookies();
    if (enabled) {
      cookieStore.set("tf_maintenance", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      cookieStore.delete("tf_maintenance");
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
}
```

Add `import { cookies } from "next/headers";` at the top of the file.

---

### Task 5 — Create `/maintenance` page

**File:** `app/maintenance/page.tsx`

```tsx
// FR-SS-01
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border mb-6">
        <Wrench size={28} className="text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Under Maintenance</h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        TaxiFlow is temporarily offline for scheduled maintenance. We&apos;ll be
        back shortly. Thank you for your patience.
      </p>
    </div>
  );
}
```

---

### Task 6 — Create Super Admin Server Actions

**File:** `app/(admin)/admin/_actions/super-admin.ts`

```ts
"use server";

// FR-AS-01..04, FR-SS-01..03, FR-EC-01..03
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    throw new Error("Forbidden — Super Admin only");
  }
  return user;
}

async function writeAuditLog(
  actorId: string,
  action: string,
  newData?: Record<string, unknown>
) {
  const service = createServiceClient();
  await service.from("audit_logs").insert({
    actor_id: actorId,
    action,
    table_name: "system_settings",
    new_data: (newData ?? null) as Json,
  });
}

// ── Auth Settings ─────────────────────────────────────────────────────────────

export type SuperAdminState = { error?: string; success?: boolean };

/** FR-AS-02 — Toggle login_enabled */
export async function toggleLoginEnabled(
  enabled: boolean
): Promise<void> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "login_enabled", value: enabled as Json, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(user.id, enabled ? "LOGIN_ENABLED" : "LOGIN_DISABLED");
  revalidatePath("/admin/super-admin");
}

/** FR-AS-01 — Toggle registration_enabled (mirrors FeatureTogglesCard) */
export async function toggleRegistrationEnabled(
  enabled: boolean
): Promise<void> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      {
        key: "registration_enabled",
        value: enabled as Json,
        updated_by: user.id,
      },
      { onConflict: "key" }
    );
  await writeAuditLog(
    user.id,
    enabled ? "REGISTRATION_ENABLED" : "REGISTRATION_DISABLED"
  );
  revalidatePath("/admin/super-admin");
  revalidatePath("/admin/settings");
}

/** FR-AS-03 — Force logout all non-super-admin users */
export async function forceLogoutAll(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();

  // List up to 1000 users; for larger datasets add pagination
  const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { error: "Failed to list users: " + error.message };

  const others = (data?.users ?? []).filter((u) => u.id !== user.id);
  await Promise.allSettled(
    others.map((u) => service.auth.admin.signOut(u.id))
  );

  await writeAuditLog(user.id, "FORCE_LOGOUT_ALL", {
    affected_count: others.length,
  });
  revalidatePath("/admin/super-admin");
  return { success: true };
}

/** FR-AS-04 — Set session timeout minutes (0 = disabled) */
export async function setSessionTimeout(
  _prev: SuperAdminState,
  formData: FormData
): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const minutes = Number(formData.get("session_timeout_minutes"));
  if (isNaN(minutes) || minutes < 0) {
    return { error: "Timeout must be a non-negative number." };
  }
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      {
        key: "session_timeout_minutes",
        value: minutes as Json,
        updated_by: user.id,
      },
      { onConflict: "key" }
    );
  await writeAuditLog(user.id, "SESSION_TIMEOUT_UPDATED", { minutes });
  revalidatePath("/admin/super-admin");
  return { success: true };
}

// ── System Settings ───────────────────────────────────────────────────────────

/** FR-SS-02 — Broadcast announcement (empty string = clear) */
export async function setBroadcastAnnouncement(
  _prev: SuperAdminState,
  formData: FormData
): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const text = (formData.get("announcement") as string)?.trim() ?? "";
  const value: Json = text === "" ? null : text;
  const service = createServiceClient();
  await service
    .from("system_settings")
    .upsert(
      { key: "announcement", value, updated_by: user.id },
      { onConflict: "key" }
    );
  await writeAuditLog(user.id, text ? "ANNOUNCEMENT_SET" : "ANNOUNCEMENT_CLEARED", {
    text: text || null,
  });
  revalidatePath("/admin/super-admin");
  revalidatePath("/");
  return { success: true };
}

/** FR-SS-03 — Reset non-critical data (chat_logs, expired share_tokens) */
export async function resetNonCriticalData(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();

  const [chatResult, tokenResult] = await Promise.allSettled([
    service.from("chat_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000"), // delete all
    service
      .from("share_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString()),
  ]);

  const errors: string[] = [];
  if (chatResult.status === "rejected") errors.push("chat_logs: " + chatResult.reason);
  if (tokenResult.status === "rejected") errors.push("share_tokens: " + tokenResult.reason);

  if (errors.length) return { error: errors.join("; ") };

  await writeAuditLog(user.id, "NON_CRITICAL_DATA_RESET");
  revalidatePath("/admin/super-admin");
  return { success: true };
}

// ── Emergency Controls ────────────────────────────────────────────────────────

/** FR-EC-01..02 — Emergency stop: lock down the platform immediately */
export async function emergencyStop(): Promise<SuperAdminState> {
  const user = await assertSuperAdmin();
  const service = createServiceClient();
  const cookieStore = await cookies();

  const lockKeys = [
    { key: "maintenance_mode", value: true as Json },
    { key: "login_enabled", value: false as Json },
    { key: "registration_enabled", value: false as Json },
    { key: "share_tracking_enabled", value: false as Json },
    { key: "ai_chat_enabled", value: false as Json },
  ];

  await Promise.all(
    lockKeys.map((entry) =>
      service
        .from("system_settings")
        .upsert(
          { ...entry, updated_by: user.id },
          { onConflict: "key" }
        )
    )
  );

  // Sync maintenance cookie so proxy.ts redirects users immediately
  cookieStore.set("tf_maintenance", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  await writeAuditLog(user.id, "EMERGENCY_STOP", {
    keys_locked: lockKeys.map((k) => k.key),
  });

  revalidatePath("/admin/super-admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}
```

---

### Task 7 — Create Super Admin page

**File:** `app/(admin)/admin/super-admin/page.tsx`

```tsx
// FR-AS-01..04, FR-SS-01..03, FR-EC-01..03
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSettings } from "@/app/(admin)/admin/_actions/settings";
import AuthSettingsCard from "./_components/AuthSettingsCard";
import SystemSettingsCard from "./_components/SystemSettingsCard";
import EmergencyControlsCard from "./_components/EmergencyControlsCard";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const settings = await fetchSettings();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Super Admin Controls</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Restricted to Super Admin. All actions are audit-logged.
        </p>
      </div>

      <div className="w-3/4 space-y-5">
        <AuthSettingsCard settings={settings} />
        <SystemSettingsCard settings={settings} />
        <EmergencyControlsCard />
      </div>
    </div>
  );
}
```

---

### Task 8 — Create `AuthSettingsCard`

**File:** `app/(admin)/admin/super-admin/_components/AuthSettingsCard.tsx`

This card manages:
- `login_enabled` toggle (FR-AS-02)
- `registration_enabled` toggle (FR-AS-01)
- Force Logout All button (FR-AS-03)
- Session timeout input (FR-AS-04)

```tsx
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
  const defaultTimeout =
    typeof rawTimeout === "number" ? rawTimeout : 0;

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
          <p className="mt-2 text-xs text-green-500">All sessions terminated.</p>
        )}
        {logoutResult?.error && (
          <p className="mt-2 text-xs text-destructive">{logoutResult.error}</p>
        )}
      </div>
    </div>
  );
}
```

---

### Task 9 — Create `SystemSettingsCard`

**File:** `app/(admin)/admin/super-admin/_components/SystemSettingsCard.tsx`

```tsx
"use client";

// FR-SS-02, FR-SS-03
import { useState, useActionState, useTransition } from "react";
import { Megaphone, Trash2, CheckCircle } from "lucide-react";
import {
  setBroadcastAnnouncement,
  resetNonCriticalData,
  type SuperAdminState,
} from "@/app/(admin)/admin/_actions/super-admin";
import type { SettingsMap } from "@/app/(admin)/admin/_actions/settings";

export default function SystemSettingsCard({ settings }: { settings: SettingsMap }) {
  const rawAnnouncement = settings["announcement"];
  const currentAnnouncement =
    rawAnnouncement && rawAnnouncement !== "null"
      ? String(rawAnnouncement)
      : "";

  const [announcementState, announcementAction, announcementPending] =
    useActionState(setBroadcastAnnouncement, {});

  const [resetPending, startReset] = useTransition();
  const [resetResult, setResetResult] = useState<SuperAdminState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    startReset(async () => {
      const result = await resetNonCriticalData();
      setResetResult(result);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 mt-0.5">
          <Megaphone size={16} className="text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">System Settings</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Broadcasts and data management
          </p>
        </div>
      </div>

      {/* Announcement broadcast */}
      <div className="px-6 py-5 border-b border-border">
        <p className="text-sm font-medium mb-1">Broadcast Announcement</p>
        <p className="text-xs text-muted-foreground mb-3">
          Show a banner message to all users. Leave blank to clear.
        </p>
        <form action={announcementAction} className="space-y-2">
          <textarea
            name="announcement"
            defaultValue={currentAnnouncement}
            rows={3}
            placeholder="e.g. Scheduled maintenance on Saturday 10pm–2am UTC"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={announcementPending}
              className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {announcementPending ? "Saving…" : "Publish"}
            </button>
            {announcementState?.success && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle size={12} /> Published
              </span>
            )}
            {announcementState?.error && (
              <span className="text-xs text-destructive">{announcementState.error}</span>
            )}
          </div>
        </form>
      </div>

      {/* Reset non-critical data */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Trash2 size={15} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">Reset Non-Critical Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clear all chat logs and expired share tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={resetPending}
            onClick={handleReset}
            className={`shrink-0 h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmReset
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted border border-border text-foreground hover:bg-accent"
            }`}
          >
            {resetPending ? "Resetting…" : confirmReset ? "Confirm Reset" : "Reset"}
          </button>
        </div>
        {resetResult?.success && (
          <p className="mt-2 text-xs text-green-500">Data reset complete.</p>
        )}
        {resetResult?.error && (
          <p className="mt-2 text-xs text-destructive">{resetResult.error}</p>
        )}
      </div>
    </div>
  );
}
```

---

### Task 10 — Create `EmergencyControlsCard`

**File:** `app/(admin)/admin/super-admin/_components/EmergencyControlsCard.tsx`

Two-step confirmation before executing. The card shows a red confirmation panel on first click, then the actual action on second click.

```tsx
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
            Immediately lock down the entire platform. This action is logged.
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
                  Maintenance mode will activate, and login will be disabled.
                  Only Super Admins can reverse this.
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
```

---

### Task 11 — Create Audit Log viewer

**File:** `app/(admin)/admin/audit-logs/page.tsx`

```tsx
// FR-EC-03
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AuditLogsView from "./_components/AuditLogsView";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; table?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect("/admin/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const service = createServiceClient();
  let query = service
    .from("audit_logs")
    .select(
      "id, actor_id, action, table_name, record_id, old_data, new_data, ip_address, created_at, profiles(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.action) query = query.ilike("action", `%${params.action}%`);
  if (params.table) query = query.eq("table_name", params.table);

  const { data: logs, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All Super Admin and system events — read-only
        </p>
      </div>
      <AuditLogsView
        logs={logs ?? []}
        totalPages={totalPages}
        currentPage={page}
        filterAction={params.action ?? ""}
        filterTable={params.table ?? ""}
      />
    </div>
  );
}
```

**File:** `app/(admin)/admin/audit-logs/_components/AuditLogsView.tsx`

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: unknown;
  new_data: unknown;
  ip_address: unknown;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "text-green-400 bg-green-500/10 border-green-500/30",
  UPDATE: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  DELETE: "text-red-400 bg-red-500/10 border-red-500/30",
  EMERGENCY_STOP: "text-red-400 bg-red-500/10 border-red-500/30",
  FORCE_LOGOUT_ALL: "text-orange-400 bg-orange-500/10 border-orange-500/30",
};

function actionBadge(action: string) {
  const cls =
    ACTION_COLORS[action] ?? "text-muted-foreground bg-muted border-border";
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {action}
    </span>
  );
}

export default function AuditLogsView({
  logs,
  totalPages,
  currentPage,
  filterAction,
  filterTable,
}: {
  logs: AuditLog[];
  totalPages: number;
  currentPage: number;
  filterAction: string;
  filterTable: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [localAction, setLocalAction] = useState(filterAction);
  const [localTable, setLocalTable] = useState(filterTable);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (localAction) params.set("action", localAction);
    else params.delete("action");
    if (localTable) params.set("table", localTable);
    else params.delete("table");
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by action…"
            value={localAction}
            onChange={(e) => setLocalAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="pl-8 pr-3 h-8 w-48 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by table…"
          value={localTable}
          onChange={(e) => setLocalTable(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          className="px-3 h-8 w-40 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={applyFilters}
          className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(log.profiles as { full_name: string | null } | null)?.full_name ??
                        log.actor_id?.slice(0, 8) ??
                        "system"}
                    </td>
                    <td className="px-4 py-3">{actionBadge(log.action)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.table_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.record_id ? log.record_id.slice(0, 8) + "…" : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted disabled:opacity-40 hover:bg-accent"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted disabled:opacity-40 hover:bg-accent"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Task 12 — Add Announcement Banner to user layout

**File:** `components/ui/AnnouncementBanner.tsx` (new, client component)

```tsx
"use client";

// FR-SS-02
import { useState } from "react";
import { X, Megaphone } from "lucide-react";

export default function AnnouncementBanner({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-center gap-3 bg-primary/10 border-b border-primary/20 px-4 py-2.5">
      <Megaphone size={13} className="text-primary shrink-0" />
      <p className="flex-1 text-xs text-foreground leading-relaxed">{text}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded-md p-0.5 hover:bg-primary/20 transition-colors"
      >
        <X size={13} className="text-muted-foreground" />
      </button>
    </div>
  );
}
```

**File:** `app/(user)/layout.tsx` — update to fetch and render announcement:

```tsx
// Add at the top: import AnnouncementBanner
import AnnouncementBanner from "@/components/ui/AnnouncementBanner";
import { createServiceClient } from "@/lib/supabase/service";
```

Inside the layout server component, after the auth check, fetch the announcement:

```tsx
const service = createServiceClient();
const { data: announcementRow } = await service
  .from("system_settings")
  .select("value")
  .eq("key", "announcement")
  .single();

const announcement =
  announcementRow?.value && announcementRow.value !== "null"
    ? String(announcementRow.value)
    : null;
```

Then in JSX, add before `<UserSidebar />`:

```tsx
{announcement && <AnnouncementBanner text={announcement} />}
```

The full updated layout return should look like:

```tsx
return (
  <div className="flex min-h-screen bg-background flex-col">
    {announcement && <AnnouncementBanner text={announcement} />}
    <div className="flex flex-1 min-h-0">
      <ActiveTripBanner />
      <UserSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <ActiveTripSpacer />
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  </div>
);
```

---

### Task 13 — Update AdminSidebar to add Super Admin + Audit Logs links

**File:** `app/(admin)/admin/_components/AdminSidebar.tsx`

The sidebar already receives `role` prop (from layout.tsx). Add these nav items conditionally for `super_admin` role:

```tsx
const NAV_ITEMS = [
  // ... existing items
  { label: "System Settings",   href: "/admin/settings",       icon: Settings },
];

// Super Admin only items — rendered separately at the bottom
const SUPER_ADMIN_NAV = [
  { label: "Super Admin",       href: "/admin/super-admin",    icon: ShieldAlert },
  { label: "Audit Log",         href: "/admin/audit-logs",     icon: ClipboardList },
];
```

Import `ShieldAlert, ClipboardList` from `lucide-react`.

In the sidebar JSX, after the main nav items, add:

```tsx
{role === "super_admin" && (
  <>
    <div className="px-3 pt-2 pb-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
        Super Admin
      </p>
    </div>
    {SUPER_ADMIN_NAV.map((item) => (
      <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
    ))}
  </>
)}
```

You'll need to make `AdminSidebar` receive and use the `role` prop — verify the function signature uses it (the layout already passes `role={profile.role}`).

---

### Task 14 — Add login toggle to auth flow (enforcement)

The `login_enabled` setting now exists but the login form doesn't check it yet. Update the sign-in Server Action to check this setting before allowing login:

**In the sign-in Server Action**, after validating credentials and before calling `signInWithPassword`:

```ts
// Check login_enabled
const service = createServiceClient();
const { data: loginSetting } = await service
  .from("system_settings")
  .select("value")
  .eq("key", "login_enabled")
  .single();

const loginEnabled = loginSetting?.value !== false && loginSetting?.value !== "false";
if (!loginEnabled) {
  return { error: "Login is currently disabled. Please try again later." };
}
```

Find the sign-in action file by searching: `grep -r "signInWithPassword" app/`

---

### Task 15 — Migration: add `session_timeout_minutes` seed entry

**File:** `supabase/seed.sql` — add one line to the system_settings insert block:

```sql
('session_timeout_minutes', '0', 'Session inactivity timeout in minutes (0 = disabled)'),
```

Since seed.sql already has the other keys, just add this entry.

**Also add a Supabase migration** so the setting exists in production:

**File:** `supabase/migrations/20260526000001_phase09_settings.sql`

```sql
-- FR-AS-04: add session_timeout_minutes setting if not present
INSERT INTO public.system_settings (key, value, description)
VALUES ('session_timeout_minutes', '0', 'Session inactivity timeout in minutes (0 = disabled)')
ON CONFLICT (key) DO NOTHING;
```

---

### Task 16 — Tests

**File:** `tests/super-admin.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";

describe("Super Admin actions", () => {
  it("emergencyStop returns success shape", async () => {
    // smoke test — the real function requires Supabase; this just validates the export exists
    const mod = await import("@/app/(admin)/admin/_actions/super-admin");
    expect(typeof mod.emergencyStop).toBe("function");
    expect(typeof mod.forceLogoutAll).toBe("function");
    expect(typeof mod.setBroadcastAnnouncement).toBe("function");
    expect(typeof mod.resetNonCriticalData).toBe("function");
  });
});
```

**File:** `tests/maintenance-page.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MaintenancePage from "@/app/maintenance/page";

describe("MaintenancePage", () => {
  it("renders maintenance heading", () => {
    render(<MaintenancePage />);
    expect(screen.getByText("Under Maintenance")).toBeTruthy();
  });
});
```

---

### Task 17 — Commit

```bash
pnpm build --webpack   # must be green
pnpm test              # must pass
pnpm lint              # must be clean
git add -A
git commit -m "phase-9: super admin controls, audit log, maintenance proxy, announcement banner"
git push -u origin phase-09-super-admin
```

---

## Acceptance script

Run these checks in order after all tasks complete:

```bash
# 1. Build must succeed
pnpm build --webpack

# 2. Tests must pass
pnpm test

# 3. Lint must be clean
pnpm lint

# 4. Type-check
pnpm tsc --noEmit
```

**Manual verification (with local Supabase running + pnpm dev):**

1. **Maintenance mode:**
   - Sign in as super admin → Settings → Danger Zone → Activate maintenance
   - In a new incognito window, visit `http://localhost:3000/dashboard` → should redirect to `/maintenance`
   - Admin pages (`/admin/*`) should still be accessible
   - Sign in as super admin → Deactivate → incognito window can access again

2. **Super Admin page:**
   - Sign in as `admin@taxiflow.test` → no "Super Admin" section in sidebar
   - Sign in as `superadmin@taxiflow.test` → "Super Admin" section visible
   - `/admin/super-admin` accessible; `/admin/audit-logs` accessible
   - Visiting `/admin/super-admin` as `admin@taxiflow.test` → redirects to `/admin/dashboard`

3. **Force Logout All:**
   - Sign in as alice in another browser tab
   - As super admin, click Force Logout → Confirm
   - alice's tab should lose session (next navigation redirects to login)

4. **Announcement banner:**
   - As super admin, set announcement text: "Test announcement"
   - Sign in as alice → user dashboard shows yellow/blue banner with the text
   - Clear the announcement → banner disappears on reload

5. **Emergency Stop (two-step):**
   - Click Emergency Stop → confirmation panel appears
   - Click Cancel → returns to idle state (no action taken)
   - Click Emergency Stop → Confirm → platform locks (maintenance mode, login disabled)
   - Verify audit_logs has EMERGENCY_STOP entry

6. **Audit Log:**
   - Perform a few Super Admin actions
   - Visit `/admin/audit-logs` → events appear with correct actions and actor names
   - Filter by action "EMERGENCY_STOP" → only matching rows shown

7. **Login disabled enforcement:**
   - As super admin, toggle Login to Off on super-admin page
   - Sign out → try to sign back in → get "Login is currently disabled" error
   - Re-enable login as super admin (you remain signed in as super admin)

---

## Common failure modes

### `proxy.ts` not picked up / maintenance redirect not working
- Confirm the file is at the **project root** (same level as `app/`, `package.json`, `next.config.ts`), not inside `app/`.
- Check that the export name is `proxy` (not `middleware`, not default).
- The `tf_maintenance` cookie is `httpOnly` — it won't appear in DevTools Application tab cookies from JavaScript. Check via the Network tab → request headers.
- If the maintenance cookie is not being set, ensure `cookies()` is imported from `next/headers` in `settings.ts` and that the Server Action runs server-side.

### `tf_role` cookie not being read in proxy
- The login Server Action must set `tf_role` after a successful sign-in. Find the exact file with `grep -r "signInWithPassword" app/` and add the cookie-setting code there.
- If users were already logged in before the cookie was added, they won't have `tf_role`. For testing, sign out and back in.

### Super admin page visible to regular admins
- The page does a server-side `redirect` if `role !== 'super_admin'`. If it's not redirecting, check that the profile query is returning the correct role and that the redirect call is reached.

### `auth.admin.listUsers()` / `auth.admin.signOut()` failing
- These require the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`), not the anon key. Confirm `createServiceClient()` uses `process.env.SUPABASE_SERVICE_ROLE_KEY` and that it's set in `.env.local`.

### Audit log shows no `profiles` join
- The `audit_logs.actor_id` is a UUID reference to `auth.users`, not `public.profiles`. The select includes `profiles(full_name)` which joins via the FK `actor_id → auth.users → profiles.id`. This requires the service role client (RLS bypass). If it returns null, check the join syntax — Supabase PostgREST uses `profiles(full_name)` for the join name matching the table name.

### `useActionState` not found
- Import from `react`, not `react-dom`: `import { useActionState } from "react"`. This is Next.js 16 / React 19.

### `AnnouncementBanner` causes hydration mismatch
- The `dismissed` state starts as `false` on both server and client — no hydration issue. But if using `localStorage` to persist dismissal across reloads, wrap in `useEffect` to avoid SSR/client mismatch.

---

## The Claude Code prompt

```
We are implementing Phase 09 of the TaxiFlow build plan: Super Admin controls, audit log viewer, maintenance mode proxy, and announcement banner.

Read CLAUDE.md and AGENTS.md first. Then read docs/phases/PHASE-09-super-admin.md top to bottom before writing any code.

Key context:
- This is Next.js 16 — use proxy.ts at the project root (NOT middleware.ts). The export must be named `proxy`. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
- Use `useActionState` from `react` (not `useFormState` from `react-dom`).
- Server Actions use `cookies()` from `next/headers` — they can set cookies.
- The service role client is in lib/supabase/service.ts — use it for admin operations that bypass RLS.
- Do NOT add `any` without a justification comment.
- Do NOT create documentation files.
- Implement all 17 tasks in order. Mark each task done before moving to the next.
- After all tasks: run pnpm build --webpack, pnpm test, pnpm lint, pnpm tsc --noEmit — all must pass before committing.

Start with Task 1 (create the branch), then proceed through the task list.
```
