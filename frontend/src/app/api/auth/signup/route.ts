import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";
import { isDisposableEmail } from "@/lib/disposable-email";
import { verifyTurnstile } from "@/lib/turnstile";
import { recordSignupEvent } from "@/lib/signup-audit";
import { signupHardeningEnabled } from "@/lib/flags";

const GENERIC = { ok: true, message: "If that email is available, we've sent a verification link." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; turnstileToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const ip = ipFromRequest(req);

  if (!EMAIL_RE.test(email) || password.length < 10) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 10 characters." }, { status: 400 });
  }
  if (!(await allow("signupIp", ip))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  if (signupHardeningEnabled()) {
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ error: "We couldn't verify you're human. Please try again." }, { status: 403 });
    }
    if (isDisposableEmail(email)) {
      await recordSignupEvent({ email, method: "password", ip, outcome: "denied_disposable", turnstilePassed: true, skipEnrich: true });
      return NextResponse.json({ error: "Please use a non-disposable email address." }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // STRICT NO-OP: never modify or attach to an existing account (incl. Google).
    return NextResponse.json(GENERIC, { status: 200 });
  }

  await prisma.user.create({ data: { email, password: await hashPassword(password), emailVerified: null } });
  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);
  await recordSignupEvent({ email, method: "password", ip, outcome: "pending_verify", turnstilePassed: true });
  return NextResponse.json(GENERIC, { status: 200 });
}
