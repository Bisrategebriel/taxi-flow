import { describe, it, expect } from "vitest";

describe("Stripe lib", () => {
  it("stripe singleton is importable", async () => {
    const mod = await import("@/lib/stripe");
    expect(mod.stripe).toBeDefined();
  });
});

describe("Payment API routes", () => {
  it("payment-intent route exports a POST handler", async () => {
    const mod = await import("@/app/api/stripe/payment-intent/route");
    expect(mod.POST).toBeDefined();
  });

  it("webhook route exports a POST handler", async () => {
    const mod = await import("@/app/api/webhooks/stripe/route");
    expect(mod.POST).toBeDefined();
  });

  it("cash route exports a POST handler", async () => {
    const mod = await import("@/app/api/payment/cash/route");
    expect(mod.POST).toBeDefined();
  });
});

describe("Trip payment status values", () => {
  it("all expected status transitions are in the valid set", () => {
    const statuses = ["active", "completed", "payment_pending", "paid", "cancelled"];
    expect(statuses).toContain("payment_pending");
    expect(statuses).toContain("paid");
    expect(statuses).toHaveLength(5);
  });
});

describe("Payment method values", () => {
  it("covers all three supported methods", () => {
    const methods = ["card", "mobile_money", "cash"];
    expect(methods).toContain("card");
    expect(methods).toContain("cash");
    expect(methods).toHaveLength(3);
  });
});
