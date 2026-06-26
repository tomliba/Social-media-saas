import { prisma } from "./prisma";
import { lookupIp } from "./ip-intel";

export type SignupMethod = "google" | "password";
export type SignupOutcome =
  | "created" | "pending_verify"
  | "denied_disposable" | "denied_captcha" | "denied_ratelimit";

export interface SignupEventInput {
  email: string;
  method: SignupMethod;
  outcome: SignupOutcome;
  ip?: string | null;
  userId?: string | null;
  turnstilePassed?: boolean;
  /** Skip the IP-intel network call (e.g. for denied attempts you don't enrich). */
  skipEnrich?: boolean;
}

function domainOf(email: string): string {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  return at >= 0 ? email.trim().toLowerCase().slice(at + 1) : "";
}

/** Best-effort: records a signup attempt. Never throws. */
export async function recordSignupEvent(input: SignupEventInput): Promise<void> {
  try {
    const intel = input.skipEnrich ? null : await lookupIp(input.ip ?? null);
    await prisma.signupEvent.create({
      data: {
        userId: input.userId ?? null,
        email: input.email.trim().toLowerCase(),
        emailDomain: domainOf(input.email),
        method: input.method,
        outcome: input.outcome,
        ip: input.ip ?? null,
        turnstilePassed: input.turnstilePassed ?? false,
        country: intel?.country ?? null,
        asn: intel?.asn ?? null,
        asnOrg: intel?.asnOrg ?? null,
        isDatacenter: intel?.isDatacenter ?? null,
        isProxy: intel?.isProxy ?? null,
      },
    });
  } catch (err) {
    console.error("[signup-audit] failed to record signup event:", err);
  }
}
