import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { grantCredits, FREE_TIER_ALLOTMENT } from "./credits";
import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "./auth-credentials";
import { allow, ipFromRequest } from "./rate-limit";
import { roleForEmail } from "./admin";

/** Grant welcome credits exactly once per user (idempotent on the user id). */
async function grantSignupCredits(userId: string) {
  try {
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
      if (user.id) await grantSignupCredits(user.id);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        await prisma.user.upsert({
          where: { id: user.id! },
          update: {},
          create: { id: user.id!, email: user.email!, name: user.name ?? "User" },
        });
        await grantSignupCredits(user.id!);
        token.id = user.id;
        token.email = user.email; // ensure email is on the token for role resolution
      }
      if (token.email) token.role = roleForEmail(token.email as string);
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      if (session.user) session.user.role = (token.role as "admin" | "user") ?? "user";
      return session;
    },
  },
});
