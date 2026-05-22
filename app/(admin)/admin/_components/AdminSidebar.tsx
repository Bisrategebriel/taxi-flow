"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Navigation,
  DollarSign,
  Car,
  CreditCard,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { signout } from "@/app/auth/signout/actions";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users",           href: "/admin/users",     icon: Users },
  { label: "Terminals",       href: "/admin/terminals", icon: MapPin },
  { label: "Routes",          href: "/admin/routes",    icon: Navigation },
  { label: "Fares & Distances", href: "/admin/fares",   icon: DollarSign },
  { label: "Trip Monitoring", href: "/admin/trips",     icon: Car },
  { label: "Payments",        href: "/admin/payments",  icon: CreditCard },
  { label: "AI Chat Control", href: "/admin/ai-chat",   icon: Bot },
  { label: "System Settings", href: "/admin/settings",  icon: Settings },
];

interface AdminSidebarProps {
  role: string;
  email: string;
}

export default function AdminSidebar({ email }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 border-r border-border bg-card min-h-screen"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">TF</span>
        </div>
        <div>
          <p className="text-sm font-bold leading-none">
            <span className="text-primary">Taxi</span>
            <span className="text-foreground">Flow</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Admin Console</p>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin/dashboard"
              ? pathname === "/admin/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors border-l-2",
                active
                  ? "bg-primary/10 text-primary border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
              )}
            >
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-border">
        <p className="px-3 mb-2 text-xs text-muted-foreground truncate">{email}</p>
        <form action={signout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l-2 border-transparent"
          >
            <LogOut size={17} strokeWidth={1.75} />
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  );
}
