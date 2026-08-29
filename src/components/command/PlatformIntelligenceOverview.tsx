import Link from "next/link";
import type {
  CommandCentreOpsHome,
  PlatformAlertsCentre,
} from "@dg/platform-core";

import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";

const SIGNALS = [
  {
    href: "/command/platform-intelligence/connectors",
    title: "Connector health",
    description: "Organisation and platform connector readiness signals.",
  },
  {
    href: "/command/platform-intelligence/automation",
    title: "Automation health",
    description: "Platform automation run health when telemetry exists.",
  },
  {
    href: "/command/platform-intelligence/ai-usage",
    title: "AI usage",
    description: "Platform-wide AI actions, model usage and cost when available.",
  },
  {
    href: "/command/platform-intelligence/activity",
    title: "System activity",
    description: "Recent platform events across organisations.",
  },
  {
    href: "/command/platform-intelligence/diagnostics",
    title: "Diagnostics",
    description: "Operator diagnostics for platform services.",
  },
] as const;

function statusToneClass(ok: boolean): string {
  return ok ? "text-emerald-300" : "text-amber-300";
}

function apiLine(alerts: PlatformAlertsCentre): { label: string; ok: boolean } {
  const api = alerts.infrastructureServices.find((s) => s.id === "api");
  if (!api) return { label: "Unknown", ok: false };
  return {
    label: api.statusLabel,
    ok: api.tone === "healthy",
  };
}

function connectorsLine(alerts: PlatformAlertsCentre): {
  label: string;
  ok: boolean;
} {
  const { connectedOrganisations, healthy, failed } = alerts.connectors;
  if (failed > 0) {
    return {
      label: `${failed} failed · ${healthy}/${connectedOrganisations} healthy`,
      ok: false,
    };
  }
  if (connectedOrganisations === 0) {
    return { label: "No connectors configured", ok: true };
  }
  return {
    label: `${healthy}/${connectedOrganisations} healthy`,
    ok: healthy === connectedOrganisations,
  };
}

function stripeLine(alerts: PlatformAlertsCentre): { label: string; ok: boolean } {
  const { stripeOk, stripeMode } = alerts.commercial;
  if (!stripeOk) return { label: "Setup required", ok: false };
  if (stripeMode === "test") return { label: "Test mode", ok: true };
  if (stripeMode === "live") return { label: "Live", ok: true };
  return { label: "Unset", ok: false };
}

function overallPlatformStatus(alerts: PlatformAlertsCentre): {
  label: string;
  ok: boolean;
  detail: string;
} {
  const api = apiLine(alerts);
  const stripe = stripeLine(alerts);
  const platformCritical = alerts.critical.filter(
    (a) => a.category === "infrastructure" || a.category === "billing" || a.category === "platform",
  );

  if (platformCritical.length > 0 || !api.ok || !stripe.ok) {
    return {
      label: "Attention",
      ok: false,
      detail:
        platformCritical[0]?.title ??
        (!api.ok ? "API needs attention" : "Billing/Stripe needs attention"),
    };
  }

  return {
    label: "Healthy",
    ok: true,
    detail: "No critical platform infrastructure issues detected.",
  };
}

export function PlatformIntelligenceOverview({
  ops,
  alerts,
}: {
  ops: CommandCentreOpsHome;
  alerts: PlatformAlertsCentre;
}) {
  const overall = overallPlatformStatus(alerts);
  const api = apiLine(alerts);
  const connectors = connectorsLine(alerts);
  const stripe = stripeLine(alerts);

  const statusRows: Array<{
    key: string;
    name: string;
    label: string;
    ok: boolean;
    detail?: string;
  }> = [
    {
      key: "overall",
      name: "Overall",
      label: overall.label,
      ok: overall.ok,
      detail: overall.detail,
    },
    { key: "api", name: "API", label: api.label, ok: api.ok },
    {
      key: "connectors",
      name: "Connectors",
      label: connectors.label,
      ok: connectors.ok,
    },
    {
      key: "automation",
      name: "Automation",
      label: "Not instrumented",
      ok: true,
      detail: "No platform-wide automation aggregate yet.",
    },
    {
      key: "ai",
      name: "AI Services",
      label: "Not instrumented",
      ok: true,
      detail: "No platform-wide AI usage aggregate yet.",
    },
    {
      key: "billing",
      name: "Billing / Stripe",
      label: stripe.label,
      ok: stripe.ok,
    },
  ];

  return (
    <div className="space-y-8">
      <OperatorMetricStrip
        metrics={[
          { label: "Organisations", value: ops.pulse.organisations, tone: "sky" },
          {
            label: "Critical alerts",
            value: alerts.critical.length,
            tone: alerts.critical.length ? "amber" : "emerald",
          },
          { label: "Open platform tasks", value: ops.pulse.openTasksDue },
          {
            label: "Services tracked",
            value: alerts.infrastructureServices.length,
          },
        ]}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Platform status
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Is the DigitalGate platform itself healthy?
          </p>
        </div>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
          {statusRows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{row.name}</p>
                {row.detail ? (
                  <p className="mt-0.5 text-sm text-slate-400">{row.detail}</p>
                ) : null}
              </div>
              <p className={`text-sm font-medium ${statusToneClass(row.ok)}`}>
                {row.label}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Platform signals
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Operational surfaces for platform ecosystem health — not customer business KPIs.
          </p>
        </div>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
          {SIGNALS.map((signal) => (
            <li key={signal.href}>
              <Link
                href={signal.href}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-900/60"
              >
                <div>
                  <p className="font-medium text-white">{signal.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{signal.description}</p>
                </div>
                <span className="shrink-0 text-sm text-sky-400">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-slate-400">
        <Link
          href="/command/intelligence"
          className="font-medium text-sky-400 hover:underline"
        >
          Ask Platform Intelligence →
        </Link>
        <span className="text-slate-500">
          {" "}
          Docs-backed answers about the platform itself.
        </span>
      </p>
    </div>
  );
}
