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
