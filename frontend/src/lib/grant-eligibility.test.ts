import { describe, it, expect } from "vitest";
import { isGrantEligible } from "./grant-eligibility";

describe("isGrantEligible", () => {
  it("eligible when email verified and not banned", () => {
    expect(isGrantEligible({ emailVerified: new Date(), bannedAt: null })).toBe(true);
  });
  it("NOT eligible when email is unverified", () => {
    expect(isGrantEligible({ emailVerified: null, bannedAt: null })).toBe(false);
  });
  it("NOT eligible when banned", () => {
    expect(isGrantEligible({ emailVerified: new Date(), bannedAt: new Date() })).toBe(false);
  });
});
