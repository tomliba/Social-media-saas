import { Resend } from "resend";

function client() {
  return new Resend(process.env.RESEND_API_KEY);
}
function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
function from() {
  return process.env.EMAIL_FROM || "Fluvio <onboarding@resend.dev>";
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/verify?token=${token}`;
  await client().emails.send({
    from: from(),
    to,
    subject: "Verify your email",
    html: `<p>Welcome to Fluvio. Confirm your email to finish signing up:</p>
           <p><a href="${link}">Verify my email</a></p>
           <p>This link expires in 24 hours. If you didn't sign up, ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${token}`;
  await client().emails.send({
    from: from(),
    to,
    subject: "Reset your password",
    html: `<p>We received a request to reset your password:</p>
           <p><a href="${link}">Reset my password</a></p>
           <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`,
  });
}
