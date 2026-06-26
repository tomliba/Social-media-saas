/**
 * Master kill-switch for the signup-abuse hardening: Turnstile captcha,
 * disposable-email blocking, and the Google OAuth signup gate.
 *
 * Defaults ON. Set SIGNUP_HARDENING_ENABLED to "false" / "0" / "off" / "no" to
 * bypass those gates (e.g. emergency rollback if a gate misfires in prod). The
 * credit-grant-on-emailVerified gate is independent and ALWAYS enforced — this
 * switch never lets unverified accounts mint credits.
 *
 * `raw` is a parameter only so the logic is unit-testable without mutating env.
 */
export function signupHardeningEnabled(
  raw: string | undefined = process.env.SIGNUP_HARDENING_ENABLED,
): boolean {
  if (raw == null) return true; // unset → ON (safe default)
  const v = raw.trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off" || v === "no");
}
