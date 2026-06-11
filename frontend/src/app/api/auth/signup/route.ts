import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allow, ipFromRequest } from "@/lib/rate-limit";

const GENERIC = { ok: true, message: "If that email is available, we've sent a verification link." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email) || password.length < 8) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }
  if (!(await allow("signupIp", ipFromRequest(req)))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // STRICT NO-OP: never modify or attach to an existing account (incl. Google).
    return NextResponse.json(GENERIC, { status: 200 });
  }

  await prisma.user.create({ data: { email, password: await hashPassword(password), emailVerified: null } });
  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);
  return NextResponse.json(GENERIC, { status: 200 });
}
