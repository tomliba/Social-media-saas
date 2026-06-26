import { describe, it, expect } from "vitest";
import { isDisposableEmail } from "./disposable-email";

describe("isDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmail("nope@mailinator.com")).toBe(true);
  });
  it("allows a normal domain", () => {
    expect(isDisposableEmail("real@gmail.com")).toBe(false);
  });
  it("is case-insensitive and trims", () => {
    expect(isDisposableEmail("  X@Mailinator.com ")).toBe(true);
  });
  it("returns false for malformed input (no domain)", () => {
    expect(isDisposableEmail("garbage")).toBe(false);
  });
});
