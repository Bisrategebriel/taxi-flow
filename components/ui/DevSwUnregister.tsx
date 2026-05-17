"use client";
import { useEffect } from "react";

// Unregisters any service worker active from a previous production build.
// A CacheFirst SW intercepts HMR chunk requests with stale files in dev.
export default function DevSwUnregister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
    }
  }, []);
  return null;
}
