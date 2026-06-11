import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } }));
const tokens = vi.hoisted(() => ({ createVerificationToken: vi.fn().mockResolvedValue("rawtok") }));
const email = vi.hoisted(() => ({ sendVerificationEmail: vi.fn().mockResolvedValue(undefined) }));
const ratelimit = vi.hoisted(() => ({ allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" }));
const password = vi.hoisted(() => ({ hashPassword: vi.fn().mockResolvedValue("HASH") }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/rate-limit", () => ratelimit);
vi.mock("@/lib/password", () => password);

import { POST } from "@/app/api/auth/signup/route";
function post(body: unknown) {
  return new Request("http://x/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/signup", () => {
  it("creates a new user and sends verification", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "u1" });
    const res = await POST(post({ email: "new@b.com", password: "longenough" }));
    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(email.sendVerificationEmail).toHaveBeenCalledOnce();
  });
  it("is a STRICT NO-OP when the email already exists (e.g. a Google account)", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "g1", email: "taken@b.com", password: null });
    const res = await POST(post({ email: "taken@b.com", password: "longenough" }));
    expect(res.status).toBe(200);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(tokens.createVerificationToken).not.toHaveBeenCalled();
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });
  it("returns an identical generic body for existing vs new email (no enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "g1", password: null });
    prisma.user.create.mockResolvedValue({ id: "u1" });
    const a = await POST(post({ email: "new@b.com", password: "longenough" }));
    const b = await POST(post({ email: "taken@b.com", password: "longenough" }));
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
  });
  it("rejects a password shorter than 8 chars with no DB write", async () => {
    const res = await POST(post({ email: "new@b.com", password: "short" }));
    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("rejects when rate-limited", async () => {
    ratelimit.allow.mockResolvedValue(false);
    const res = await POST(post({ email: "new@b.com", password: "longenough" }));
    expect(res.status).toBe(429);
  });
});
