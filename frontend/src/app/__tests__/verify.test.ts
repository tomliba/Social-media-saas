import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({ user: { update: vi.fn() } }));
const tokens = vi.hoisted(() => ({ consumeVerificationToken: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/tokens", () => tokens);

import { GET } from "@/app/verify/route";
beforeEach(() => vi.clearAllMocks());

describe("GET /verify", () => {
  it("marks the email verified and redirects to login on success", async () => {
    tokens.consumeVerificationToken.mockResolvedValue("a@b.com");
    const res = await GET(new Request("http://x/verify?token=good"));
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "a@b.com" } }));
    expect([302, 303, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/login?verified=1");
  });
  it("redirects with an error on an invalid/expired token", async () => {
    tokens.consumeVerificationToken.mockResolvedValue(null);
    const res = await GET(new Request("http://x/verify?token=bad"));
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/login?error=verification");
  });
});
