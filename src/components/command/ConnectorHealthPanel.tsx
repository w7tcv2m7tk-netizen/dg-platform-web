import Link from "next/link";
import type {
  CommandConnectorOrgStatus,
  ConnectorHealthSummary,
  PlatformAlert,
} from "@dg/platform-core";

import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";

const CATEGORIES = [
  {
    id: "core",
    title: "Core Infrastructure",
    examples: "AI Gateway, Resend, Twilio, Cloudflare, Stripe (platform billing), Vercel, Sentry",
    status: "Platform-managed — health surfaces under Platform Health (API / DNS / SSL), not per-org connectors.",
    instrumented: false,
  },
  {
    id: "business",
    title: "Business",
    examples: "Gmail / Microsoft 365, GBP, Meta, LinkedIn, Xero, Domain, REA, Cotality, OTAs",
    status: "Organisation connectors — live health aggregation not instrumented yet beyond billing customer presence.",
    instrumented: false,
  },
  {
    id: "cms",
    title: "Website CMS",
    examples: "WordPress (legacy bridge), future CMS connectors",
    status: "Legacy WordPress bridge counts are instrumented. Gen 2 is the system of record.",
    instrumented: true,
  },
] as const;

type InterventionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "failed" | "attention";
};

function buildInterventions(alerts: PlatformAlert[]): InterventionItem[] {
  const items: InterventionItem[] = [];
  const seen = new Set<string>();

  for (const alert of alerts) {
    if (alert.category !== "connectors") continue;
    if (alert.severity !== "critical" && alert.severity !== "attention") continue;
    if (seen.has(alert.id)) continue;
    seen.add(alert.id);
    items.push({
      id: alert.id,
      title: alert.title,
      detail: alert.recommendedAction || alert.message,
      href: alert.href,
      severity: alert.severity === "critical" ? "failed" : "attention",
    });
  }

  return items;
}

export function ConnectorHealthPanel({
  summary,
  orgs,
  connectorAlerts = [],
}: {
  summary: ConnectorHealthSummary;
  orgs: CommandConnectorOrgStatus[];
  /** Connector-category alerts from Platform Alerts (failed / attention only used). */
  connectorAlerts?: PlatformAlert[];
}) {
  const interventions = buildInterventions(connectorAlerts);
  const legacyConfigured = orgs.filter((o) => o.wordpressConfigured);

  // Connected / Failed / Attention only. Idle/Syncing omitted — idle is already
  // reflected in Attention (legacy WP) and Syncing is not in telemetry today.
  const metrics = [
    {
      label: "Connected",
      value: summary.connectedOrganisations,
      tone: "sky" as const,
    },
    {
      label: "Failed",
      value: summary.failed,
      tone: summary.failed ? ("amber" as const) : ("emerald" as const),
    },
    {
      label: "Attention",
      value: summary.attention,
      tone: summary.attention ? ("amber" as const) : ("default" as const),
    },
  ];

  return (
    <div className="space-y-8">
      <OperatorMetricStrip
        metrics={metrics}
        columnsClassName="sm:grid-cols-2 lg:grid-cols-3"
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Connector categories</h2>
        <p className="text-sm text-slate-400">
          Honest capability map — what will live here as instrumentation lands. Not every row is
          live telemetry today.
        </p>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
          {CATEGORIES.map((cat) => (
            <li key={cat.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-white">{cat.title}</p>
                <span
                  className={`text-xs ${
                    cat.instrumented ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {cat.instrumented ? "Partially instrumented" : "Not instrumented yet"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{cat.examples}</p>
              <p className="mt-2 text-sm text-slate-300">{cat.status}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
        <h2 className="text-lg font-semibold text-white">Legacy WordPress bridges</h2>
        <p className="mt-2 text-sm text-slate-300">
          {legacyConfigured.length} organisation
          {legacyConfigured.length === 1 ? "" : "s"} still have a WordPress connector configured ·{" "}
          {summary.healthy} synced recently · {summary.attention} idle.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Idle legacy bridges are not platform failures. Gen 2 is the system of record; WordPress
          remains an optional detach-era bridge. Leave idle unless an organisation still needs WP
          sync — otherwise disconnect in Settings.
        </p>
        <Link
          href="/command/clients"
          className="mt-3 inline-block text-sm text-sky-400 hover:underline"
        >
          View organisations →
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Connector intervention queue</h2>
        <p className="text-sm text-slate-400">
          Failed or attention-required connector issues only — not idle legacy bridges.
        </p>
        {interventions.length === 0 ? (
          <p className="text-sm text-slate-500">No connector interventions required.</p>
        ) : (
          <ul className="space-y-3">
            {interventions.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                  </div>
                  <Link href={item.href} className="text-sm text-sky-400 hover:underline">
                    Open →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-slate-500">
        Infrastructure (API, DNS, SSL) lives under{" "}
        <Link
          href="/command/platform-intelligence/health"
          className="text-sky-400 hover:underline"
        >
          Platform Health
        </Link>
        — not duplicated here.
      </p>
    </div>
  );
}
