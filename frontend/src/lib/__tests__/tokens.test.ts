import { describe, it, expect } from "vitest";
import { generateToken, hashToken, isExpired } from "@/lib/tokens";

describe("token helpers", () => {
  it("generateToken returns a raw token and its sha256 hash", () => {
    const { token, tokenHash } = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toBe(token);
  });
  it("hashToken is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });
  it("isExpired compares against now", () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isExpired(new Date(Date.now() + 60_000))).toBe(false);
  });
});
