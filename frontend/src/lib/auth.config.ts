import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Base config without Prisma adapter — safe for Edge middleware.
// The email/password Credentials provider lives in auth.ts (Node side) because
// it needs bcrypt + Prisma, which cannot run in edge middleware.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicPaths = ["/", "/pricing", "/privacy", "/terms", "/login", "/signup", "/forgot-password", "/reset-password"];
      const isPublic =
        publicPaths.some((p) => pathname === p) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/_next") ||
        pathname === "/verify" ||
        pathname.endsWith("/complete") ||
        pathname.endsWith("/preview-ready") ||
        pathname.includes(".");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
};
