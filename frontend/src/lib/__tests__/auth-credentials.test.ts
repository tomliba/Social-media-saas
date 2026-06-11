import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { authenticateUser } from "@/lib/auth-credentials";
import { hashPassword } from "@/lib/password";

beforeEach(() => vi.clearAllMocks());

describe("authenticateUser", () => {
  it("returns ok for a verified user with the right password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", name: "A", emailVerified: new Date(),
      password: await hashPassword("secret123"),
    });
    const r = await authenticateUser("a@b.com", "secret123");
    expect(r).toEqual({ ok: true, user: { id: "u1", email: "a@b.com", name: "A" } });
  });
  it("returns invalid for a wrong password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: new Date(),
      password: await hashPassword("secret123"),
    });
    expect(await authenticateUser("a@b.com", "nope")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns invalid for a Google-only user (no password) — no enumeration", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", password: null, emailVerified: new Date() });
    expect(await authenticateUser("a@b.com", "anything")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns invalid for an unknown email", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await authenticateUser("ghost@b.com", "x")).toEqual({ ok: false, reason: "invalid" });
  });
  it("returns unverified for a correct password but unverified email", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: null,
      password: await hashPassword("secret123"),
    });
    expect(await authenticateUser("a@b.com", "secret123")).toEqual({ ok: false, reason: "unverified" });
  });
});
