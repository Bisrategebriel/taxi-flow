// FR-TR-02
"use client";
import { useState, useEffect } from "react";

interface GeoState {
  position: GeolocationCoordinates | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
}

export function useGeolocation(options?: PositionOptions): GeoState {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // Geolocation unavailable — this synchronous setState is intentional and safe
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ position: null, error: null, isLoading: false });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setState({ position: pos.coords, error: null, isLoading: false }),
      (err) => setState((prev) => ({ ...prev, error: err, isLoading: false })),
      options ?? { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
