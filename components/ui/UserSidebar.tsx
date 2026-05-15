"use client";
// FR-UD-01, FR-UD-02
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "@/components/ui/nav-items";

export default function UserSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border bg-background min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          <span className="text-primary">Taxi</span>
          <span className="text-foreground">Flow</span>
        </Link>
      </div>
      <div className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
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
    </nav>
  );
}
