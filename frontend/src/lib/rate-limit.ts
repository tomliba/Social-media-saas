import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

// Fail-open when Upstash isn't configured (e.g. local dev) so logins still work.
const enabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = enabled ? Redis.fromEnv() : null;

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
  resetSubmitIp: make(10, "60 m", "rl:resetsubmit:ip"),
};

/** Returns true if allowed. Fail-open on missing config or limiter errors. */
export async function allow(name: keyof typeof limiters, key: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true;
  }
}
