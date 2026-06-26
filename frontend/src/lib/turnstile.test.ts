import { describe, it, expect, beforeEach } from "vitest";
import { signTtCookie, verifyTtCookie } from "./turnstile";

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-please-change";
});

describe("tt_ok cookie sign/verify", () => {
  it("round-trips a freshly signed cookie", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value, 1_000_000 + 5_000)).toBe(true); // 5s later
  });
  it("rejects an expired cookie (>10 min)", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value, 1_000_000 + 11 * 60_000)).toBe(false);
  });
  it("rejects a tampered cookie", () => {
    const value = signTtCookie(1_000_000);
    expect(verifyTtCookie(value + "x", 1_000_000 + 1_000)).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(verifyTtCookie("not-a-cookie", 1_000_000)).toBe(false);
    expect(verifyTtCookie("", 1_000_000)).toBe(false);
  });
});
