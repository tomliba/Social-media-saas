import { describe, it, expect } from "vitest";
import { failClosedWhenUnconfigured } from "./rate-limit";

// Pure decision function: what should allow() return when no limiter exists,
// given the environment? (We don't need a live Redis to test the policy.)
describe("failClosedWhenUnconfigured", () => {
  it("fails OPEN in development", () => {
    expect(failClosedWhenUnconfigured("development")).toBe(true);
  });
  it("fails OPEN in test", () => {
    expect(failClosedWhenUnconfigured("test")).toBe(true);
  });
  it("fails CLOSED in production", () => {
    expect(failClosedWhenUnconfigured("production")).toBe(false);
  });
});
