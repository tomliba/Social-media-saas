import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const email = token ? await consumeVerificationToken(token) : null;
  if (!email) return NextResponse.redirect(`${base}/login?error=verification`);
  await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  return NextResponse.redirect(`${base}/login?verified=1`);
}
