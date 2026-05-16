"use client";
import { Bell } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface Props {
  greeting: string;
  displayName: string;
}

export default function DashboardHeader({ greeting, displayName }: Props) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{greeting}</p>
        <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md
            text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell size={18} />
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
