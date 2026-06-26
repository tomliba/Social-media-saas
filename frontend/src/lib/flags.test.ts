import { describe, it, expect } from "vitest";
import { signupHardeningEnabled } from "./flags";

describe("signupHardeningEnabled", () => {
  it("defaults ON when unset (safe default)", () => {
    expect(signupHardeningEnabled(undefined)).toBe(true);
  });

  it("is ON for truthy / unrecognized / empty values", () => {
    expect(signupHardeningEnabled("true")).toBe(true);
    expect(signupHardeningEnabled("1")).toBe(true);
    expect(signupHardeningEnabled("on")).toBe(true);
    expect(signupHardeningEnabled("yes")).toBe(true);
    expect(signupHardeningEnabled("")).toBe(true); // empty ≠ explicit off
  });

  it("is OFF only for explicit off values (trim + case-insensitive)", () => {
    expect(signupHardeningEnabled("false")).toBe(false);
    expect(signupHardeningEnabled("0")).toBe(false);
    expect(signupHardeningEnabled("off")).toBe(false);
    expect(signupHardeningEnabled("no")).toBe(false);
    expect(signupHardeningEnabled(" FALSE ")).toBe(false);
  });
});
