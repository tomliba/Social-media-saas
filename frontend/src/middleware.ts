import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use lightweight config without Prisma for Edge middleware
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
