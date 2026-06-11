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
  if (user?.password) {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(email, token);
  }
  return NextResponse.json(GENERIC, { status: 200 });
}
