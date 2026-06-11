import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
const tokens = vi.hoisted(() => ({ createPasswordResetToken: vi.fn().mockResolvedValue("rawtok") }));
const email = vi.hoisted(() => ({ sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined) }));
const ratelimit = vi.hoisted(() => ({ allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/rate-limit", () => ratelimit);

import { POST } from "@/app/api/auth/request-reset/route";
function post(body: unknown) {
  return new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/request-reset", () => {
  it("emails a reset link for an existing email/password account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", password: "HASH" });
    const res = await POST(post({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).toHaveBeenCalledOnce();
  });
  it("does NOT email a Google-only account (no password) but returns the same body", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "g1", password: null });
    const res = await POST(post({ email: "g@b.com" }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
  it("returns identical generic body for unknown email (no enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", password: "HASH" }).mockResolvedValueOnce(null);
    const a = await POST(post({ email: "a@b.com" }));
    const b = await POST(post({ email: "ghost@b.com" }));
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
  });
});
