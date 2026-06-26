import disposableDomains from "disposable-email-domains";
import { DISPOSABLE_EXTRA } from "./disposable-extra";

const BLOCKED: Set<string> = new Set<string>([
  ...(disposableDomains as unknown as string[]),
  ...DISPOSABLE_EXTRA,
].map((d) => d.toLowerCase()));

/** Bare domain of an email, lowercased; null if it doesn't look like an email. */
function domainOf(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.trim().toLowerCase().slice(at + 1);
  return domain.includes(".") ? domain : null;
}

/** True if the email's domain is a known disposable/throwaway provider. */
export function isDisposableEmail(email: string): boolean {
  const domain = domainOf(email);
  return domain ? BLOCKED.has(domain) : false;
}
