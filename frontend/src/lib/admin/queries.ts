import { prisma } from "@/lib/prisma";
import {
  PLAN_PRICES,
  CREDIT_VALUE_USD,
  estDollarsForCredits,
  type PlanName,
} from "@/lib/credits/config";
import { isAdminEmail } from "@/lib/admin";
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

// ── TODAY: credits granted vs spent + free-user burn ($ measured where avail) ─

export interface TodayCreditFlow {
  granted: number;
  spent: number;            // credits
  freeBurn: number;         // credits
  spentUsd: number;         // measured providerCostUsd where present, else estimate
  freeBurnUsd: number;
  spendsTotal: number;      // # of spend rows today
  spendsMeasured: number;   // # with a real providerCostUsd (for coverage badge)
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
      select: { delta: true, jobId: true, user: { select: { plan: true } } },
    }),
  ]);

  // Join today's spends to their ContentItem for the measured provider cost.
  const jobIds = [...new Set(todaysSpends.map((s) => s.jobId).filter((j): j is string => !!j))];
  const items = jobIds.length
    ? await prisma.contentItem.findMany({
        where: { jobId: { in: jobIds } },
        select: { jobId: true, providerCostUsd: true },
      })
    : [];
  const measuredByJob = new Map(items.map((i) => [i.jobId, i.providerCostUsd]));

  const granted = grantAgg._sum.delta ?? 0;
  let spent = 0, freeBurn = 0, spentUsd = 0, freeBurnUsd = 0, spendsMeasured = 0;
  for (const t of todaysSpends) {
    const abs = Math.abs(t.delta);
    const measured = t.jobId ? measuredByJob.get(t.jobId) ?? null : null;
    const usd = measured !== null && measured !== undefined ? measured : estDollarsForCredits(abs);
    if (measured !== null && measured !== undefined) spendsMeasured += 1;
    spent += abs;
    spentUsd += usd;
    if (t.user.plan === "free") { freeBurn += abs; freeBurnUsd += usd; }
  }

  return {
    granted, spent, freeBurn, spentUsd, freeBurnUsd,
    spendsTotal: todaysSpends.length, spendsMeasured,
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

// ── COST / MARGIN by mode (measured where available, else est.) ──────────────

export interface ModeCost {
  mode: string;
  renders: number;
  rendersMeasured: number;     // how many had a real providerCostUsd
  credits: number;
  estRevenueUsd: number;       // revenue is always derived from credit value
  measuredCostUsd: number;     // Σ providerCostUsd (real)
  fallbackCostUsd: number;     // Σ estimate for renders lacking real cost
  costUsd: number;             // measured + fallback
  marginUsd: number;           // estRevenue − costUsd
}

export interface CostByMode {
  windowDays: number;
  rows: ModeCost[];
  totals: {
    renders: number; rendersMeasured: number; credits: number;
    estRevenueUsd: number; measuredCostUsd: number; fallbackCostUsd: number;
    costUsd: number; marginUsd: number;
  };
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
      // providerCostUsd is the measured cost; null → fall back to estimate.
      select: { jobId: true, format: true, backgroundMode: true, templateId: true, providerCostUsd: true },
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

    const measured = item?.providerCostUsd ?? null;
    const hasMeasured = measured !== null;
    const costUsd = hasMeasured ? measured : estDollarsForCredits(credits);

    const row = map.get(mode) ?? {
      mode, renders: 0, rendersMeasured: 0, credits: 0, estRevenueUsd: 0,
      measuredCostUsd: 0, fallbackCostUsd: 0, costUsd: 0, marginUsd: 0,
    };
    row.renders += 1;
    if (hasMeasured) { row.rendersMeasured += 1; row.measuredCostUsd += measured; }
    else { row.fallbackCostUsd += costUsd; }
    row.credits += credits;
    row.estRevenueUsd += estRevenueUsd;
    row.costUsd += costUsd;
    row.marginUsd += estRevenueUsd - costUsd;
    map.set(mode, row);
  }

  const rows = [...map.values()].sort((a, b) => b.credits - a.credits);
  const totals = rows.reduce(
    (t, r) => ({
      renders: t.renders + r.renders,
      rendersMeasured: t.rendersMeasured + r.rendersMeasured,
      credits: t.credits + r.credits,
      estRevenueUsd: t.estRevenueUsd + r.estRevenueUsd,
      measuredCostUsd: t.measuredCostUsd + r.measuredCostUsd,
      fallbackCostUsd: t.fallbackCostUsd + r.fallbackCostUsd,
      costUsd: t.costUsd + r.costUsd,
      marginUsd: t.marginUsd + r.marginUsd,
    }),
    { renders: 0, rendersMeasured: 0, credits: 0, estRevenueUsd: 0, measuredCostUsd: 0, fallbackCostUsd: 0, costUsd: 0, marginUsd: 0 }
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

// ── WEEK-OVER-WEEK DELTAS (reconstructable from timestamps) ───────────────────
// Period-over-period for metrics whose history can be rebuilt from row
// timestamps: signups, credit spend, renders (count), and new-signup conversion.
// Deliberately NOT computed for MRR or credit liability — those are point-in-time
// state and cannot be reconstructed without historical snapshots.

export interface WeekDelta {
  current: number; // this 7d
  prior: number; // the 7d before that
  pctChange: number | null; // relative % change; null when prior is 0 and current > 0
}

export interface WeekOverWeek {
  signups: WeekDelta;
  spend: WeekDelta; // credits spent (abs)
  renders: WeekDelta; // ContentItem rows created
  // Cohort conversion: % of each week's NEW signups currently on a paid plan.
  // (Reconstructable from createdAt + current plan; differs from the all-time
  // paid/total headline conversion in Overview.)
  conversion: WeekDelta; // values are percentages
}

function weekPctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

export async function getWeekOverWeek(): Promise<WeekOverWeek> {
  const d7 = daysAgo(7);
  const d14 = daysAgo(14);

  const [
    signupsCur, signupsPrior,
    paidCur, paidPrior,
    spendCur, spendPrior,
    rendersCur, rendersPrior,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d7 }, plan: { in: ["creator", "pro"] } } }),
    prisma.user.count({ where: { createdAt: { gte: d14, lt: d7 }, plan: { in: ["creator", "pro"] } } }),
    prisma.creditTransaction.aggregate({ _sum: { delta: true }, where: { delta: { lt: 0 }, createdAt: { gte: d7 } } }),
    prisma.creditTransaction.aggregate({ _sum: { delta: true }, where: { delta: { lt: 0 }, createdAt: { gte: d14, lt: d7 } } }),
    prisma.contentItem.count({ where: { createdAt: { gte: d7 } } }),
    prisma.contentItem.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
  ]);

  const spendCurAbs = Math.abs(spendCur._sum.delta ?? 0);
  const spendPriorAbs = Math.abs(spendPrior._sum.delta ?? 0);
  const convCur = signupsCur > 0 ? (paidCur / signupsCur) * 100 : 0;
  const convPrior = signupsPrior > 0 ? (paidPrior / signupsPrior) * 100 : 0;

  return {
    signups: { current: signupsCur, prior: signupsPrior, pctChange: weekPctChange(signupsCur, signupsPrior) },
    spend: { current: spendCurAbs, prior: spendPriorAbs, pctChange: weekPctChange(spendCurAbs, spendPriorAbs) },
    renders: { current: rendersCur, prior: rendersPrior, pctChange: weekPctChange(rendersCur, rendersPrior) },
    conversion: { current: convCur, prior: convPrior, pctChange: weekPctChange(convCur, convPrior) },
  };
}

