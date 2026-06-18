import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
const updateCalls: Array<{ where: unknown; data: Record<string, unknown> }> = [];
const grantCalls: Array<Record<string, unknown>> = [];

const fakeUser = {
  id: "u1",
  plan: "pro",
  subscriptionStatus: "active",
  lemonSqueezyCustomerId: "cust_1",
  lemonSqueezySubscriptionId: "sub_1",
  customerPortalUrl: "https://portal.example/abc",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => fakeUser),
      findFirst: vi.fn(async () => fakeUser),
      update: vi.fn(async (args: { where: unknown; data: Record<string, unknown> }) => {
        updateCalls.push(args);
        return { ...fakeUser, ...args.data };
      }),
    },
    webhookEvent: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@/lib/credits", () => ({
  grantCredits: vi.fn(async (args: Record<string, unknown>) => {
    grantCalls.push(args);
    return { transaction: { id: "tx_1" }, idempotent: false };
  }),
}));

vi.mock("@/lib/lemonsqueezy", () => ({
  verifyLemonSqueezySignature: () => true,
}));

import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

function makeReq(eventName: string, attributes: Record<string, unknown>) {
  const body = JSON.stringify({
    meta: { event_name: eventName, custom_data: { user_id: "u1" } },
    data: { id: "sub_1", type: "subscriptions", attributes },
  });
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "x-signature": "ignored", "content-type": "application/json" },
    body,
  }) as unknown as import("next/server").NextRequest;
}

function lastUpdateData() {
  return updateCalls[updateCalls.length - 1]?.data ?? {};
}

beforeEach(() => {
  updateCalls.length = 0;
  grantCalls.length = 0;
});

describe("lemonsqueezy webhook — lifecycle events", () => {
  it("subscription_cancelled keeps the plan and sets status cancelled", async () => {
    const res = await POST(makeReq("subscription_cancelled", {
      customer_id: "cust_1",
      status: "cancelled",
      ends_at: "2099-01-01T00:00:00Z",
    }));
    expect(res.status).toBe(200);
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined();
    expect(data.subscriptionStatus).toBe("cancelled");
    expect(data.currentPeriodEnd).toEqual(new Date("2099-01-01T00:00:00Z"));
  });

  it("subscription_expired drops the plan to free", async () => {
    await POST(makeReq("subscription_expired", { customer_id: "cust_1", status: "expired" }));
    const data = lastUpdateData();
    expect(data.plan).toBe("free");
    expect(data.subscriptionStatus).toBe("expired");
  });

  it("subscription_paused suspends via status, keeps the plan", async () => {
    await POST(makeReq("subscription_paused", { customer_id: "cust_1", status: "paused" }));
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined();
    expect(data.subscriptionStatus).toBe("paused");
  });

  it("subscription_payment_failed sets past_due, keeps the plan", async () => {
    await POST(makeReq("subscription_payment_failed", { customer_id: "cust_1" }));
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined();
    expect(data.subscriptionStatus).toBe("past_due");
  });

  it("subscription_payment_success grants the current plan's credits", async () => {
    await POST(makeReq("subscription_payment_success", { customer_id: "cust_1" }));
    expect(grantCalls.length).toBe(1);
    expect(grantCalls[0].amount).toBe(3000);
    expect(grantCalls[0].type).toBe("subscription_grant");
  });
});
