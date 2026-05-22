"use client";

import { useTransition } from "react";
import { toggleRouteActive } from "@/app/(admin)/admin/_actions/routes";

interface ToggleRouteButtonProps {
  id: string;
  isActive: boolean;
}

export default function ToggleRouteButton({ id, isActive }: ToggleRouteButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleRouteActive(id, isActive))}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
