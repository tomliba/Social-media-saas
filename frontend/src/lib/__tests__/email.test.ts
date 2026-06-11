import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn().mockResolvedValue({ data: { id: "x" }, error: null });
vi.mock("resend", () => ({ Resend: vi.fn(() => ({ emails: { send } })) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Fluvio <noreply@example.com>";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
});

import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

describe("transactional emails", () => {
  it("sends a verification email with a /verify link", async () => {
    await sendVerificationEmail("a@b.com", "TOKEN123");
    expect(send).toHaveBeenCalledOnce();
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("a@b.com");
    expect(String(arg.html)).toContain("https://app.example.com/verify?token=TOKEN123");
  });
  it("sends a reset email with a /reset-password link", async () => {
    await sendPasswordResetEmail("a@b.com", "TOKEN456");
    const arg = send.mock.calls[0][0];
    expect(String(arg.html)).toContain("https://app.example.com/reset-password?token=TOKEN456");
  });
});
