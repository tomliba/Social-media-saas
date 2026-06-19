"use server";

import { signOut } from "@/lib/auth";

/** Server action: end the session and return the user to the login page. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
