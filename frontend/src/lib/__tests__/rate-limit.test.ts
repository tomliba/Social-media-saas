import { describe, it, expect } from "vitest";
import { ipFromRequest } from "@/lib/rate-limit";

describe("ipFromRequest", () => {
  it("reads the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(ipFromRequest(req)).toBe("1.2.3.4");
  });
  it("falls back to 'unknown'", () => {
    expect(ipFromRequest(new Request("http://x"))).toBe("unknown");
  });
});
