import {
  getOverview, getTodayCreditFlow, getRenderHealth, getFailedRenders,
  getCostByMode, getCreditLiability, getBillingHealth, getDisposableEmailUsers,
  getDailySpend, lookupUser, getCustomers, getWeekOverWeek, type CustomerSort,
} from "@/lib/admin/queries";
import { adminGrantCredits, adminForceRefund, adminSetBan } from "./actions";
import {
  Panel, Stat, Kpi, Est, CoverageBadge, Delta, toneAbove, toneBelow,
  fmtUsd, fmtNum, fmtPct, fmtDate,
} from "./_components";
import { AdminTabs, type AdminTabDef, type AdminTriageItem } from "./AdminTabs";
import CreditEstimator from "@/components/credits/CreditEstimator";

// Reads session + DB on every request — always dynamic.
export const dynamic = "force-dynamic";

// ── Tunable thresholds (additive). Stat coloring + triage roll-up read these;
// the existing inline thresholds inside the tables are intentionally left as-is.
const ERROR_RATE_WARN = 10;      // render-health headline error rate: amber ≥ this
const ERROR_RATE_CRIT = 20;      // ...red ≥ this (matches the per-mode table's 20%)
const CONVERSION_TARGET = 5;     // free→paid %: green ≥ this
const CONVERSION_WARN = 2;       // ...amber ≥ this; red below
const WEBHOOK_ERROR_WARN = 1;    // errored/unhandled webhook counts: amber ≥ this
const WEBHOOK_ERROR_CRIT = 5;    // ...red ≥ this
const TRIAGE_MARGIN_FLOOR = 0;   // triage: a mode with margin below this is flagged
const TRIAGE_MODE_ERROR_PCT = 20; // triage: a mode with error rate above this is flagged

