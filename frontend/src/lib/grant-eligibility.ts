/** A user may receive signup credits only once their email is verified and
 *  they are not banned. Mirrors the password path's verification requirement. */
export function isGrantEligible(u: { emailVerified: Date | null; bannedAt: Date | null }): boolean {
  return u.emailVerified != null && u.bannedAt == null;
}
