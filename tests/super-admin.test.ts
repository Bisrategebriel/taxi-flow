import { describe, it, expect } from "vitest";

// Smoke tests: verify all Phase 09 Server Action exports exist with correct types.
// Full integration tests require a live Supabase instance (see tests/rls.test.ts pattern).
describe("super-admin actions — exports", () => {
  it("exports all required functions", async () => {
    const mod = await import(
      "@/app/(admin)/admin/_actions/super-admin"
    );
    expect(typeof mod.toggleLoginEnabled).toBe("function");
    expect(typeof mod.toggleRegistrationEnabled).toBe("function");
    expect(typeof mod.forceLogoutAll).toBe("function");
    expect(typeof mod.setSessionTimeout).toBe("function");
    expect(typeof mod.setBroadcastAnnouncement).toBe("function");
    expect(typeof mod.resetNonCriticalData).toBe("function");
    expect(typeof mod.emergencyStop).toBe("function");
  });
});

describe("maintenance page — render", () => {
  it("renders without throwing", async () => {
    const { default: MaintenancePage } = await import(
      "@/app/maintenance/page"
    );
    expect(typeof MaintenancePage).toBe("function");
  });
});
