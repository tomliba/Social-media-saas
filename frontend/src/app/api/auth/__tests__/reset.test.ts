import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({ user: { update: vi.fn() } }));
const tokens = vi.hoisted(() => ({ consumePasswordResetToken: vi.fn() }));
const ratelimit = vi.hoisted(() => ({ allow: vi.fn().mockResolvedValue(true), ipFromRequest: () => "1.1.1.1" }));
const password = vi.hoisted(() => ({ hashPassword: vi.fn().mockResolvedValue("NEWHASH") }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);
vi.mock("@/lib/rate-limit", () => ratelimit);
vi.mock("@/lib/password", () => password);

import { POST } from "@/app/api/auth/reset/route";
function post(body: unknown) {
  return new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); ratelimit.allow.mockResolvedValue(true); });

describe("POST /api/auth/reset", () => {
  it("sets a new password for a valid token", async () => {
    tokens.consumePasswordResetToken.mockResolvedValue("u1");
    const res = await POST(post({ token: "good", password: "longenough" }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { password: "NEWHASH" } });
  });
  it("rejects a short password before touching the token", async () => {
    const res = await POST(post({ token: "good", password: "short" }));
    expect(res.status).toBe(400);
    expect(tokens.consumePasswordResetToken).not.toHaveBeenCalled();
  });
  it("rejects an invalid/expired/consumed token", async () => {
    tokens.consumePasswordResetToken.mockResolvedValue(null);
    const res = await POST(post({ token: "bad", password: "longenough" }));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
