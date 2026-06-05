import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { grantCredits, FREE_TIER_ALLOTMENT } from "./credits";

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

// Full config with Prisma adapter — for API routes and server components
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // Use JWT for sessions — required for Credentials provider in dev
  session: { strategy: "jwt" },
  events: {
    // Google OAuth path: PrismaAdapter creates the user, then this fires once.
    async createUser({ user }) {
      if (user.id) await grantSignupCredits(user.id);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // Ensure the user row exists in the DB (Credentials provider
        // doesn't go through the PrismaAdapter createUser flow)
        await prisma.user.upsert({
          where: { id: user.id! },
          update: {},
          create: {
            id: user.id!,
            email: user.email!,
            name: user.name ?? "Dev User",
          },
        });
        // Dev Credentials path bypasses the adapter's createUser event, so grant
        // here. Idempotent on `signup:<id>`, so this never double-grants.
        await grantSignupCredits(user.id!);
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
