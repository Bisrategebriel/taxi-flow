"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Car,
  CreditCard,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  ChevronDown,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { signout } from "@/app/auth/signout/actions";

export interface AdminNotification {
  id: string;
  message: string;
  timestamp: string;
  type: "trip" | "payment" | "user";
  badge: "info" | "success" | "error";
}

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard":     "Dashboard",
  "/admin/users":         "Users",
  "/admin/terminals":     "Terminals",
  "/admin/routes":        "Routes",
  "/admin/fares":         "Fares & Distances",
  "/admin/trips":         "Trip Monitoring",
  "/admin/payments":      "Payments",
  "/admin/notifications": "Notifications",
  "/admin/ai-chat":       "AI Chat Control",
  "/admin/settings":      "System Settings",
};

const SEARCH_PLACEHOLDER: Record<string, string> = {
  "/admin/users":      "Search users…",
  "/admin/terminals":  "Search terminals…",
  "/admin/routes":     "Search routes…",
  "/admin/trips":      "Search trips…",
  "/admin/payments":   "Search payments…",
  "/admin/fares":      "Search fares…",
};

/* Pages that support ?search= URL param */
const SEARCHABLE_PAGES = new Set([
  "/admin/users",
  "/admin/terminals",
  "/admin/routes",
  "/admin/trips",
  "/admin/payments",
  "/admin/fares",
]);

interface AdminTopBarProps {
  fullName: string | null;
  role: string;
  notifications: AdminNotification[];
}

function timeAgo(isoString: string) {
  const s = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function TopBarSearch({ section }: { section: string | null }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [value, setValue] = useState("");

  const placeholder = section ? (SEARCH_PLACEHOLDER[section] ?? "Search…") : "Search…";

  function handleChange(raw: string) {
    setValue(raw);
    if (!section) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (raw) params.set("search", raw);
      router.push(raw ? `${section}?${params.toString()}` : section);
    }, 300);
  }

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={!section}
        className="h-8 w-full rounded-md border border-border bg-muted/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function AdminTopBar({ fullName, role, notifications }: AdminTopBarProps) {
  const pathname = usePathname();
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  const bellRef  = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!bellRef.current?.contains(e.target as Node))  setBellOpen(false);
      if (!avatarRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const title =
    Object.entries(PAGE_TITLES)
      .filter(([key]) => pathname === key || pathname.startsWith(key + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Admin";

  // resolve active searchable section
  const activeSection =
    [...SEARCHABLE_PAGES].find(
      (p) => pathname === p || pathname.startsWith(p + "/")
    ) ?? null;

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : role === "super_admin" ? "SA" : "AD";

  const displayName = fullName ?? (role === "super_admin" ? "Super Admin" : "Admin");
  const displayRole = role.replace(/_/g, " ");

  const notifBadgeClass = (badge: AdminNotification["badge"]) =>
    badge === "success"
      ? "text-green-500"
      : badge === "error"
      ? "text-destructive"
      : "text-blue-500";

  const NotifIcon = (type: AdminNotification["type"]) =>
    type === "trip" ? Car : type === "payment" ? CreditCard : UserPlus;

  const BadgeIcon = (badge: AdminNotification["badge"]) =>
    badge === "success" ? CheckCircle2 : badge === "error" ? AlertCircle : Info;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6 z-30">
      <h2 className="text-sm font-semibold text-foreground min-w-fit">{title}</h2>

      <div className="flex-1 max-w-xs">
        <TopBarSearch key={activeSection} section={activeSection} />
      </div>

      <div className="ml-auto flex items-center gap-1">

        {/* ── Notification bell ─────────────────────────────────────── */}
        <div ref={bellRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => { setBellOpen((o) => !o); setAvatarOpen(false); }}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell size={17} />
            {!hasRead && notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {!hasRead && notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setHasRead(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">{notifications.length} total</span>
                )}
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((n) => {
                  const NIcon = NotifIcon(n.type);
                  const BIcon = BadgeIcon(n.badge);
                  return (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${hasRead ? "opacity-50" : ""}`}>
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <NIcon size={13} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">{n.message}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <BIcon size={10} className={notifBadgeClass(n.badge)} />
                          <span className="text-[10px] text-muted-foreground">{timeAgo(n.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">No recent notifications</p>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border">
                <a
                  href="/admin/notifications"
                  className="block text-center text-xs text-primary hover:underline"
                  onClick={() => setBellOpen(false)}
                >
                  View all notifications →
                </a>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* ── Avatar / user dropdown ────────────────────────────────── */}
        <div ref={avatarRef} className="relative ml-1 pl-3 border-l border-border">
          <button
            type="button"
            onClick={() => { setAvatarOpen((o) => !o); setBellOpen(false); }}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block leading-none text-left">
              <p className="text-xs font-semibold text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{displayRole}</p>
            </div>
            <ChevronDown
              size={13}
              className={`text-muted-foreground transition-transform ${avatarOpen ? "rotate-180" : ""}`}
            />
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-semibold truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{displayRole}</p>
              </div>
              <div className="p-1.5">
                <form action={signout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
