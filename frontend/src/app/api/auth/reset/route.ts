import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { allow, ipFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!(await allow("resetSubmitIp", ipFromRequest(req)))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const userId = token ? await consumePasswordResetToken(token) : null;
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(password) } });
  return NextResponse.json({ ok: true, message: "Your password has been reset. You can now sign in." }, { status: 200 });
}
