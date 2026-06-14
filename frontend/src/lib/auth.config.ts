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
      // Only genuine static assets are public by extension — not any path that
      // happens to contain a dot (which previously made dotted routes public).
      const STATIC_FILE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|map|txt|xml|json|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf)$/i;
      const isPublic =
        publicPaths.some((p) => pathname === p) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/_next") ||
        pathname === "/verify" ||
        // Server-to-server render callbacks (secret-verified inside the route).
        pathname.endsWith("/complete") ||
        pathname.endsWith("/preview-ready") ||
        STATIC_FILE.test(pathname);

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
};
