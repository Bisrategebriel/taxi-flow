import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Tag,
  XCircle,
  BellRing,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NotifTypeConfig = {
  icon: LucideIcon;
  textCls: string;
  bgCls: string;
  borderCls: string;
  label: string;
};

export const NOTIF_TYPE_CONFIG: Record<string, NotifTypeConfig> = {
  info: {
    icon: Info,
    textCls: "text-primary",
    bgCls: "bg-primary/10",
    borderCls: "border-primary/30",
    label: "Info",
  },
  success: {
    icon: CheckCircle2,
    textCls: "text-green-600 dark:text-green-400",
    bgCls: "bg-green-500/10",
    borderCls: "border-green-500/30",
    label: "Success",
  },
  warning: {
    icon: AlertTriangle,
    textCls: "text-amber-600 dark:text-amber-400",
    bgCls: "bg-amber-500/10",
    borderCls: "border-amber-500/30",
    label: "Warning",
  },
  promotional: {
    icon: Tag,
    textCls: "text-purple-600 dark:text-purple-400",
    bgCls: "bg-purple-500/10",
    borderCls: "border-purple-500/30",
    label: "Promo",
  },
  decline: {
    icon: XCircle,
    textCls: "text-red-600 dark:text-red-400",
    bgCls: "bg-red-500/10",
    borderCls: "border-red-500/30",
    label: "Decline",
  },
  alert: {
    icon: BellRing,
    textCls: "text-orange-600 dark:text-orange-400",
    bgCls: "bg-orange-500/10",
    borderCls: "border-orange-500/30",
    label: "Alert",
  },
  reminder: {
    icon: Clock,
    textCls: "text-cyan-600 dark:text-cyan-400",
    bgCls: "bg-cyan-500/10",
    borderCls: "border-cyan-500/30",
    label: "Reminder",
  },
};

export function getNotifConfig(type: string): NotifTypeConfig {
  return NOTIF_TYPE_CONFIG[type] ?? NOTIF_TYPE_CONFIG["info"];
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
