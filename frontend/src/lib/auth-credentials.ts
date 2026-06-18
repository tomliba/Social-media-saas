import { prisma } from "./prisma";
import { verifyPassword } from "./password";

export type AuthResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; reason: "invalid" | "unverified" | "banned" };

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic failure for unknown email AND Google-only (no password) — no enumeration.
  if (!user || !user.password) return { ok: false, reason: "invalid" };
  if (!(await verifyPassword(password, user.password))) return { ok: false, reason: "invalid" };
  if (!user.emailVerified) return { ok: false, reason: "unverified" };
  if (user.bannedAt) return { ok: false, reason: "banned" };
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}
