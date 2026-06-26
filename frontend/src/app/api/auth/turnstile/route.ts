import { NextResponse } from "next/server";
import { verifyTurnstile, signTtCookie, TT_COOKIE } from "@/lib/turnstile";
import { allow, ipFromRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = ipFromRequest(req);
  if (!(await allow("signupOauthIp", ip))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  let token: string | undefined;
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TT_COOKIE, signTtCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min, matches verifyTtCookie TTL
  });
  return res;
}
