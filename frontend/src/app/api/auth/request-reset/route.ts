import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";

const GENERIC = { ok: true, message: "If an account with that email exists, we've sent a reset link." };

export async function POST(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json(GENERIC, { status: 200 }); }
  const email = String(body.email ?? "").toLowerCase().trim();

  const okRate = (await allow("resetEmail", email)) && (await allow("resetIp", ipFromRequest(req)));
  if (!okRate) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Send a reset link to ANY existing account, including password-less Google
  // accounts adding a password for the first time. The link only reaches the
  // account's own (verified) email, so this is safe. Non-existent emails still
  // fall through to the generic response below — no enumeration.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(email, token);
  }
  return NextResponse.json(GENERIC, { status: 200 });
}
