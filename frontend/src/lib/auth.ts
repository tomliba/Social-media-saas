import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { grantCredits, FREE_TIER_ALLOTMENT } from "./credits";
import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "./auth-credentials";
import { allow, ipFromRequest } from "./rate-limit";
import { roleForEmail } from "./admin";
import { isGrantEligible } from "./grant-eligibility";
import { cookies, headers } from "next/headers";
import { isDisposableEmail } from "./disposable-email";
import { verifyTtCookie, TT_COOKIE } from "./turnstile";
import { recordSignupEvent } from "./signup-audit";

/** Grant welcome credits once per user, but ONLY if eligible (verified, not
 *  banned). Idempotent on the user id. Safe to call repeatedly. */
async function maybeGrantSignupCredits(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, bannedAt: true },
    });
    if (!user || !isGrantEligible(user)) return;
    await grantCredits({
      userId,
      amount: FREE_TIER_ALLOTMENT,
      type: "signup_grant",
      externalEventId: `signup:${userId}`,
      reason: "welcome credits",
    });
  } catch (err) {
    console.error("Failed to grant signup credits:", err);
  }
}

class EmailNotVerifiedError extends CredentialsSignin { code = "email_not_verified"; }
class RateLimitedError extends CredentialsSignin { code = "rate_limited"; }

// Full config with Prisma adapter — for API routes and server components
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email and Password",
      credentials: { email: {}, password: {} },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const ip = ipFromRequest(request as Request);
        const okRate = (await allow("loginEmail", email)) && (await allow("loginIp", ip));
        if (!okRate) throw new RateLimitedError();
        const res = await authenticateUser(email, password);
        if (!res.ok) {
          if (res.reason === "unverified") throw new EmailNotVerifiedError();
          return null;
        }
        return { id: res.user.id, email: res.user.email, name: res.user.name };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Google verified the address; mark it so the gated grant fires and the
      // password and OAuth paths share one verification model.
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
      await maybeGrantSignupCredits(user.id);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      const email = user?.email?.toLowerCase();
      if (!email) return true;

      // Banned users never get a session (covers all providers).
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, bannedAt: true },
      });
      if (dbUser?.bannedAt) return false;

      // Extra gating only for Google. Credentials is already gated in authorize().
      if (account?.provider === "google") {
        const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        if (isDisposableEmail(email)) {
          await recordSignupEvent({ email, method: "google", ip, outcome: "denied_disposable", skipEnrich: true });
          return false;
        }

        // Only NEW users must pass the captcha + rate gate; returning users glide through.
        const isNew = !dbUser;
        if (isNew) {
          const cookie = (await cookies()).get(TT_COOKIE)?.value;
          if (!verifyTtCookie(cookie)) {
            await recordSignupEvent({ email, method: "google", ip, outcome: "denied_captcha", skipEnrich: true });
            return false;
          }
          if (!(await allow("signupOauthIp", ip))) {
            await recordSignupEvent({ email, method: "google", ip, outcome: "denied_ratelimit", skipEnrich: true });
            return false;
          }
          // Passed the gate; the user row + credit grant happen in events.createUser.
          await recordSignupEvent({ email, method: "google", ip, outcome: "created", turnstilePassed: true });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        await prisma.user.upsert({
          where: { id: user.id! },
          update: {},
          create: { id: user.id!, email: user.email!, name: user.name ?? "User" },
        });
        await maybeGrantSignupCredits(user.id!);
        token.id = user.id;
        token.email = user.email; // ensure email is on the token for role resolution
      }
      if (token.email) token.role = roleForEmail(token.email as string);

      // Ban enforcement for live sessions: re-check at most once per minute (a
      // single PK lookup) and invalidate the token if the user has been banned
      // since they signed in. Returning null clears the session.
      if (token.id) {
        const now = Date.now();
        const last = (token.banCheckedAt as number | undefined) ?? 0;
        if (now - last > 60_000) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { bannedAt: true },
          });
          if (dbUser?.bannedAt) return null;
          token.banCheckedAt = now;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      if (session.user) session.user.role = (token.role as "admin" | "user") ?? "user";
      return session;
    },
  },
});
