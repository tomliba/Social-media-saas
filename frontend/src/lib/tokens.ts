import { createHash, randomBytes } from "crypto";

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
