"use client";
// NFR-CO-01, NFR-CO-03
import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (dismissed || deferredPrompt === null) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div
      role="banner"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 rounded-xl border border-border bg-background
        px-4 py-3 shadow-lg text-sm max-w-xs w-[calc(100%-2rem)]"
    >
      <span className="flex-1 text-foreground font-medium">
        Install TaxiFlow for the best experience
      </span>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold
          text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
