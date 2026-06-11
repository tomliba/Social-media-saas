import { describe, it, expect, vi, beforeEach } from "vitest";

const prisma = vi.hoisted(() => ({
  verificationToken: {
    create: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
  },
  passwordResetToken: {
    create: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  createVerificationToken, consumeVerificationToken,
  createPasswordResetToken, consumePasswordResetToken,
} from "@/lib/tokens";

beforeEach(() => vi.clearAllMocks());

describe("verification token", () => {
  it("creates a token row and returns the raw token", async () => {
    prisma.verificationToken.create.mockResolvedValue({});
    const raw = await createVerificationToken("a@b.com");
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.verificationToken.create).toHaveBeenCalledOnce();
  });
  it("consumes a valid token once and returns the identifier", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.com", token: "x", expires: new Date(Date.now() + 1000),
    });
    prisma.verificationToken.delete.mockResolvedValue({});
    const email = await consumeVerificationToken("rawtoken");
    expect(email).toBe("a@b.com");
    expect(prisma.verificationToken.delete).toHaveBeenCalledOnce();
  });
  it("rejects an expired token (and still deletes it)", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.com", token: "x", expires: new Date(Date.now() - 1000),
    });
    prisma.verificationToken.delete.mockResolvedValue({});
    expect(await consumeVerificationToken("rawtoken")).toBeNull();
    expect(prisma.verificationToken.delete).toHaveBeenCalledOnce();
  });
  it("rejects an unknown token", async () => {
    prisma.verificationToken.findUnique.mockResolvedValue(null);
    expect(await consumeVerificationToken("rawtoken")).toBeNull();
  });
});

describe("password reset token", () => {
  it("consumes a valid token once and returns userId", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1", consumedAt: null, expires: new Date(Date.now() + 1000),
    });
    prisma.passwordResetToken.update.mockResolvedValue({});
    expect(await consumePasswordResetToken("rawtoken")).toBe("u1");
    expect(prisma.passwordResetToken.update).toHaveBeenCalledOnce();
  });
  it("rejects an already-consumed token", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1", consumedAt: new Date(), expires: new Date(Date.now() + 1000),
    });
    expect(await consumePasswordResetToken("rawtoken")).toBeNull();
    expect(prisma.passwordResetToken.update).not.toHaveBeenCalled();
  });
});
