import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { haversine } from "@/lib/utils/haversine";
import { getDirections } from "@/lib/ors/client";

// ── haversine ────────────────────────────────────────────────────────────────

describe("haversine", () => {
  it("returns 0 for identical points", () => {
    expect(haversine({ lat: 9.02, lng: 38.75 }, { lat: 9.02, lng: 38.75 })).toBe(0);
  });

  it("returns positive distance between two points", () => {
    const d = haversine({ lat: 9.02, lng: 38.75 }, { lat: 9.03, lng: 38.76 });
    expect(d).toBeGreaterThan(0);
  });

  it("is symmetric", () => {
    const a = { lat: 9.02, lng: 38.75 };
    const b = { lat: 9.05, lng: 38.80 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 10);
  });

  it("returns distance in km (not metres)", () => {
    // Bole to Merkato in Addis — roughly 6–8 km
    const bole = { lat: 8.9806, lng: 38.7989 };
    const merkato = { lat: 9.0213, lng: 38.7401 };
    const d = haversine(bole, merkato);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(15);
  });

  it("sorts terminals correctly by distance from origin", () => {
    const origin = { lat: 9.0, lng: 38.7 };
    const near = { lat: 9.01, lng: 38.71 };
    const far = { lat: 9.1, lng: 38.9 };
    expect(haversine(origin, near)).toBeLessThan(haversine(origin, far));
  });
});

// ── getDirections ─────────────────────────────────────────────────────────────

describe("getDirections", () => {
  const start = { lat: 9.02, lng: 38.75 };
  const end = { lat: 9.05, lng: 38.80 };

  beforeEach(() => {
    vi.stubEnv("ORS_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when ORS_API_KEY is not set", async () => {
    const result = await getDirections(start, end);
    expect(result).toBeNull();
  });

  it("returns null when fetch fails", async () => {
    vi.stubEnv("ORS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await getDirections(start, end);
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it("returns null on non-ok HTTP response", async () => {
    vi.stubEnv("ORS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" })
    );
    const result = await getDirections(start, end);
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it("parses a valid ORS response into polyline + steps", async () => {
    vi.stubEnv("ORS_API_KEY", "test-key");
    const mockResponse = {
      features: [
        {
          geometry: {
            coordinates: [
              [38.75, 9.02],
              [38.775, 9.035],
              [38.8, 9.05],
            ],
          },
          properties: {
            segments: [
              {
                distance: 6000,
                duration: 720,
                steps: [
                  { distance: 3000, duration: 360, instruction: "Head north", name: "Bole Rd", type: 11 },
                  { distance: 3000, duration: 360, instruction: "Arrive", name: "-", type: 10 },
                ],
              },
            ],
          },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockResponse })
    );

    const result = await getDirections(start, end);
    expect(result).not.toBeNull();
    // Coordinates must be flipped to [lat, lng] for Leaflet
    expect(result!.polyline[0]).toEqual([9.02, 38.75]);
    expect(result!.distance_m).toBe(6000);
    expect(result!.steps).toHaveLength(2);
    expect(result!.steps[0].instruction).toBe("Head north");

    vi.unstubAllGlobals();
  });
});