const TAB_IDS = ["overview", "money", "operations", "users", "integrity"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sort?: string; dir?: string; real?: string; flash?: string; tab?: string }>;
}) {
  const { email, sort, dir, real, flash, tab } = await searchParams;
  const realOnly = real === "1";

  const [
    overview, today, health, failed, cost, liability, billing, disposable, daily, customers, wow, lookup,
  ] = await Promise.all([
    getOverview(),
    getTodayCreditFlow(),
    getRenderHealth(),
    getFailedRenders(),
    getCostByMode(),
    getCreditLiability(),
    getBillingHealth(),
    getDisposableEmailUsers(),
    getDailySpend(),
    getCustomers({ sort, dir, realOnly }),
    getWeekOverWeek(),
    email ? lookupUser(email) : Promise.resolve(null),
  ]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.credits));

  // ── TRIAGE roll-up — derived ENTIRELY from data already fetched above (no new
  // queries). Each problem becomes one line that jumps to the right tab + panel.
  const failedNotRefunded = failed.filter((f) => !f.refunded).length;
  const negMarginModes = cost.rows.filter((r) => r.marginUsd < TRIAGE_MARGIN_FLOOR).length;
  const highErrorModes = health.byMode.filter((m) => m.errorRatePct > TRIAGE_MODE_ERROR_PCT).length;
  const erroredCount = billing.errored.length;
  const unhandledCount = billing.unhandled.length;
  const paidNoCreditsCount = billing.paidNoCredits.length;

  const triage: AdminTriageItem[] = [];
  if (failedNotRefunded > 0)
    triage.push({ text: `${fmtNum(failedNotRefunded)} failed render${failedNotRefunded === 1 ? "" : "s"} not yet refunded`, tab: "operations", anchor: "#failed-renders" });
  if (paidNoCreditsCount > 0)
    triage.push({ text: `${fmtNum(paidNoCreditsCount)} paid but no credits granted`, tab: "integrity", anchor: "#billing-health" });
  if (negMarginModes > 0)
    triage.push({ text: `${fmtNum(negMarginModes)} mode${negMarginModes === 1 ? "" : "s"} running at negative margin`, tab: "money", anchor: "#cost-margin" });
  if (highErrorModes > 0)
    triage.push({ text: `${fmtNum(highErrorModes)} mode${highErrorModes === 1 ? "" : "s"} with error rate > ${TRIAGE_MODE_ERROR_PCT}%`, tab: "operations", anchor: "#render-health" });
  if (erroredCount > 0 || unhandledCount > 0)
    triage.push({ text: `${fmtNum(erroredCount)} errored / ${fmtNum(unhandledCount)} unhandled webhook${erroredCount + unhandledCount === 1 ? "" : "s"}`, tab: "integrity", anchor: "#billing-health" });

  // Default tab: explicit ?tab, else Users when a lookup is open, else Overview.
  const initialTab =
    tab && (TAB_IDS as readonly string[]).includes(tab) ? tab : email ? "users" : "overview";

  // Build a /admin query string from the current params plus overrides. Empty
  // values drop the param. Used for sortable headers, the realOnly toggle, and
  // row → detail links (which reuse the existing ?email= lookup panel). `tab` is
  // carried so these links keep the active tab.
  const current: Record<string, string | undefined> = { email, sort, dir, real, tab };
  const href = (overrides: Record<string, string | undefined>, hash = "") => {
    const merged = { ...current, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, String(v));
    const q = sp.toString();
    return `${q ? `?${q}` : "?"}${hash}`;
  };
  const customerCols: { key: CustomerSort; label: string }[] = [
    { key: "name", label: "Customer" },
    { key: "tier", label: "Tier" },
    { key: "status", label: "Status" },
    { key: "credits", label: "Credits left" },
    { key: "used", label: "Credits used" },
    { key: "renders", label: "Renders" },
    { key: "joined", label: "Joined" },
    { key: "renews", label: "Renews" },
    { key: "price", label: "Price" },
  ];
  const tierBadge: Record<string, string> = {
    free: "bg-zinc-100 text-zinc-600",
    creator: "bg-sky-100 text-sky-700",
    pro: "bg-violet-100 text-violet-700",
  };

  // ── KPI strip (always visible above the tabs) ──
  const kpi = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi icon="payments" label="MRR" value={fmtUsd(overview.mrr)} />
      <Kpi icon="workspace_premium" label="Active subs" value={fmtNum(overview.activeSubs)} />
      <Kpi
        icon="trending_up"
        label="Conversion"
        value={fmtPct(overview.conversionPct)}
        tone={toneBelow(overview.conversionPct, CONVERSION_WARN, CONVERSION_TARGET)}
        delta={<Delta {...wow.conversion} />}
      />
      <Kpi icon="today" label="Net credits today" value={fmtNum(today.granted - today.spent)} />
      <Kpi
        icon="monitoring"
        label="Error rate"
        value={fmtPct(health.errorRatePct)}
        tone={toneAbove(health.errorRatePct, ERROR_RATE_WARN, ERROR_RATE_CRIT)}
      />
      <Kpi icon="account_balance" label="Outstanding cr." value={fmtNum(liability.total)} />
    </div>
  );

  // ── Panels (unchanged content; just grouped into tabs below) ──
  const overviewPanel = (
    <Panel title="Overview" icon="dashboard">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="MRR" value={fmtUsd(overview.mrr)} sub={`${overview.activeSubs} active subs`} />
        <Stat
          label="Subs by tier"
          value={`${overview.subsByTier.creator} / ${overview.subsByTier.pro}`}
          sub="creator / pro (active)"
        />
        <Stat
          label="Signups"
          value={fmtNum(overview.signupsToday)}
          sub={<>{fmtNum(overview.signups7d)} in last 7d · <Delta {...wow.signups} /></>}
        />
        <Stat
          label="Free→paid conversion"
          value={fmtPct(overview.conversionPct)}
          tone={toneBelow(overview.conversionPct, CONVERSION_WARN, CONVERSION_TARGET)}
          sub={<>{fmtNum(overview.paidUsers)} / {fmtNum(overview.totalUsers)} users · new-signup conv. <Delta {...wow.conversion} /></>}
        />
      </div>
    </Panel>
  );

  const todayPanel = (
    <Panel
      title="Today — credit flow"
      icon="today"
      note={<>Dollar cost uses the measured provider cost where the render has it; otherwise the credit-rate estimate ($0.0295/credit). Coverage: {today.spendsMeasured}/{today.spendsTotal} of today&apos;s charges measured.</>}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Credits granted" value={fmtNum(today.granted)} />
        <Stat label="Credits spent" value={fmtNum(today.spent)} sub={<>{fmtUsd(today.spentUsd)}<CoverageBadge measured={today.spendsMeasured} total={today.spendsTotal} /></>} />
        <Stat label="Free-user burn" value={fmtNum(today.freeBurn)} sub={<>{fmtUsd(today.freeBurnUsd)}<CoverageBadge measured={today.spendsMeasured} total={today.spendsTotal} /></>} />
        <Stat label="Net credits" value={fmtNum(today.granted - today.spent)} />
      </div>
    </Panel>
  );

  const renderHealthPanel = (
    <Panel
      id="render-health"
      title="Render health"
      icon="monitoring"
      note={<>Renders (7d vs prior 7d): <Delta {...wow.renders} />. Status comes from the DB (no queued-vs-running split). Error rate by mode is over the last {health.modeWindowDays} days; mode is derived from format/template/background.</>}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Rendering" value={fmtNum(health.byStatus["rendering"] ?? 0)} />
        <Stat label="Ready" value={fmtNum(health.byStatus["ready"] ?? 0)} />
        <Stat label="Failed" value={fmtNum(health.byStatus["failed"] ?? 0)} />
        <Stat label="Avg render time" value={health.avgRenderTimeSec != null ? `${Math.round(health.avgRenderTimeSec)}s` : "—"} />
        <Stat
          label="Error rate"
          value={fmtPct(health.errorRatePct)}
          tone={toneAbove(health.errorRatePct, ERROR_RATE_WARN, ERROR_RATE_CRIT)}
          sub={`${health.failed}/${health.terminalTotal} terminal`}
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Mode</th>
              <th className="py-2 pr-4">Renders</th>
              <th className="py-2 pr-4">Failed</th>
              <th className="py-2 pr-4">Error rate</th>
            </tr>
          </thead>
          <tbody>
            {health.byMode.map((m) => (
              <tr key={m.mode} className="border-b border-zinc-100">
                <td className="py-2 pr-4 font-mono">{m.mode}</td>
                <td className="py-2 pr-4">{fmtNum(m.total)}</td>
                <td className="py-2 pr-4">{fmtNum(m.failed)}</td>
                <td className={`py-2 pr-4 font-bold ${m.errorRatePct > 20 ? "text-red-600" : "text-zinc-700"}`}>
                  {fmtPct(m.errorRatePct)}
                </td>
              </tr>
            ))}
            {health.byMode.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-zinc-400">No terminal renders in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const failedPanel = (
    <Panel id="failed-renders" title="Failed renders" icon="error" note="Refund is idempotent — one refund per job; no-ops if nothing was charged.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Mode</th>
              <th className="py-2 pr-4">Error</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Refund</th>
            </tr>
          </thead>
          <tbody>
            {failed.map((f) => (
              <tr key={f.id} className="border-b border-zinc-100 align-top">
                <td className="py-2 pr-4">{f.userEmail}</td>
                <td className="py-2 pr-4 font-mono text-xs">{f.mode}</td>
                <td className="py-2 pr-4 max-w-xs truncate text-zinc-600" title={f.error ?? ""}>{f.error ?? "—"}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">{fmtDate(f.createdAt)}</td>
                <td className="py-2 pr-4">
                  {f.refunded ? (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Refunded</span>
                  ) : (
                    <form action={adminForceRefund}>
                      <input type="hidden" name="userId" value={f.userId} />
                      <input type="hidden" name="email" value={f.userEmail} />
                      <input type="hidden" name="jobId" value={f.jobId} />
                      <button className="rounded bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90">
                        Refund credits
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {failed.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-zinc-400">No failed renders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const costPanel = (
    <Panel
      id="cost-margin"
      title="Cost / margin by mode"
      icon="payments"
      note={<>Last {cost.windowDays} days. <b>Cost</b> uses the measured provider cost when the render has it (badge <span className="text-emerald-700 font-bold">measured</span>), otherwise the credit-rate estimate (<span className="text-amber-700 font-bold">est.</span>); mixed shows the ratio. <b>Revenue</b> is always estimated from credit value (Creator $0.040, Pro $0.0295). <b>Margin %</b> = margin ÷ est. revenue; <b>Margin / render</b> = margin ÷ renders. Overall: {cost.totals.rendersMeasured}/{cost.totals.renders} renders measured.</>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Mode</th>
              <th className="py-2 pr-4">Renders</th>
              <th className="py-2 pr-4">Credits</th>
              <th className="py-2 pr-4">Est. revenue</th>
              <th className="py-2 pr-4">Cost</th>
              <th className="py-2 pr-4">Margin</th>
              <th className="py-2 pr-4">Margin %</th>
              <th className="py-2 pr-4">Margin / render</th>
            </tr>
          </thead>
          <tbody>
            {cost.rows.map((r) => {
              const marginTone = r.marginUsd < 0 ? "text-red-600" : "text-emerald-700";
              const marginPct = r.estRevenueUsd > 0 ? (r.marginUsd / r.estRevenueUsd) * 100 : null;
              const marginPerRender = r.renders > 0 ? r.marginUsd / r.renders : null;
              return (
                <tr key={r.mode} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-mono">{r.mode}</td>
                  <td className="py-2 pr-4">{fmtNum(r.renders)}</td>
                  <td className="py-2 pr-4">{fmtNum(r.credits)}</td>
                  <td className="py-2 pr-4">{fmtUsd(r.estRevenueUsd)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {fmtUsd(r.costUsd)}<CoverageBadge measured={r.rendersMeasured} total={r.renders} />
                  </td>
                  <td className={`py-2 pr-4 font-bold ${marginTone}`}>{fmtUsd(r.marginUsd)}</td>
                  <td className={`py-2 pr-4 font-bold ${marginTone}`}>{marginPct === null ? "—" : fmtPct(marginPct)}</td>
                  <td className={`py-2 pr-4 font-bold ${marginTone}`}>{marginPerRender === null ? "—" : fmtUsd(marginPerRender)}</td>
                </tr>
              );
            })}
            {cost.rows.length > 0 && (
              <tr className="font-bold">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4">{fmtNum(cost.totals.renders)}</td>
                <td className="py-2 pr-4">{fmtNum(cost.totals.credits)}</td>
                <td className="py-2 pr-4">{fmtUsd(cost.totals.estRevenueUsd)}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {fmtUsd(cost.totals.costUsd)}<CoverageBadge measured={cost.totals.rendersMeasured} total={cost.totals.renders} />
                </td>
                <td className={`py-2 pr-4 ${cost.totals.marginUsd < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {fmtUsd(cost.totals.marginUsd)}
                </td>
                <td className={`py-2 pr-4 ${cost.totals.marginUsd < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {cost.totals.estRevenueUsd > 0 ? fmtPct((cost.totals.marginUsd / cost.totals.estRevenueUsd) * 100) : "—"}
                </td>
                <td className={`py-2 pr-4 ${cost.totals.marginUsd < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {cost.totals.renders > 0 ? fmtUsd(cost.totals.marginUsd / cost.totals.renders) : "—"}
                </td>
              </tr>
            )}
            {cost.rows.length === 0 && (
              <tr><td colSpan={8} className="py-4 text-zinc-400">No render charges in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const liabilityPanel = (
    <Panel title="Credit liability" icon="account_balance" note="Total outstanding credits held by users (a future-cost liability).">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total outstanding" value={fmtNum(liability.total)} />
        <Stat label="Free" value={fmtNum(liability.byPlan.free)} />
        <Stat label="Creator" value={fmtNum(liability.byPlan.creator)} />
        <Stat label="Pro" value={fmtNum(liability.byPlan.pro)} />
      </div>
    </Panel>
  );

  const dailyPanel = (
    <Panel
      title="Daily spend — last 30 days"
      icon="bar_chart"
      note={<>Credit spend (7d vs prior 7d): <Delta {...wow.spend} invert />. Report-only (no cap/alert enforcement). Dollar figures are estimated.<Est /></>}
    >
      <div className="space-y-1">
        {daily.map((d) => (
          <div key={d.day} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 text-zinc-500">{d.day}</span>
            <div className="h-4 flex-1 rounded bg-zinc-100">
              <div
                className="h-4 rounded bg-primary/70"
                style={{ width: `${(d.credits / maxDaily) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums">{fmtNum(d.credits)}</span>
            <span className="w-20 shrink-0 text-right tabular-nums text-zinc-500">{fmtUsd(d.estUsd)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );

  const customersPanel = (
    <Panel title="Customers" icon="group">
      {/* Summary strip: active subs + paying customers by tier (always all users) */}
      <div className="mb-4 rounded-xl bg-zinc-50 p-4 text-sm">
        <span className="font-bold text-zinc-900">
          {customers.activeTotal} active subscription{customers.activeTotal === 1 ? "" : "s"}
        </span>
        <span className="text-zinc-600">
          {" — "}Creator ({customers.activeByTier.creator.length}):{" "}
          {customers.activeByTier.creator.length ? customers.activeByTier.creator.join(", ") : "—"}
          {"  ·  "}Pro ({customers.activeByTier.pro.length}):{" "}
          {customers.activeByTier.pro.length ? customers.activeByTier.pro.join(", ") : "—"}
        </span>
      </div>

      {/* Count + Real-customers-only toggle (view-only) */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Showing {customers.totalShown}
          {customers.realOnly && customers.totalShown !== customers.totalAll
            ? ` of ${customers.totalAll}` : ""} customer{customers.totalShown === 1 ? "" : "s"}
        </span>
        <a
          href={href({ real: customers.realOnly ? "" : "1" })}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            customers.realOnly ? "bg-primary text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {customers.realOnly ? "toggle_on" : "toggle_off"}
          </span>
          Real customers only: {customers.realOnly ? "ON" : "OFF"}
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              {customerCols.map((c) => {
                const active = customers.sort === c.key;
                const nextDir = active && customers.dir === "desc" ? "asc" : "desc";
                const arrow = active ? (customers.dir === "desc" ? " ▼" : " ▲") : "";
                return (
                  <th key={c.key} className="py-2 pr-4">
                    <a href={href({ sort: c.key, dir: nextDir })} className={`hover:text-primary ${active ? "text-primary" : ""}`}>
                      {c.label}{arrow}
                    </a>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {customers.rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="py-2 pr-4">
                  <a href={href({ email: r.email }, "#user-detail")} className="block hover:text-primary">
                    <span className="font-bold text-zinc-900">{r.displayName}</span>
                    <span className="block text-xs text-zinc-500">{r.email}</span>
                  </a>
                </td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${tierBadge[r.plan] ?? tierBadge.free}`}>
                    {r.plan}
                  </span>
                </td>
                <td className="py-2 pr-4">{r.subscriptionStatus ?? "—"}</td>
                <td className="py-2 pr-4 tabular-nums">{fmtNum(r.creditBalance)}</td>
                <td className="py-2 pr-4 tabular-nums">{fmtNum(r.creditsUsed)}</td>
                <td className="py-2 pr-4 tabular-nums">{fmtNum(r.renders)}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                  {new Date(r.createdAt).toLocaleDateString("en-US")}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                  {r.isPaid && r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString("en-US") : "—"}
                </td>
                <td className="py-2 pr-4 tabular-nums">{r.isPaid ? fmtUsd(r.planPrice) : "—"}</td>
              </tr>
            ))}
            {customers.rows.length === 0 && (
              <tr><td colSpan={9} className="py-4 text-zinc-400">No customers match this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const lookupPanel = (
    <>
      <div id="user-detail" />
      <Panel title="User lookup" icon="person_search">
        <form method="get" className="mb-4 flex gap-2">
          {/* keep the Users tab after a lookup navigation */}
          <input type="hidden" name="tab" value="users" />
          <input
            name="email"
            type="email"
            defaultValue={email ?? ""}
            placeholder="user@example.com"
            className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Search</button>
        </form>

        {email && !lookup && <p className="text-sm text-zinc-500">No user found for “{email}”.</p>}

        {lookup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Stat label="Plan" value={lookup.user.plan} sub={lookup.user.subscriptionStatus ?? "—"} />
              <Stat label="Balance" value={fmtNum(lookup.user.creditBalance)} />
              <Stat label="Joined" value={new Date(lookup.user.createdAt).toLocaleDateString("en-US")} />
              <Stat label="Status" value={lookup.user.bannedAt ? "BANNED" : "Active"} />
              <Stat label="Name" value={lookup.user.name ?? "—"} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-end gap-4 rounded-xl bg-zinc-50 p-4">
              <form action={adminGrantCredits} className="flex items-end gap-2">
                <input type="hidden" name="userId" value={lookup.user.id} />
                <input type="hidden" name="email" value={lookup.user.email} />
                <label className="text-xs font-bold text-zinc-600">
                  Grant credits
                  <input name="amount" type="number" min="1" placeholder="100"
                    className="mt-1 block w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs font-bold text-zinc-600">
                  Reason
                  <input name="reason" type="text" placeholder="goodwill"
                    className="mt-1 block w-40 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                </label>
                <button className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary/90">Grant</button>
              </form>

              <form action={adminForceRefund} className="flex items-end gap-2">
                <input type="hidden" name="userId" value={lookup.user.id} />
                <input type="hidden" name="email" value={lookup.user.email} />
                <label className="text-xs font-bold text-zinc-600">
                  Force-refund jobId
                  <input name="jobId" type="text" placeholder="run_..."
                    className="mt-1 block w-48 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                </label>
                <button className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-600">Refund</button>
              </form>

              <form action={adminSetBan}>
                <input type="hidden" name="userId" value={lookup.user.id} />
                <input type="hidden" name="email" value={lookup.user.email} />
                <input type="hidden" name="action" value={lookup.user.bannedAt ? "unban" : "ban"} />
                <button className={`rounded-lg px-3 py-2 text-sm font-bold text-white ${lookup.user.bannedAt ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {lookup.user.bannedAt ? "Unban" : "Ban"}
                </button>
              </form>
            </div>

            {/* Recent renders + transactions */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">Recent renders</h3>
                <table className="w-full text-xs">
                  <tbody>
                    {lookup.renders.map((r) => (
                      <tr key={r.id} className="border-b border-zinc-100">
                        <td className="py-1.5 pr-2 font-mono">{r.mode}</td>
                        <td className="py-1.5 pr-2">{r.status}</td>
                        <td className="py-1.5 pr-2 text-zinc-500">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                    {lookup.renders.length === 0 && <tr><td className="py-2 text-zinc-400">None</td></tr>}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">Recent credit transactions</h3>
                <table className="w-full text-xs">
                  <tbody>
                    {lookup.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-zinc-100">
                        <td className="py-1.5 pr-2">{t.type}</td>
                        <td className={`py-1.5 pr-2 font-bold ${t.delta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {t.delta > 0 ? "+" : ""}{fmtNum(t.delta)}
                        </td>
                        <td className="py-1.5 pr-2 text-zinc-500">{fmtNum(t.balanceAfter)}</td>
                        <td className="py-1.5 pr-2 text-zinc-500">{fmtDate(t.createdAt)}</td>
                      </tr>
                    ))}
                    {lookup.transactions.length === 0 && <tr><td className="py-2 text-zinc-400">None</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );

  const billingPanel = (
    <Panel
      id="billing-health"
      title="Billing health (webhooks)"
      icon="receipt_long"
      note={`Only covers Lemon Squeezy events received after this deploy — ${fmtNum(billing.totalEvents)} logged so far. A "paid, no credits" row is a payment/order event with no linked credit grant (note: subscription order_created legitimately has no grant — credits land on payment_success).`}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-4">
        <Stat label="Logged events" value={fmtNum(billing.totalEvents)} />
        <Stat
          label="Errored"
          value={fmtNum(billing.errored.length)}
          tone={toneAbove(billing.errored.length, WEBHOOK_ERROR_WARN, WEBHOOK_ERROR_CRIT)}
        />
        <Stat
          label="Unhandled"
          value={fmtNum(billing.unhandled.length)}
          tone={toneAbove(billing.unhandled.length, WEBHOOK_ERROR_WARN, WEBHOOK_ERROR_CRIT)}
        />
        <Stat label="Paid, no credits" value={fmtNum(billing.paidNoCredits.length)} />
      </div>

      {billing.paidNoCredits.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-red-700">⚠ Paid but no credits granted</p>
          <table className="w-full text-xs">
            <tbody>
              {billing.paidNoCredits.map((e) => (
                <tr key={e.id} className="border-b border-red-100">
                  <td className="py-1.5 pr-2 font-mono">{e.eventName}</td>
                  <td className="py-1.5 pr-2">{e.resourceId ?? "—"}</td>
                  <td className="py-1.5 pr-2">{e.userId ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-zinc-500">{fmtDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">Recent events</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-left uppercase text-zinc-400">
              <th className="py-2 pr-3">Event</th>
              <th className="py-2 pr-3">Handled</th>
              <th className="py-2 pr-3">Grant</th>
              <th className="py-2 pr-3">Error</th>
              <th className="py-2 pr-3">When</th>
            </tr>
          </thead>
          <tbody>
            {billing.recent.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100">
                <td className="py-1.5 pr-3 font-mono">{e.eventName}</td>
                <td className="py-1.5 pr-3">{e.handled ? "✓" : "—"}</td>
                <td className="py-1.5 pr-3">{e.grantedCreditTxId ? "✓" : "—"}</td>
                <td className="py-1.5 pr-3 text-red-600">{e.error ?? ""}</td>
                <td className="py-1.5 pr-3 text-zinc-500">{fmtDate(e.createdAt)}</td>
              </tr>
            ))}
            {billing.recent.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-zinc-400">No webhook events logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const abusePanel = (
    <Panel title="Abuse signals — disposable email" icon="report" note="Same-IP detection is out of scope (login IPs are not persisted).">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Plan</th>
              <th className="py-2 pr-4">Balance</th>
              <th className="py-2 pr-4">Joined</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {disposable.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.plan}</td>
                <td className="py-2 pr-4">{fmtNum(u.creditBalance)}</td>
                <td className="py-2 pr-4 text-zinc-500">{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                <td className="py-2 pr-4">{u.bannedAt ? "BANNED" : "Active"}</td>
              </tr>
            ))}
            {disposable.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-zinc-400">No disposable-domain signups detected.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  // ── Compose tabs ──
  const tabs: AdminTabDef[] = [
    { id: "overview", label: "Overview", icon: "dashboard", content: <>{overviewPanel}{todayPanel}</> },
    {
      id: "money", label: "Money", icon: "payments", badge: negMarginModes,
      content: <>{costPanel}{liabilityPanel}{dailyPanel}<CreditEstimator /></>,
    },
    {
      id: "operations", label: "Operations", icon: "monitoring",
      badge: failedNotRefunded + highErrorModes,
      content: <>{renderHealthPanel}{failedPanel}</>,
    },
    { id: "users", label: "Users", icon: "group", content: <>{customersPanel}{lookupPanel}</> },
    {
      id: "integrity", label: "Integrity", icon: "receipt_long",
      badge: paidNoCreditsCount + erroredCount + unhandledCount,
      content: <>{billingPanel}{abusePanel}</>,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── FLASH (one-shot confirmation after an admin action) ── */}
      {flash && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
        >
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {flash}
        </div>
      )}

      <AdminTabs tabs={tabs} initialTab={initialTab} kpi={kpi} triage={triage} />
    </div>
  );
}
