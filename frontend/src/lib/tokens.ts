import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const RESET_TTL_MS = 30 * 60 * 1000;       // 30m

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function isExpired(expires: Date): boolean {
  return expires.getTime() < Date.now();
}

export async function createVerificationToken(email: string): Promise<string> {
  const { token, tokenHash } = generateToken();
  await prisma.verificationToken.create({
    data: { identifier: email, token: tokenHash, expires: new Date(Date.now() + VERIFY_TTL_MS) },
  });
  return token;
}

/** Returns the verified email on success, null if invalid/expired. Single-use. */
export async function consumeVerificationToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!row) return null;
  await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
  if (isExpired(row.expires)) return null;
  return row.identifier;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const { token, tokenHash } = generateToken();
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expires: new Date(Date.now() + RESET_TTL_MS) },
  });
  return token;
}

/** Returns the userId on success, null if invalid/expired/consumed. Single-use. */
export async function consumePasswordResetToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.consumedAt || isExpired(row.expires)) return null;
  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { consumedAt: new Date() } });
  return row.userId;
}
