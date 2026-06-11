export type Role = "admin" | "user";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function roleForEmail(email?: string | null): Role {
  return isAdminEmail(email) ? "admin" : "user";
}
