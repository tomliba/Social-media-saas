import { prisma } from "@/lib/prisma";
import {
  PLAN_PRICES,
  CREDIT_VALUE_USD,
  estDollarsForCredits,
  type PlanName,
} from "@/lib/credits/config";
import { deriveRenderMode } from "./render-mode";

const PLANS: PlanName[] = ["free", "creator", "pro"];

function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ── OVERVIEW ────────────────────────────────────────────────────────────────

export interface OverviewStats {
  mrr: number;
  subsByTier: Record<PlanName, number>;
  activeSubs: number;
  signupsToday: number;
  signups7d: number;
  totalUsers: number;
  paidUsers: number;
  conversionPct: number;
}

export async function getOverview(): Promise<OverviewStats> {
  const today = startOfTodayUTC();
  const [activeByPlan, signupsToday, signups7d, totalUsers, paidUsers] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["plan"],
        where: { subscriptionStatus: "active" },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.user.count(),
      prisma.user.count({ where: { plan: { in: ["creator", "pro"] } } }),
    ]);

  const subsByTier: Record<PlanName, number> = { free: 0, creator: 0, pro: 0 };
  for (const row of activeByPlan) {
    if (row.plan in subsByTier) subsByTier[row.plan as PlanName] = row._count._all;
  }
  const mrr = PLANS.reduce((sum, p) => sum + subsByTier[p] * PLAN_PRICES[p], 0);
  const activeSubs = subsByTier.creator + subsByTier.pro;

  return {
    mrr,
    subsByTier,
    activeSubs,
    signupsToday,
    signups7d,
    totalUsers,
    paidUsers,
    conversionPct: totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0,
  };
}

// ── TODAY: credits granted vs spent + free-user burn (est. $) ────────────────

export interface TodayCreditFlow {
  granted: number;
  spent: number;
  freeBurn: number;
  estSpentUsd: number;
  estFreeBurnUsd: number;
}

export async function getTodayCreditFlow(): Promise<TodayCreditFlow> {
  const today = startOfTodayUTC();
  const [grantAgg, todaysSpends] = await Promise.all([
    prisma.creditTransaction.aggregate({
      _sum: { delta: true },
      where: { delta: { gt: 0 }, createdAt: { gte: today } },
    }),
    prisma.creditTransaction.findMany({
      where: { delta: { lt: 0 }, createdAt: { gte: today } },
      select: { delta: true, user: { select: { plan: true } } },
    }),
  ]);

  const granted = grantAgg._sum.delta ?? 0;
  let spent = 0;
  let freeBurn = 0;
  for (const t of todaysSpends) {
    const abs = Math.abs(t.delta);
    spent += abs;
    if (t.user.plan === "free") freeBurn += abs;
  }

  return {
    granted,
    spent,
    freeBurn,
    estSpentUsd: estDollarsForCredits(spent),
    estFreeBurnUsd: estDollarsForCredits(freeBurn),
  };
}

// ── RENDER HEALTH ────────────────────────────────────────────────────────────

export interface RenderHealth {
  byStatus: Record<string, number>;
  avgRenderTimeSec: number | null;
  terminalTotal: number;
  failed: number;
  errorRatePct: number;
  byMode: { mode: string; total: number; failed: number; errorRatePct: number }[];
  modeWindowDays: number;
}

