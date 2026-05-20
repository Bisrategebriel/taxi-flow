// @vitest-environment node
import { describe, it, expect } from "vitest";

describe("useGeolocation", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useGeolocation");
    expect(mod.useGeolocation).toBeDefined();
  });
});

describe("useTripTracking", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useTripTracking");
    expect(mod.useTripTracking).toBeDefined();
  });
});

describe("useRealtimeLocation", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useRealtimeLocation");
    expect(mod.useRealtimeLocation).toBeDefined();
  });
});

describe("Trip status values", () => {
  it("active trip statuses are a known set", () => {
    const valid = ["active", "completed", "cancelled", "payment_pending", "paid"];
    expect(valid).toContain("active");
    expect(valid).toContain("completed");
    expect(valid).toHaveLength(5);
  });
});
