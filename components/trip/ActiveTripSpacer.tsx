"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ActiveTripSpacer() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      setActive(!!localStorage.getItem("taxiflow_active_trip") && pathname !== "/trip");
    } catch { /* storage blocked */ }
  }, [pathname]);

  if (!active) return null;
  return <div className="h-[52px] w-full shrink-0" aria-hidden />;
}