export async function getRenderHealth(): Promise<RenderHealth> {
  const modeWindowDays = 30;
  const [statusGroups, avgAgg, recent] = await Promise.all([
    prisma.contentItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contentItem.aggregate({
      _avg: { renderTimeSec: true },
      where: { status: "ready", renderTimeSec: { not: null } },
    }),
    prisma.contentItem.findMany({
      where: { createdAt: { gte: daysAgo(modeWindowDays) } },
      select: { format: true, backgroundMode: true, templateId: true, status: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;

  const ready = byStatus["ready"] ?? 0;
  const failed = byStatus["failed"] ?? 0;
  const terminalTotal = ready + failed;

  const modeMap = new Map<string, { total: number; failed: number }>();
  for (const r of recent) {
    if (r.status !== "ready" && r.status !== "failed") continue; // terminal only
    const mode = deriveRenderMode(r);
    const m = modeMap.get(mode) ?? { total: 0, failed: 0 };
    m.total += 1;
    if (r.status === "failed") m.failed += 1;
    modeMap.set(mode, m);
  }
  const byMode = [...modeMap.entries()]
    .map(([mode, m]) => ({
      mode,
      total: m.total,
      failed: m.failed,
      errorRatePct: m.total > 0 ? (m.failed / m.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    byStatus,
    avgRenderTimeSec: avgAgg._avg.renderTimeSec ?? null,
    terminalTotal,
    failed,
    errorRatePct: terminalTotal > 0 ? (failed / terminalTotal) * 100 : 0,
    byMode,
    modeWindowDays,
  };
}

// ── FAILED RENDERS + refund state ────────────────────────────────────────────

export interface FailedRender {
  id: string;
  jobId: string;
  userId: string;
  userEmail: string;
  mode: string;
  error: string | null;
  createdAt: Date;
  refunded: boolean;
}

export async function getFailedRenders(limit = 100): Promise<FailedRender[]> {
  const items = await prisma.contentItem.findMany({
    where: { status: "failed" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      jobId: true,
      userId: true,
      format: true,
      backgroundMode: true,
      templateId: true,
      error: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  const jobIds = items.map((i) => i.jobId);
  const refunds = await prisma.creditTransaction.findMany({
    where: { jobId: { in: jobIds }, type: "refund" },
    select: { jobId: true },
  });
  const refundedJobs = new Set(refunds.map((r) => r.jobId));

  return items.map((i) => ({
    id: i.id,
    jobId: i.jobId,
    userId: i.userId,
    userEmail: i.user.email,
    mode: deriveRenderMode(i),
    error: i.error,
    createdAt: i.createdAt,
    refunded: refundedJobs.has(i.jobId),
  }));
}

// ── COST / MARGIN by mode (all est.) ─────────────────────────────────────────

export interface ModeCost {
  mode: string;
  renders: number;
  credits: number;
  estRevenueUsd: number;
  estCostUsd: number;
  estMarginUsd: number;
}

export interface CostByMode {
  windowDays: number;
  rows: ModeCost[];
  totals: { renders: number; credits: number; estRevenueUsd: number; estCostUsd: number; estMarginUsd: number };
}

export async function getCostByMode(windowDays = 30): Promise<CostByMode> {
  const spends = await prisma.creditTransaction.findMany({
    where: { type: "render_spend", delta: { lt: 0 }, createdAt: { gte: daysAgo(windowDays) } },
    select: { delta: true, jobId: true, userId: true },
  });

  const jobIds = [...new Set(spends.map((s) => s.jobId).filter((j): j is string => !!j))];
  const userIds = [...new Set(spends.map((s) => s.userId))];

  const [items, users] = await Promise.all([
    prisma.contentItem.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, format: true, backgroundMode: true, templateId: true },
    }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, plan: true } }),
  ]);
  const itemByJob = new Map(items.map((i) => [i.jobId, i]));
  const planByUser = new Map(users.map((u) => [u.id, u.plan as PlanName]));

  const map = new Map<string, ModeCost>();
  for (const s of spends) {
    const credits = Math.abs(s.delta);
    const item = s.jobId ? itemByJob.get(s.jobId) : undefined;
    const mode = item ? deriveRenderMode(item) : "unknown";
    const plan = planByUser.get(s.userId) ?? "free";
    const estRevenueUsd = credits * CREDIT_VALUE_USD[plan];
    const estCostUsd = estDollarsForCredits(credits);

    const row = map.get(mode) ?? {
      mode, renders: 0, credits: 0, estRevenueUsd: 0, estCostUsd: 0, estMarginUsd: 0,
    };
    row.renders += 1;
    row.credits += credits;
    row.estRevenueUsd += estRevenueUsd;
    row.estCostUsd += estCostUsd;
    row.estMarginUsd += estRevenueUsd - estCostUsd;
    map.set(mode, row);
  }

  const rows = [...map.values()].sort((a, b) => b.credits - a.credits);
  const totals = rows.reduce(
    (t, r) => ({
      renders: t.renders + r.renders,
      credits: t.credits + r.credits,
      estRevenueUsd: t.estRevenueUsd + r.estRevenueUsd,
      estCostUsd: t.estCostUsd + r.estCostUsd,
      estMarginUsd: t.estMarginUsd + r.estMarginUsd,
    }),
    { renders: 0, credits: 0, estRevenueUsd: 0, estCostUsd: 0, estMarginUsd: 0 }
  );

  return { windowDays, rows, totals };
}

// ── CREDIT LIABILITY ──────────────────────────────────────────────────────────

export interface CreditLiability {
  total: number;
  byPlan: Record<PlanName, number>;
}

export async function getCreditLiability(): Promise<CreditLiability> {
  const [totalAgg, byPlanGroups] = await Promise.all([
    prisma.user.aggregate({ _sum: { creditBalance: true } }),
    prisma.user.groupBy({ by: ["plan"], _sum: { creditBalance: true } }),
  ]);
  const byPlan: Record<PlanName, number> = { free: 0, creator: 0, pro: 0 };
  for (const g of byPlanGroups) {
    if (g.plan in byPlan) byPlan[g.plan as PlanName] = g._sum.creditBalance ?? 0;
  }
  return { total: totalAgg._sum.creditBalance ?? 0, byPlan };
}

// ── BILLING HEALTH (from WebhookEvent) ───────────────────────────────────────

export interface WebhookEventRow {
  id: string;
  eventName: string;
  resourceId: string | null;
  userId: string | null;
  signatureValid: boolean;
  handled: boolean;
  grantedCreditTxId: string | null;
  error: string | null;
  createdAt: Date;
}

export interface BillingHealth {
  recent: WebhookEventRow[];
  errored: WebhookEventRow[];
  unhandled: WebhookEventRow[];
  paidNoCredits: WebhookEventRow[];
  totalEvents: number;
}

export async function getBillingHealth(): Promise<BillingHealth> {
  const select = {
    id: true, eventName: true, resourceId: true, userId: true,
    signatureValid: true, handled: true, grantedCreditTxId: true, error: true, createdAt: true,
  } as const;

  const [recent, errored, unhandled, paidNoCredits, totalEvents] = await Promise.all([
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50, select }),
    prisma.webhookEvent.findMany({
      where: { error: { not: null } }, orderBy: { createdAt: "desc" }, take: 50, select,
    }),
    prisma.webhookEvent.findMany({
      where: { handled: false, signatureValid: true }, orderBy: { createdAt: "desc" }, take: 50, select,
    }),
    prisma.webhookEvent.findMany({
      where: {
        eventName: { in: ["subscription_payment_success", "order_created"] },
        grantedCreditTxId: null,
        signatureValid: true,
        userId: { not: null },
      },
      orderBy: { createdAt: "desc" }, take: 50, select,
    }),
    prisma.webhookEvent.count(),
  ]);

  return { recent, errored, unhandled, paidNoCredits, totalEvents };
}

// ── ABUSE (disposable email, light) ──────────────────────────────────────────

// Small starter list; extend as needed. Same-IP detection is intentionally out
// of scope (login IPs are not persisted).
export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "getnada.com", "sharklasers.com", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mintemail.com", "mohmal.com",
];

export interface DisposableUser {
  id: string;
  email: string;
  plan: string;
  creditBalance: number;
  bannedAt: Date | null;
  createdAt: Date;
}

export async function getDisposableEmailUsers(): Promise<DisposableUser[]> {
  return prisma.user.findMany({
    where: { OR: DISPOSABLE_EMAIL_DOMAINS.map((d) => ({ email: { endsWith: `@${d}` } })) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, plan: true, creditBalance: true, bannedAt: true, createdAt: true },
  });
}

// ── DAILY SPEND (report-only, 30d) ───────────────────────────────────────────

export interface DailySpend {
  day: string; // YYYY-MM-DD (UTC)
  credits: number;
  estUsd: number;
}

export async function getDailySpend(days = 30): Promise<DailySpend[]> {
  const spends = await prisma.creditTransaction.findMany({
    where: { delta: { lt: 0 }, createdAt: { gte: daysAgo(days) } },
    select: { delta: true, createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const t of spends) {
    const day = t.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Math.abs(t.delta));
  }
  // Fill the full window so gaps render as zero.
  const out: DailySpend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const credits = byDay.get(day) ?? 0;
    out.push({ day, credits, estUsd: estDollarsForCredits(credits) });
  }
  return out;
}

// ── USER LOOKUP ───────────────────────────────────────────────────────────────

export interface UserLookupResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    subscriptionStatus: string | null;
    creditBalance: number;
    bannedAt: Date | null;
    createdAt: Date;
  };
  renders: { id: string; jobId: string; mode: string; status: string; createdAt: Date }[];
  transactions: { id: string; delta: number; balanceAfter: number; type: string; reason: string | null; jobId: string | null; createdAt: Date }[];
}

export async function lookupUser(email: string): Promise<UserLookupResult | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true, email: true, name: true, plan: true, subscriptionStatus: true,
      creditBalance: true, bannedAt: true, createdAt: true,
    },
  });
  if (!user) return null;

  const [renders, transactions] = await Promise.all([
    prisma.contentItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, jobId: true, format: true, backgroundMode: true, templateId: true, status: true, createdAt: true },
    }),
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, delta: true, balanceAfter: true, type: true, reason: true, jobId: true, createdAt: true },
    }),
  ]);

  return {
    user,
    renders: renders.map((r) => ({
      id: r.id, jobId: r.jobId, mode: deriveRenderMode(r), status: r.status, createdAt: r.createdAt,
    })),
    transactions,
  };
}
