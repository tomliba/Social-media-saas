import { describe, it, expect } from "vitest";
import { isDatacenterOrg } from "./ip-intel";

describe("isDatacenterOrg", () => {
  it("flags known hosting providers", () => {
    expect(isDatacenterOrg("Amazon.com, Inc.")).toBe(true);
    expect(isDatacenterOrg("DigitalOcean, LLC")).toBe(true);
    expect(isDatacenterOrg("Hetzner Online GmbH")).toBe(true);
    expect(isDatacenterOrg("Google LLC")).toBe(true);
  });
  it("does not flag residential ISPs", () => {
    expect(isDatacenterOrg("Comcast Cable Communications")).toBe(false);
    expect(isDatacenterOrg("Deutsche Telekom AG")).toBe(false);
  });
  it("handles empty/undefined", () => {
    expect(isDatacenterOrg("")).toBe(false);
    expect(isDatacenterOrg(undefined)).toBe(false);
  });
});
