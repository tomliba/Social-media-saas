import crypto from "node:crypto";

export const TT_COOKIE = "tt_ok";
const TTL_MS = 10 * 60_000; // 10 minutes

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", secret()).update(input).digest("hex");
}

/** Cookie value = "<issuedAtMs>.<hmac>". Pass `now` only in tests. */
export function signTtCookie(now: number = Date.now()): string {
  const ts = String(now);
  return `${ts}.${hmac(ts)}`;
}

/** True if the cookie is well-formed, untampered, and younger than TTL_MS. */
export function verifyTtCookie(value: string | undefined, now: number = Date.now()): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const ts = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = hmac(ts);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const issued = Number(ts);
  if (!Number.isFinite(issued)) return false;
  return now - issued >= 0 && now - issued < TTL_MS;
}

interface SiteverifyResponse { success: boolean; "error-codes"?: string[] }

/** Verify a Turnstile token server-side against Cloudflare siteverify. */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Misconfiguration must not silently allow bots in prod.
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing in production — failing closed");
      return false;
    }
    return true; // dev convenience
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as SiteverifyResponse;
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] siteverify call failed:", err);
    return false; // network failure → fail closed (a token must be provably valid)
  }
}
