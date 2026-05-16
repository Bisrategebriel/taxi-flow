// FR-MP-16 (caching), FR-RS-03, FR-MP-01..05
const ORS_BASE = "https://api.openrouteservice.org/v2";

export interface ORSStep {
  distance: number; // metres
  duration: number; // seconds
  instruction: string;
  name: string;
  type: number;
}

export interface ORSDirectionsResult {
  polyline: [number, number][]; // [lat, lng] pairs ready for Leaflet
  distance_m: number;
  duration_s: number;
  steps: ORSStep[];
}

// In-memory cache keyed by "lat1,lng1:lat2,lng2"
const _cache = new Map<string, { data: ORSDirectionsResult; ts: number }>();
const TTL = 60 * 60 * 1000; // 1 hour

export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<ORSDirectionsResult | null> {
  const key = `${start.lat},${start.lng}:${end.lat},${end.lng}`;
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.warn("[ORS] ORS_API_KEY not set — skipping directions fetch");
    return null;
  }

  const url =
    `${ORS_BASE}/directions/driving-car` +
    `?api_key=${apiKey}` +
    `&start=${start.lng},${start.lat}` + // ORS uses lng,lat order
    `&end=${end.lng},${end.lat}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[ORS] ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const feature = json?.features?.[0];
    if (!feature) return null;

    // ORS GeoJSON geometry is [lng, lat] — flip to [lat, lng] for Leaflet
    const polyline: [number, number][] = (
      feature.geometry.coordinates as [number, number][]
    ).map(([lng, lat]) => [lat, lng]);

    const segment = feature.properties?.segments?.[0];
    const result: ORSDirectionsResult = {
      polyline,
      distance_m: segment?.distance ?? 0,
      duration_s: segment?.duration ?? 0,
      steps: (segment?.steps ?? []) as ORSStep[],
    };

    _cache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("[ORS] fetch error", err);
    return null;
  }
}
