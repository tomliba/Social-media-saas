import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

// Full config with Prisma adapter — for API routes and server components
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // Use JWT for sessions — required for Credentials provider in dev
  session: { strategy: "jwt" },
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
