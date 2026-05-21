"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinOff } from "lucide-react";
import Link from "next/link";

export default function GetLocation({ terminalId }: { terminalId: string }) {
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        router.replace(`/terminals/${terminalId}/directions?lat=${lat}&lng=${lng}`);
      },
      () => setDenied(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [terminalId, router]);

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center gap-4">
        <MapPinOff size={40} className="text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">Location access denied</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Enable location access in your browser settings to get directions to this terminal.
          </p>
        </div>
        <Link href="/terminals" className="text-sm text-primary hover:underline">
          Back to terminals
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center gap-3">
      <Loader2 size={32} className="text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Getting your location…</p>
    </div>
  );
}
