"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ActiveTripSpacer() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(!!localStorage.getItem("taxiflow_active_trip") && pathname !== "/trip");
    } catch { /* storage blocked */ }
  }, [pathname]);

  if (!active) return null;
  return <div className="h-13 w-full shrink-0" aria-hidden />;
}
