"use client";

// FR-SS-02
import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";

export default function AnnouncementBanner({ text }: { text: string }) {
  // null = unknown until after hydration, avoids flash when already dismissed
  const [visible, setVisible] = useState<boolean | null>(null);
  const storageKey = `ann_dismissed_${text.slice(0, 60)}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(localStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative flex items-center gap-3 bg-primary/10 border-b border-primary/20 px-4 py-2.5">
      <Megaphone size={13} className="text-primary shrink-0" />
      <p className="flex-1 text-xs text-foreground leading-relaxed">{text}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded-md p-0.5 hover:bg-primary/20 transition-colors"
      >
        <X size={13} className="text-muted-foreground" />
      </button>
    </div>
  );
}
