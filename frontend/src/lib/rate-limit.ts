import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

const enabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = enabled ? Redis.fromEnv() : null;

// Loud, once, at module load: a misconfigured limiter in prod is a security hole.
if (!enabled && process.env.NODE_ENV === "production") {
  console.error(
    "[rate-limit] Upstash is NOT configured in production. Rate-limited actions will FAIL CLOSED. " +
    "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  );
}

/**
 * When no limiter exists (Upstash unset), should the action be allowed?
 * Dev/test → allow (no Redis needed locally). Prod → deny (never silently off).
 */
export function failClosedWhenUnconfigured(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

function make(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix });
}

const limiters = {
  loginEmail: make(5, "15 m", "rl:login:email"),
  loginIp: make(20, "15 m", "rl:login:ip"),
  resetEmail: make(3, "60 m", "rl:reset:email"),
  resetIp: make(10, "60 m", "rl:reset:ip"),
  signupIp: make(5, "60 m", "rl:signup:ip"),
  signupOauthIp: make(5, "60 m", "rl:signup:oauth:ip"),
  resetSubmitIp: make(10, "60 m", "rl:resetsubmit:ip"),
};

/**
 * Returns true if allowed.
 * - No limiter (Upstash unset): allow in dev/test, DENY in prod (fail closed).
 * - Runtime error talking to Redis: log loudly, allow (fail open) so an Upstash
 *   outage cannot lock every user out.
 */
export async function allow(name: keyof typeof limiters, key: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return failClosedWhenUnconfigured(process.env.NODE_ENV);
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    console.error(`[rate-limit] limiter "${name}" errored; failing open:`, err);
    return true;
  }
}
