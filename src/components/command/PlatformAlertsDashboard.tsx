import Link from "next/link";

import type { PlatformAlert, PlatformAlertsCentre } from "@dg/platform-core";

function actionButtonClass(id: PlatformAlert["actions"][number]["id"], primary: boolean) {
  if (primary) {
    return "rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500";
  }
  return "rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-400 hover:text-white";
}

function AlertRow({ alert, compact }: { alert: PlatformAlert; compact?: boolean }) {
  return (
    <article
      className={
        compact
          ? "border-t border-slate-800/80 px-1 py-4 first:border-t-0 first:pt-0"
          : "rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-4"
      }
    >
      <h3 className="font-semibold text-white">{alert.title}</h3>
      <p className="mt-1.5 text-sm text-slate-400">{alert.message}</p>
      {!compact ? (
        <>
          <p className="mt-2 text-xs text-slate-500">
            Detected:{" "}
            {new Date(alert.detectedAt).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            <span className="text-slate-300">Impact:</span> {alert.impact}
          </p>
        </>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {alert.actions.map((action, index) => (
          <Link
            key={action.id}
            href={action.href}
            className={actionButtonClass(action.id, index === 0 && alert.severity === "critical")}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function SeverityBlock({
  emoji,
  label,
  count,
  tone,
  emptyMessage,
  alerts,
}: {
  emoji: string;
  label: string;
  count: number;
  tone: "critical" | "attention" | "notice";
  emptyMessage: string;
  alerts: PlatformAlert[];
}) {
  const border =
    tone === "critical"
      ? "border-rose-500/35"
      : tone === "attention"
        ? "border-amber-500/35"
        : "border-sky-500/30";
  const titleColor =
    tone === "critical"
      ? "text-rose-200"
      : tone === "attention"
        ? "text-amber-100"
        : "text-sky-200";
  const countColor =
    tone === "critical"
      ? "text-rose-300"
      : tone === "attention"
        ? "text-amber-200"
        : "text-sky-300";

  return (
    <section className={`rounded-xl border ${border} bg-slate-950/50 px-5 py-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`text-base font-semibold tracking-wide ${titleColor}`}>
          {emoji} {label}
        </h2>
        <span className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function statusDot(tone: "healthy" | "degraded" | "idle" | undefined) {
  if (tone === "degraded") return "🟠";
  if (tone === "idle") return "⚪";
  return "🟢";
}

export function PlatformAlertsDashboard({ data }: { data: PlatformAlertsCentre }) {
  const { operationalLoad, connectors, commercial, infrastructureServices } = data;
  const criticalCount = data.critical.length;
  const attentionCount = data.attention.length;
  const noticeCount = data.notices.length;

  const platformOk = criticalCount === 0;
  const statusSummary = platformOk
    ? attentionCount > 0
      ? `No critical platform issues. ${operationalLoad.customersRequiringAttention} organisation${operationalLoad.customersRequiringAttention === 1 ? "" : "s"} require attention.`
      : "No critical platform issues."
    : `${criticalCount} critical platform issue${criticalCount === 1 ? "" : "s"} require intervention.`;

  const stripeTone = commercial.stripeOk ? "healthy" : "degraded";
  const stripeLabel = commercial.stripeOk
    ? commercial.stripeMode === "live"
      ? "Live"
      : commercial.stripeMode === "test"
        ? "Test"
        : "Configured"
    : "Needs setup";
  const stripeDetail = commercial.stripeOk
    ? commercial.checklist.find((c) => c.id === "webhooks")?.done
      ? "Webhooks healthy"
      : "API connected"
    : "Billing config incomplete";

  return (
    <div className="space-y-8">
      {/* Platform status — glance answer: Is DigitalGate OK? */}
      <section
        className={`rounded-xl border px-5 py-4 ${
          platformOk
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-rose-500/35 bg-rose-500/5"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Platform status
        </p>
        <p
          className={`mt-2 text-xl font-semibold ${
            platformOk ? "text-emerald-200" : "text-rose-200"
          }`}
        >
          {platformOk ? "🟢 Operational" : "🔴 Intervention required"}
        </p>
        <p className="mt-1 text-sm text-slate-400">{statusSummary}</p>
      </section>

      {/* Operational status */}
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Operational status
        </p>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatusMetric label="CRM tasks due" value={operationalLoad.tasksDueToday} href="/command/tasks" />
          <StatusMetric
            label="Overdue responses"
            value={operationalLoad.overdueResponses}
            href="/command/clients"
          />
          <StatusMetric
            label="Delivery blocked"
            value={operationalLoad.deliveryBlocked}
            href="/command/delivery"
          />
          <StatusMetric
            label="Failed onboarding"
            value={operationalLoad.failedOnboarding}
            href="/command/delivery"
          />
          <StatusMetric
            label="Customers needing attention"
            value={operationalLoad.customersRequiringAttention}
            href="/command/clients"
          />
          <StatusMetric
            label="Critical issues"
            value={operationalLoad.criticalPlatformIssues}
            href="#critical"
          />
        </div>
      </section>

      <div id="critical">
        <SeverityBlock
          emoji="🔴"
          label="Critical"
          count={criticalCount}
          tone="critical"
          emptyMessage="No critical platform issues right now."
          alerts={data.critical}
        />
      </div>

      <SeverityBlock
        emoji="🟠"
        label="Attention required"
        count={attentionCount}
        tone="attention"
        emptyMessage="Nothing needs immediate staff attention."
        alerts={data.attention}
      />

      <SeverityBlock
        emoji="🔵"
        label="Platform notices"
        count={noticeCount}
        tone="notice"
        emptyMessage="No platform notices at this time."
        alerts={data.notices}
      />

      {/* Platform services — subordinate compact grid */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Platform services
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Service</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {infrastructureServices.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/60">
                  <td className="py-2.5 pr-4 text-slate-200">
                    {row.href ? (
                      <Link href={row.href} className="hover:text-sky-300">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    {statusDot(row.tone)} {row.statusLabel}
                  </td>
                  <td className="py-2.5 text-slate-500">{row.detail}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-4 text-slate-200">
                  <Link href="/command/revenue" className="hover:text-sky-300">
                    Stripe
                  </Link>
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  {statusDot(stripeTone)} {stripeLabel}
                </td>
                <td className="py-2.5 text-slate-500">{stripeDetail}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Legacy connectors — compact */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Legacy connectors
            </p>
            <p className="mt-2 text-sm text-slate-300">
              <span className="font-semibold text-white">{connectors.connectedOrganisations}</span>{" "}
              configured ·{" "}
              <span className="font-semibold text-white">{connectors.failed}</span> failed ·{" "}
              <span className="font-semibold text-white">{connectors.healthy}</span> synced recently ·{" "}
              <span className="font-semibold text-white">{connectors.attention}</span> idle
            </p>
          </div>
          <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
            View organisations →
          </Link>
        </div>
      </section>

      {/* Developer diagnostics — de-emphasised */}
      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-400">Developer / System diagnostics</h2>
        <p className="mt-1 text-xs text-slate-500">
          Technical implementation and observability details.
        </p>
        <Link
          href="/command/platform-health/diagnostics"
          className="mt-2 inline-block text-sm text-sky-400 hover:underline"
        >
          Open diagnostics →
        </Link>
      </section>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="group flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs uppercase tracking-wide text-slate-500 group-hover:text-slate-400">
        {label}
      </span>
      <span
        className={`text-lg font-semibold tabular-nums ${
          value > 0 ? "text-white" : "text-slate-500"
        }`}
      >
        {value}
      </span>
    </Link>
  );
}