// ── CUSTOMERS TABLE ───────────────────────────────────────────────────────────

export type CustomerSort =
  | "name" | "tier" | "status" | "credits" | "used" | "renders" | "joined" | "renews" | "price";

const CUSTOMER_SORTS: CustomerSort[] =
  ["name", "tier", "status", "credits", "used", "renders", "joined", "renews", "price"];

export interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  displayName: string;       // name, else email prefix
  plan: PlanName;
  subscriptionStatus: string | null;
  creditBalance: number;     // credits remaining
  creditsUsed: number;       // |Σ negative render_spend + post_spend| (positive)
  renders: number;           // ContentItem count
  createdAt: Date;           // joined
  currentPeriodEnd: Date | null; // renews (paid only)
  planPrice: number;         // PLAN_PRICES[plan]
  isPaid: boolean;
}

export interface CustomersData {
  rows: CustomerRow[];
  totalAll: number;          // before realOnly filter
  totalShown: number;        // after filter
  activeTotal: number;       // active subs (all users, not affected by realOnly)
  activeByTier: { creator: string[]; pro: string[] }; // paying customers' names
  sort: CustomerSort;
  dir: "asc" | "desc";
  realOnly: boolean;
}

/**
 * A row is a "test/non-real" customer when its email is an example.com address,
 * carries a +fluvioqa / qa+ QA tag, or is an admin (ADMIN_EMAILS). The realOnly
 * toggle hides these from the table VIEW only — nothing is deleted, and the
 * active-subscription summary is computed from all users regardless.
 */
