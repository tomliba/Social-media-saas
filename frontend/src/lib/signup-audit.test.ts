import { describe, it, expect, vi, beforeEach } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("./prisma", () => ({ prisma: { signupEvent: { create } } }));
vi.mock("./ip-intel", () => ({ lookupIp: vi.fn(async () => null) }));

import { recordSignupEvent } from "./signup-audit";

beforeEach(() => create.mockReset());

describe("recordSignupEvent", () => {
  it("writes a row with derived emailDomain", async () => {
    create.mockResolvedValueOnce({});
    await recordSignupEvent({ email: "A@Gmail.com", method: "password", ip: "1.2.3.4", outcome: "pending_verify" });
    expect(create).toHaveBeenCalledOnce();
    const arg = create.mock.calls[0][0].data;
    expect(arg.emailDomain).toBe("gmail.com");
    expect(arg.method).toBe("password");
    expect(arg.outcome).toBe("pending_verify");
  });
  it("never throws if the DB write fails", async () => {
    create.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordSignupEvent({ email: "x@y.com", method: "google", outcome: "created" })
    ).resolves.toBeUndefined();
  });
});
