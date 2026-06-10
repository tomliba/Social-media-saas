import crypto from "crypto";

/**
 * Verify a Lemon Squeezy webhook signature.
 * LS signs the raw request body with HMAC-SHA256 (hex) using the webhook's
 * signing secret and sends it in the `X-Signature` header.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  let provided: Buffer;
  const expectedBuf = Buffer.from(expected, "hex");
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, provided);
}
