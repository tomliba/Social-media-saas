import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreditBalance } from "@/lib/credits";
import CreditPacks from "@/components/credits/CreditPacks";

// Always render fresh — plan/status/balance change out of band (webhooks, renders).
export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  pro: "Pro",
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
  on_trial: { label: "Trial", cls: "bg-emerald-100 text-emerald-700" },
  past_due: { label: "Past due", cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled", cls: "bg-zinc-200 text-zinc-600" },
  expired: { label: "Expired", cls: "bg-zinc-200 text-zinc-600" },
  paused: { label: "Paused", cls: "bg-zinc-200 text-zinc-600" },
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="max-w-3xl mx-auto py-24 text-center">
        <p className="text-on-surface-variant mb-6">Please sign in to view your account.</p>
        <Link
          href="/login"
          className="inline-block bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold shadow-lg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const userId = session.user.id;
  const [user, balance] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        customerPortalUrl: true,
      },
    }),
    getCreditBalance(userId),
  ]);

  const plan = user?.plan ?? "free";
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const isPaid = plan !== "free";
  const status = user?.subscriptionStatus ?? null;
  const statusMeta = status ? STATUS_META[status] : null;
  const periodEnd = user?.currentPeriodEnd ?? null;
  // Show the portal to anyone who has a portal URL — cancelled, paused, and
  // past_due users still need it to un-cancel or fix payment.
  const canManage = !!user?.customerPortalUrl;

  // Renewal / expiry line derived from currentPeriodEnd + status.
  let periodLine: string | null = null;
  if (isPaid) {
    if (status === "paused") {
      periodLine = "Subscription paused — resume to restore access";
    } else if (status === "cancelled" || status === "expired") {
      periodLine = periodEnd ? `Access until ${formatDate(periodEnd)}` : "Subscription ending";
    } else if (status === "past_due") {
      periodLine = periodEnd
        ? `Payment past due · access until ${formatDate(periodEnd)}`
        : "Payment past due";
    } else if (periodEnd) {
      periodLine = `Renews ${formatDate(periodEnd)}`;
    }
  }

  return (
    <div className="max-w-4xl mx-auto pt-4">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black font-headline tracking-tight text-on-surface mb-1">
          Account
        </h1>
        <p className="text-on-surface-variant text-sm">
          {user?.name ? `${user.name} · ` : ""}
          {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Plan card ── */}
        <section className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10 shadow-[0px_20px_40px_rgba(111,51,213,0.04)]">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">workspace_premium</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-headline">
              Subscription
            </h2>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-black font-headline text-on-surface">
              {planLabel} plan
            </span>
            {statusMeta && (
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          <p className="text-sm text-on-surface-variant min-h-[1.25rem] mb-8">
            {periodLine ?? (isPaid ? "" : canManage ? "Subscription ended" : "No active subscription")}
          </p>

          {canManage ? (
            <a
              href={user!.customerPortalUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-primary text-on-primary font-label font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              {isPaid ? "Manage Subscription" : "Reactivate Subscription"}
            </a>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-primary text-on-primary font-label font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">arrow_upward</span>
              Upgrade
            </Link>
          )}
        </section>

        {/* ── Credits card ── */}
        <section className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10 shadow-[0px_20px_40px_rgba(111,51,213,0.04)]">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              toll
            </span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-headline">
              Credits
            </h2>
          </div>

          <div className="mb-2">
            <span className="text-4xl font-black font-headline text-on-surface">
              {balance.toLocaleString()}
            </span>
            <span className="text-sm text-on-surface-variant ml-2">available</span>
          </div>

          <p className="text-sm text-on-surface-variant min-h-[1.25rem] mb-8">
            Credits are used each time you create a video or post.
          </p>

          <CreditPacks />
        </section>
      </div>
    </div>
  );
}
