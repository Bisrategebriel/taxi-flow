// @vitest-environment node
import { describe, it, expect } from "vitest";

describe("Groq client", () => {
  it("groq is importable without throwing", async () => {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? "test-stub";
    const mod = await import("@/lib/groq/client");
    expect(mod.groq).toBeDefined();
    expect(mod.GROQ_MODEL).toBe("llama-3.3-70b-versatile");
  });
});

describe("Groq tools", () => {
  it("toolDeclarations exports four tools", async () => {
    const { toolDeclarations } = await import("@/lib/groq/tools");
    expect(toolDeclarations).toHaveLength(4);
    const names = toolDeclarations.map((t) => t.function?.name);
    expect(names).toContain("get_terminals");
    expect(names).toContain("get_routes");
    expect(names).toContain("get_fare");
    expect(names).toContain("get_route_details");
  });

  it("all tool declarations have type 'function'", async () => {
    const { toolDeclarations } = await import("@/lib/groq/tools");
    for (const tool of toolDeclarations) {
      expect(tool.type).toBe("function");
    }
  });
});

describe("System prompt", () => {
  it("SYSTEM_PROMPT is a non-empty string", async () => {
    const { SYSTEM_PROMPT } = await import("@/lib/groq/system-prompt");
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });
});
