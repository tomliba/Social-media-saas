"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantCredits, refundCredits } from "@/lib/credits";

/** Fat-finger guard: a single manual grant can never exceed this many credits. */
const MAX_ADMIN_GRANT = 100_000;

/** Hard gate: every admin action re-verifies the session role server-side. */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

/**
 * Send the admin back to /admin with a one-shot flash message (and, when known,
 * the user's lookup still open). `flash` is intentionally NOT threaded through
 * the page's sort/filter links, so it shows once and clears on the next click.
 */
function backWithFlash(email: string, message: string): never {
  const sp = new URLSearchParams();
  if (email) sp.set("email", email);
  sp.set("flash", message);
  redirect(`/admin?${sp.toString()}#user-detail`);
}

export async function adminGrantCredits(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim() || "admin adjustment";

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("grant: userId and a positive amount are required");
  }
  if (amount > MAX_ADMIN_GRANT) {
    throw new Error(`grant: ${amount} exceeds the ${MAX_ADMIN_GRANT.toLocaleString()} safety cap`);
  }

  // Stamp the acting admin into the ledger reason so grants are attributable.
  await grantCredits({
    userId,
    amount,
    type: "adjustment",
    reason: `${reason} — by ${session.user?.email ?? "admin"}`,
  });
  backWithFlash(email, `Granted ${amount.toLocaleString()} credit${amount === 1 ? "" : "s"}.`);
}

export async function adminForceRefund(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  if (!userId || !jobId) {
    throw new Error("refund: userId and jobId are required");
  }

  // refundCredits is idempotent (one refund per jobId) and no-ops when there is
  // no unrefunded charge for the job.
  const res = await refundCredits({
    userId,
    jobId,
    reason: `admin manual refund — by ${session.user?.email ?? "admin"}`,
  });
  const message = res.transaction
    ? `Refunded ${Math.abs(res.transaction.delta).toLocaleString()} credits for ${jobId}.`
    : `Nothing to refund for ${jobId} (no unrefunded charge).`;
  backWithFlash(email, message);
}

export async function adminSetBan(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!userId || (action !== "ban" && action !== "unban")) {
    throw new Error("ban: userId and action (ban|unban) are required");
  }
  if (action === "ban" && userId === session.user?.id) {
    throw new Error("ban: you cannot ban your own admin account");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: action === "ban" ? new Date() : null },
  });
  backWithFlash(email, action === "ban" ? "User banned." : "User unbanned.");
}
