import Link from "next/link";

import type { PlatformAlert, PlatformAlertsCentre } from "@dg/platform-core";

function severityEmoji(severity: PlatformAlert["severity"]) {
  if (severity === "critical") return "🔴";
  if (severity === "attention") return "🟠";
  return "🔵";
}

function AlertCard({ alert }: { alert: PlatformAlert }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-lg">
          {severityEmoji(alert.severity)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{alert.title}</h3>
          {alert.organisationName ? (
            <p className="mt-1 text-xs text-slate-500">Organisation: {alert.organisationName}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-300">{alert.message}</p>
          <p className="mt-2 text-xs text-slate-500">
            Detected: {new Date(alert.detectedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            <span className="text-slate-300">Impact:</span> {alert.impact}
          </p>
          <p className="mt-2 text-sm text-amber-100/90">
            <span className="text-amber-200/80">Recommended action:</span> {alert.recommendedAction}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {alert.actions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={
                  action.id === "investigate"
                    ? "rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                    : "rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-400 hover:text-white"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function AlertSection({
  title,
  subtitle,
  alerts,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  alerts: PlatformAlert[];
  emptyMessage: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      {alerts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-4 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <AlertCard alert={alert} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlatformAlertsDashboard({ data }: { data: PlatformAlertsCentre }) {
  const { operationalLoad, connectors, commercial, infrastructureServices } = data;

  return (
    <div className="space-y-10">
      {/* Operational Load */}
      <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
          Operational load
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LoadStat
            label="DigitalGate CRM tasks due"
            value={operationalLoad.tasksDueToday}
            href="/command/tasks"
          />
          <LoadStat label="Overdue responses" value={operationalLoad.overdueResponses} href="/command/clients" />
          <LoadStat label="Delivery blocked" value={operationalLoad.deliveryBlocked} href="/command/delivery" />
          <LoadStat label="Failed onboarding" value={operationalLoad.failedOnboarding} href="/command/delivery" />
          <LoadStat
            label="Customers requiring attention"
            value={operationalLoad.customersRequiringAttention}
            href="/command/clients"
          />
          <LoadStat
            label="Critical platform issues"
            value={operationalLoad.criticalPlatformIssues}
            href="/command/platform-health"
          />
        </div>
      </section>

      <AlertSection
        title="🔴 Critical"
        subtitle="Issues affecting customers, revenue, security or platform availability."
        alerts={data.critical}
        emptyMessage="No critical platform issues right now."
      />

      <AlertSection
        title="🟠 Attention required"
        subtitle="Issues that aren't immediately critical but need staff intervention."
        alerts={data.attention}
        emptyMessage="Nothing needs immediate staff attention."
      />

      <AlertSection
        title="🔵 Platform notices"
        subtitle="Operational information that doesn't require immediate action."
        alerts={data.notices}
        emptyMessage="No platform notices at this time."
      />

      {/* Infrastructure & Services */}
      <section>
        <h2 className="text-lg font-semibold text-white">Infrastructure &amp; Services</h2>
        <p className="mt-1 text-sm text-slate-400">
          Platform services health — operator view without provider internals.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {infrastructureServices.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{row.label}</p>
                  <p className="mt-1 text-sm text-emerald-300">{row.statusLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
                </div>
                {row.href ? (
                  <Link href={row.href} className="shrink-0 text-xs text-sky-400 hover:underline">
                    Open →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Commercial Infrastructure */}
      <section>
        <h2 className="text-lg font-semibold text-white">Commercial infrastructure</h2>
        <p className="mt-1 text-sm text-slate-400">Billing and payment plumbing for the platform.</p>
        <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Stripe</p>
              <p className="mt-1 text-sm text-emerald-300">
                {commercial.stripeOk ? "Healthy" : "Needs attention"} ·{" "}
                {commercial.stripeMode === "live" ? "Live" : commercial.stripeMode === "test" ? "Test" : "Unset"}
              </p>
            </div>
            <Link href="/command/revenue" className="text-sm text-sky-400 hover:underline">
              Billing settings →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {commercial.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className={item.done ? "text-emerald-400" : "text-slate-600"}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className={item.done ? "text-slate-300" : "text-slate-500"}>
                  {item.label}
                  {item.optional ? " · Optional" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Connector Health */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Legacy WordPress connectors</h2>
            <p className="mt-1 text-sm text-slate-400">
              {connectors.connectedOrganisations} organisation
              {connectors.connectedOrganisations === 1 ? "" : "s"} still have a WP bridge
              configured — Gen 2 is SoT; idle sync is expected during detach.
            </p>
          </div>
          <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
            View orgs →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ConnectorStat label="Synced recently" value={connectors.healthy} tone="emerald" />
          <ConnectorStat label="Idle (legacy)" value={connectors.attention} tone="amber" />
          <ConnectorStat label="Failed" value={connectors.failed} tone="rose" />
        </div>
      </section>

      {/* Developer diagnostics — de-emphasised */}
      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-400">Developer / System diagnostics</h2>
        <p className="mt-1 text-xs text-slate-500">
          Implementation and observability details — not part of the primary operator experience.
        </p>
        <Link
          href="/command/platform-health/diagnostics"
          className="mt-3 inline-block text-sm text-sky-400 hover:underline"
        >
          Open system diagnostics →
        </Link>
      </section>
    </div>
  );
}

function LoadStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 py-3 transition hover:border-sky-500/30"
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </Link>
  );
}

function ConnectorStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/25 text-emerald-200"
      : tone === "amber"
        ? "border-amber-500/25 text-amber-100"
        : "border-rose-500/25 text-rose-100";

  return (
    <div className={`rounded-xl border bg-slate-950/40 px-4 py-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}
