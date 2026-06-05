import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";

const SECRET = "test_webhook_secret";

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyLemonSqueezySignature", () => {
  const body = JSON.stringify({ meta: { event_name: "order_created" } });

  it("accepts a correct signature", () => {
    expect(verifyLemonSqueezySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a bad signature", () => {
    const bad = sign(body, "wrong_secret");
    expect(verifyLemonSqueezySignature(body, bad, SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body);
    const tampered = body + " ";
    expect(verifyLemonSqueezySignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects when signature header is missing", () => {
    expect(verifyLemonSqueezySignature(body, null, SECRET)).toBe(false);
  });

  it("rejects when the secret is not configured", () => {
    expect(verifyLemonSqueezySignature(body, sign(body), undefined)).toBe(false);
  });

  it("rejects a non-hex signature without throwing", () => {
    expect(verifyLemonSqueezySignature(body, "not-hex!!", SECRET)).toBe(false);
  });
});
