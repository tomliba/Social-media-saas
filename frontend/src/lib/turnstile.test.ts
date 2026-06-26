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
  it("rejects a same-length tampered hmac (exercises timingSafeEqual)", () => {
    const value = signTtCookie(1_000_000);
    const dot = value.lastIndexOf(".");
    const sig = value.slice(dot + 1);
    const flipped = (sig[0] === "f" ? "e" : "f") + sig.slice(1);
    expect(verifyTtCookie(value.slice(0, dot + 1) + flipped, 1_000_000 + 1_000)).toBe(false);
  });
  it("returns false (never throws) on a multi-byte sig", () => {
    expect(verifyTtCookie("1000000." + "a".repeat(32) + "é".repeat(32), 1_000_000 + 1_000)).toBe(false);
  });
});
