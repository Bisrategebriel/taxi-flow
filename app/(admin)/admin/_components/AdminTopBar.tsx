"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users":     "Users",
  "/admin/terminals": "Terminals",
  "/admin/routes":    "Routes",
  "/admin/fares":     "Fares & Distances",
  "/admin/trips":     "Trip Monitoring",
  "/admin/payments":  "Payments",
  "/admin/ai-chat":   "AI Chat Control",
  "/admin/settings":  "System Settings",
};

interface AdminTopBarProps {
  fullName: string | null;
  role: string;
}

export default function AdminTopBar({ fullName, role }: AdminTopBarProps) {
  const pathname = usePathname();

  // Match on longest prefix so /admin/terminals/new → "Terminals"
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([key]) => pathname === key || pathname.startsWith(key + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Admin";

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : role === "super_admin" ? "SA" : "AD";

  const displayName = fullName ?? (role === "super_admin" ? "Super Admin" : "Admin");
  const displayRole = role.replace(/_/g, " ");

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      <h2 className="text-sm font-semibold text-foreground min-w-fit">{title}</h2>

      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            placeholder="Search…"
            className="h-8 w-full rounded-md border border-border bg-muted/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notification bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <ThemeToggle />

        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 ml-1 pl-3 border-l border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-xs font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
