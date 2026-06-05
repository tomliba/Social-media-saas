import { describe, it, expect, beforeEach, vi } from "vitest";

// ── In-memory Prisma mock ──
// Backs the credit functions with a simple stateful store so we can assert
// balance changes and idempotency without a real database.
const store = vi.hoisted(() => ({
  users: new Map<string, { id: string; creditBalance: number }>(),
  txs: [] as Array<{
    id: string;
    userId: string;
    delta: number;
    balanceAfter: number;
    type: string;
    reason: string | null;
    jobId: string | null;
    externalEventId: string | null;
    createdAt: Date;
  }>,
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    // tagged-template raw query: $queryRaw`... ${userId} ...`
    $queryRaw: async (_strings: TemplateStringsArray, userId: string) => {
      const u = store.users.get(userId);
      return u ? [{ creditBalance: u.creditBalance }] : [];
    },
    creditTransaction: {
      findUnique: async ({ where }: any) => {
        if (where.jobId_type) {
          return (
            store.txs.find(
              (t) =>
                t.jobId === where.jobId_type.jobId && t.type === where.jobId_type.type
            ) ?? null
          );
        }
        if ("externalEventId" in where) {
          return (
            store.txs.find((t) => t.externalEventId === where.externalEventId) ?? null
          );
        }
        return null;
      },
      findFirst: async ({ where }: any) =>
        store.txs.find((t) => t.jobId === where.jobId && t.delta < 0) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `tx_${store.txs.length + 1}`,
          reason: null,
          jobId: null,
          externalEventId: null,
          createdAt: new Date(),
          ...data,
        };
        store.txs.push(row);
        return row;
      },
      count: async ({ where }: any) =>
        store.txs.filter((t) => t.userId === where.userId).length,
    },
    user: {
      update: async ({ where, data }: any) => {
        const u = store.users.get(where.id);
        if (u && typeof data.creditBalance === "number") {
          u.creditBalance = data.creditBalance;
        }
        return u ? { ...u } : null;
      },
      findUnique: async ({ where }: any) => {
        const u = store.users.get(where.id);
        return u ? { ...u } : null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const u = store.users.get(where.id);
        if (!u) throw new Error("User not found");
        return { ...u };
      },
    },
  };

  const prisma = {
    ...tx,
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };

  return { prisma };
});

import {
  spendCredits,
  refundCredits,
  grantCredits,
  getCreditBalance,
  InsufficientCreditsError,
} from "@/lib/credits";

function seedUser(id: string, balance: number) {
  store.users.set(id, { id, creditBalance: balance });
}

beforeEach(() => {
  store.users.clear();
  store.txs.length = 0;
});

describe("spendCredits", () => {
  it("throws InsufficientCreditsError when balance is too low", async () => {
    seedUser("u1", 5);
    await expect(
      spendCredits({ userId: "u1", amount: 10, jobId: "job1", type: "render_spend" })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    // Balance untouched
    expect(await getCreditBalance("u1")).toBe(5);
  });

  it("decrements balance and records a negative ledger row", async () => {
    seedUser("u1", 100);
    const res = await spendCredits({
      userId: "u1",
      amount: 10,
      jobId: "job1",
      type: "render_spend",
    });
    expect(res.balance).toBe(90);
    expect(res.transaction.delta).toBe(-10);
    expect(await getCreditBalance("u1")).toBe(90);
  });

  it("is idempotent on (jobId, type) — charges only once", async () => {
    seedUser("u1", 100);
    const first = await spendCredits({
      userId: "u1",
      amount: 10,
      jobId: "job1",
      type: "render_spend",
    });
    const second = await spendCredits({
      userId: "u1",
      amount: 10,
      jobId: "job1",
      type: "render_spend",
    });
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(await getCreditBalance("u1")).toBe(90); // only one charge
    expect(store.txs.filter((t) => t.type === "render_spend")).toHaveLength(1);
  });
});

describe("refundCredits", () => {
  it("restores the exact amount of the original charge", async () => {
    seedUser("u1", 100);
    await spendCredits({ userId: "u1", amount: 30, jobId: "job1", type: "render_spend" });
    expect(await getCreditBalance("u1")).toBe(70);

    const refund = await refundCredits({ userId: "u1", jobId: "job1" });
    expect(refund.transaction?.delta).toBe(30);
    expect(await getCreditBalance("u1")).toBe(100);
  });

  it("is idempotent — a double refund only refunds once", async () => {
    seedUser("u1", 100);
    await spendCredits({ userId: "u1", amount: 30, jobId: "job1", type: "render_spend" });

    const first = await refundCredits({ userId: "u1", jobId: "job1" });
    const second = await refundCredits({ userId: "u1", jobId: "job1" });
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(await getCreditBalance("u1")).toBe(100); // not 130
  });

  it("no-ops when there is no original charge for the job", async () => {
    seedUser("u1", 50);
    const res = await refundCredits({ userId: "u1", jobId: "never-charged" });
    expect(res.transaction).toBeNull();
    expect(await getCreditBalance("u1")).toBe(50);
  });
});

describe("grantCredits", () => {
  it("adds credits to the balance", async () => {
    seedUser("u1", 0);
    const res = await grantCredits({ userId: "u1", amount: 30, type: "signup_grant" });
    expect(res.balance).toBe(30);
    expect(await getCreditBalance("u1")).toBe(30);
  });

  it("is idempotent on externalEventId", async () => {
    seedUser("u1", 0);
    const first = await grantCredits({
      userId: "u1",
      amount: 200,
      type: "subscription_grant",
      externalEventId: "evt_1",
    });
    const second = await grantCredits({
      userId: "u1",
      amount: 200,
      type: "subscription_grant",
      externalEventId: "evt_1",
    });
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(await getCreditBalance("u1")).toBe(200); // granted once
  });
});
