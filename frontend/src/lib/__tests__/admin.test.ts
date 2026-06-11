import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail, roleForEmail } from "@/lib/admin";

const ORIG = process.env.ADMIN_EMAILS;
beforeEach(() => { process.env.ADMIN_EMAILS = "Owner@Example.com, second@x.com"; });
afterEach(() => { process.env.ADMIN_EMAILS = ORIG; });

describe("admin email allowlist", () => {
  it("matches case-insensitively and trims spaces", () => {
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("SECOND@X.COM")).toBe(true);
  });
  it("rejects non-listed and empty", () => {
    expect(isAdminEmail("nope@x.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
  it("roleForEmail maps to admin/user", () => {
    expect(roleForEmail("owner@example.com")).toBe("admin");
    expect(roleForEmail("nope@x.com")).toBe("user");
  });
});