function isNonRealCustomer(email: string): boolean {
  const e = email.toLowerCase();
  return (
    e.includes("@example.com") ||
    e.includes("+fluvioqa") ||
    e.includes("qa+") ||
    isAdminEmail(e)
  );
}

export async function getCustomers(opts: {
  sort?: string;
  dir?: string;
  realOnly?: boolean;
}): Promise<CustomersData> {
  const sort: CustomerSort = CUSTOMER_SORTS.includes(opts.sort as CustomerSort)
    ? (opts.sort as CustomerSort)
    : "joined";
  const dir: "asc" | "desc" = opts.dir === "asc" ? "asc" : "desc";
  const realOnly = !!opts.realOnly;

  const [users, usedAgg, renderAgg] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, plan: true, subscriptionStatus: true,
        creditBalance: true, createdAt: true, currentPeriodEnd: true,
      },
    }),
    prisma.creditTransaction.groupBy({
      by: ["userId"],
      where: { type: { in: ["render_spend", "post_spend"] }, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    prisma.contentItem.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);

  const usedByUser = new Map(usedAgg.map((u) => [u.userId, Math.abs(u._sum.delta ?? 0)]));
  const rendersByUser = new Map(renderAgg.map((r) => [r.userId, r._count._all]));

  let rows: CustomerRow[] = users.map((u) => {
    const plan = (u.plan as PlanName) ?? "free";
    const isPaid = plan === "creator" || plan === "pro";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      displayName: u.name?.trim() || u.email.split("@")[0],
      plan,
      subscriptionStatus: u.subscriptionStatus,
      creditBalance: u.creditBalance,
      creditsUsed: usedByUser.get(u.id) ?? 0,
      renders: rendersByUser.get(u.id) ?? 0,
      createdAt: u.createdAt,
      currentPeriodEnd: u.currentPeriodEnd,
      planPrice: PLAN_PRICES[plan],
      isPaid,
    };
  });

  const totalAll = rows.length;

  // Active-subscription summary — from ALL users (toggle doesn't affect it).
  const activeByTier: { creator: string[]; pro: string[] } = { creator: [], pro: [] };
  for (const r of rows) {
    if (r.subscriptionStatus === "active" && (r.plan === "creator" || r.plan === "pro")) {
      activeByTier[r.plan].push(r.displayName);
    }
  }
  const activeTotal = activeByTier.creator.length + activeByTier.pro.length;

  if (realOnly) rows = rows.filter((r) => !isNonRealCustomer(r.email));
  const totalShown = rows.length;

  const planRank: Record<PlanName, number> = { free: 0, creator: 1, pro: 2 };
  const cmp: Record<CustomerSort, (a: CustomerRow, b: CustomerRow) => number> = {
    name: (a, b) => a.displayName.localeCompare(b.displayName),
    tier: (a, b) => planRank[a.plan] - planRank[b.plan],
    status: (a, b) => (a.subscriptionStatus ?? "").localeCompare(b.subscriptionStatus ?? ""),
    credits: (a, b) => a.creditBalance - b.creditBalance,
    used: (a, b) => a.creditsUsed - b.creditsUsed,
    renders: (a, b) => a.renders - b.renders,
    joined: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    renews: (a, b) => (a.currentPeriodEnd?.getTime() ?? 0) - (b.currentPeriodEnd?.getTime() ?? 0),
    price: (a, b) => a.planPrice - b.planPrice,
  };
  rows.sort(cmp[sort]);
  if (dir === "desc") rows.reverse();

  return { rows, totalAll, totalShown, activeTotal, activeByTier, sort, dir, realOnly };
}
