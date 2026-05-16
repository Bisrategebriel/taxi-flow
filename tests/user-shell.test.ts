import { describe, it, expect } from "vitest";

describe("user shell component imports", () => {
  it("BottomNav is importable", async () => {
    const mod = await import("@/components/ui/BottomNav");
    expect(mod.default).toBeDefined();
  });

  it("UserSidebar is importable", async () => {
    const mod = await import("@/components/ui/UserSidebar");
    expect(mod.default).toBeDefined();
  });

  it("InstallPrompt is importable", async () => {
    const mod = await import("@/components/ui/InstallPrompt");
    expect(mod.default).toBeDefined();
  });

  it("PageSkeleton is importable", async () => {
    const mod = await import("@/components/ui/PageSkeleton");
    expect(mod.default).toBeDefined();
  });
});
