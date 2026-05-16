// FR-UD-01, FR-UD-02
import { Home, Navigation, MapPin, MessageSquare, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Routes", href: "/route-search", icon: Navigation },
  { label: "Terminals", href: "/terminals", icon: MapPin },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: User },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
