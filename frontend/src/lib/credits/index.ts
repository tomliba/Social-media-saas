import { prisma } from "@/lib/prisma";
import type { Prisma, CreditTransaction } from "@prisma/client";

export * from "./config";

/**
 * Thrown when a spend would take the balance below zero.
 * Callers can `instanceof InsufficientCreditsError` to handle specifically.
 */
export class InsufficientCreditsError extends Error {
  readonly code = "insufficient_credits" as const;
  readonly needed: number;
  readonly balance: number;

  constructor(needed: number, balance: number) {
    super(`Insufficient credits: need ${needed}, have ${balance}`);
    this.name = "InsufficientCreditsError";
    this.needed = needed;
    this.balance = balance;
  }
}

export type SpendType = "render_spend" | "post_spend";
export type GrantType =
  | "signup_grant"
  | "subscription_grant"
  | "topup"
  | "adjustment";

/**
 * Lock a user row FOR UPDATE inside a transaction and return its balance.
 * Postgres-only (raw SQL). Serializes concurrent charges on the same user.
 */
async function lockUserBalance(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<number> {
  const rows = await tx.$queryRaw<{ creditBalance: number }[]>`
    SELECT "creditBalance" FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }
  return rows[0].creditBalance;
}

// ──────────────────────────────────────────────────────────────────────────
// spendCredits
// ──────────────────────────────────────────────────────────────────────────

export interface SpendArgs {
  userId: string;
  amount: number;
  jobId: string;
  type: SpendType;
  reason?: string;
}

export interface SpendResult {
  transaction: CreditTransaction;
  balance: number;
  /** True when an existing charge was returned (no new charge applied). */
  idempotent: boolean;
}

/**
 * Charge `amount` credits against `userId`, tied to `jobId`.
 * - Idempotent on (jobId, type): a repeat call returns the existing charge.
 * - Locks the user row, verifies balance, then writes a negative ledger row
 *   and decrements the mirrored balance atomically.
 * @throws InsufficientCreditsError when balance < amount.
 */
export async function spendCredits(args: SpendArgs): Promise<SpendResult> {
  const { userId, amount, jobId, type, reason } = args;
  if (amount < 0) throw new Error("spendCredits amount must be >= 0");

  return prisma.$transaction(async (tx) => {
    // Idempotency: charge already recorded for this (jobId, type)?
    const existing = await tx.creditTransaction.findUnique({
      where: { jobId_type: { jobId, type } },
    });
    if (existing) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { creditBalance: true },
      });
      return { transaction: existing, balance: user.creditBalance, idempotent: true };
    }

    const balance = await lockUserBalance(tx, userId);
    if (balance < amount) {
      throw new InsufficientCreditsError(amount, balance);
    }

    const balanceAfter = balance - amount;
    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        delta: -amount,
        balanceAfter,
        type,
        reason,
        jobId,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });

    return { transaction, balance: balanceAfter, idempotent: false };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// refundCredits
// ──────────────────────────────────────────────────────────────────────────

export interface RefundArgs {
  userId: string;
  jobId: string;
  reason?: string;
}

export interface RefundResult {
  /** The refund transaction, or null if nothing to refund. */
  transaction: CreditTransaction | null;
  balance: number;
  idempotent: boolean;
}

/**
 * Refund the original spend tied to `jobId`.
 * - Idempotent on (jobId, "refund"): a repeat call no-ops.
 * - No-ops if there is no original spend for that job (e.g. preview callbacks).
 */
export async function refundCredits(args: RefundArgs): Promise<RefundResult> {
  const { userId, jobId, reason } = args;

  return prisma.$transaction(async (tx) => {
    // Already refunded?
    const existingRefund = await tx.creditTransaction.findUnique({
      where: { jobId_type: { jobId, type: "refund" } },
    });
    if (existingRefund) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { creditBalance: true },
      });
      return { transaction: existingRefund, balance: user.creditBalance, idempotent: true };
    }

    // Find the original spend for this job (render_spend or post_spend).
    const spend = await tx.creditTransaction.findFirst({
      where: { jobId, delta: { lt: 0 } },
    });
    if (!spend) {
      // Nothing was charged for this job — nothing to refund.
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { creditBalance: true },
      });
      return { transaction: null, balance: user.creditBalance, idempotent: false };
    }

    const refundAmount = Math.abs(spend.delta);
    const balance = await lockUserBalance(tx, userId);
    const balanceAfter = balance + refundAmount;

    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        delta: refundAmount,
        balanceAfter,
        type: "refund",
        reason: reason ?? `Refund for ${spend.type} (${jobId})`,
        jobId,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });

    return { transaction, balance: balanceAfter, idempotent: false };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// grantCredits
// ──────────────────────────────────────────────────────────────────────────

export interface GrantArgs {
  userId: string;
  amount: number;
  type: GrantType;
  /** When provided, the grant is idempotent on this id (e.g. LS event id). */
  externalEventId?: string;
  reason?: string;
}

export interface GrantResult {
  transaction: CreditTransaction;
  balance: number;
  idempotent: boolean;
}

/**
 * Add `amount` credits to `userId`.
 * - If `externalEventId` is given, idempotent on it (one grant per event).
 */
export async function grantCredits(args: GrantArgs): Promise<GrantResult> {
  const { userId, amount, type, externalEventId, reason } = args;
  if (amount < 0) throw new Error("grantCredits amount must be >= 0");

  return prisma.$transaction(async (tx) => {
    if (externalEventId) {
      const existing = await tx.creditTransaction.findUnique({
        where: { externalEventId },
      });
      if (existing) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { creditBalance: true },
        });
        return { transaction: existing, balance: user.creditBalance, idempotent: true };
      }
    }

    const balance = await lockUserBalance(tx, userId);
    const balanceAfter = balance + amount;

    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        delta: amount,
        balanceAfter,
        type,
        reason,
        externalEventId,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });

    return { transaction, balance: balanceAfter, idempotent: false };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Reads
// ──────────────────────────────────────────────────────────────────────────

/** Current credit balance for a user (0 if user missing). */
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });
  return user?.creditBalance ?? 0;
}

/** Whether a user has ever received any credit transaction (signup-grant guard). */
export async function hasAnyTransaction(userId: string): Promise<boolean> {
  const count = await prisma.creditTransaction.count({ where: { userId } });
  return count > 0;
}
