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
  LogOut,
} from "lucide-react";
import { signout } from "@/app/auth/signout/actions";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Terminals", href: "/admin/terminals", icon: MapPin },
  { label: "Routes", href: "/admin/routes", icon: Navigation },
  { label: "Fares", href: "/admin/fares", icon: DollarSign },
  { label: "Trips", href: "/admin/trips", icon: Car },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
];

interface AdminSidebarProps {
  role: string;
  email: string;
}

export default function AdminSidebar({ role, email }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border bg-background min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <Link href="/admin/dashboard" className="text-lg font-bold tracking-tight">
          <span className="text-primary">Taxi</span>
          <span className="text-foreground">Flow</span>
        </Link>
        <span className="text-xs text-muted-foreground font-medium">Admin</span>
      </div>

      <div className="flex flex-col gap-1 p-3 flex-1">
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
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-border space-y-2">
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary">
            {role}
          </span>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
