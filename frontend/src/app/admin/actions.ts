"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantCredits, refundCredits } from "@/lib/credits";

/** Hard gate: every admin action re-verifies the session role server-side. */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function adminGrantCredits(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim() || "admin adjustment";

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("grant: userId and a positive amount are required");
  }

  await grantCredits({ userId, amount, type: "adjustment", reason });
  revalidatePath("/admin");
}

export async function adminForceRefund(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  if (!userId || !jobId) {
    throw new Error("refund: userId and jobId are required");
  }

  // refundCredits is idempotent (one refund per jobId) and no-ops when there is
  // no unrefunded charge for the job.
  await refundCredits({ userId, jobId, reason: "admin manual refund" });
  revalidatePath("/admin");
}

export async function adminSetBan(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!userId || (action !== "ban" && action !== "unban")) {
    throw new Error("ban: userId and action (ban|unban) are required");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: action === "ban" ? new Date() : null },
  });
  revalidatePath("/admin");
}
