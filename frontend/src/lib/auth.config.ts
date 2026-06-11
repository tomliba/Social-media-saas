import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Base config without Prisma adapter — safe for Edge middleware
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // Dev login. Enabled locally (NODE_ENV=development) with no secret, and on
    // deployed environments only when DEV_LOGIN_SECRET is set — in which case
    // the matching secret must be supplied, so it is not a public auth bypass.
    ...(process.env.NODE_ENV === "development" || process.env.DEV_LOGIN_SECRET
      ? [
          Credentials({
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
              secret: { label: "Secret", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              // When a secret is configured (any deployed env), it is mandatory.
              const required = process.env.DEV_LOGIN_SECRET;
              if (required && credentials.secret !== required) return null;
              return {
                id: "dev-user-1",
                email: credentials.email as string,
                name: "Dev User",
                image: null,
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicPaths = ["/", "/pricing", "/privacy", "/terms", "/login", "/signup"];
      const isPublic =
        publicPaths.some((p) => pathname === p) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/webhooks") || // external webhooks (Lemon Squeezy) — verified by signature
        pathname.startsWith("/api/cron") || // scheduled jobs — verified by secret
        pathname.startsWith("/_next") ||
        pathname.endsWith("/complete") || // Trigger.dev server-to-server callback
        pathname.endsWith("/preview-ready") || // prepare-assets server-to-server callback
        pathname.includes(".");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
};
