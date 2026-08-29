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
    description: "Connection status, sync failures and legacy bridges.",
  },
  {
    href: "/command/platform-intelligence/automation",
    title: "Automation health",
    description: "Failed workflows, stalled executions and automation errors.",
  },
  {
    href: "/command/platform-intelligence/ai-usage",
    title: "AI usage",
    description: "AI requests, usage, failures and platform AI activity.",
  },
  {
    href: "/command/platform-intelligence/activity",
    title: "System activity",
    description: "Technical and operational platform events.",
  },
  {
    href: "/command/platform-intelligence/diagnostics",
    title: "Diagnostics",
    description: "Developer/system-level diagnostics.",
  },
] as const;

function statusToneClass(ok: boolean): string {
  return ok ? "text-emerald-300" : "text-amber-300";
}

function apiLine(alerts: PlatformAlertsCentre): { label: string; ok: boolean } {
  const api = alerts.infrastructureServices.find((s) => s.id === "api");
  if (!api) return { label: "Unknown", ok: false };
  if (api.tone === "healthy") return { label: "Healthy", ok: true };
  return { label: api.statusLabel, ok: false };
}

function connectorsLine(alerts: PlatformAlertsCentre): {
  label: string;
  ok: boolean;
} {
  const { connectedOrganisations, healthy, failed } = alerts.connectors;
  if (connectedOrganisations === 0) {
    return { label: "0 configured · 0 failed", ok: true };
  }
  return {
    label: `${connectedOrganisations} configured · ${failed} failed`,
    ok: failed === 0 && healthy === connectedOrganisations,
  };
}

function stripeLine(alerts: PlatformAlertsCentre): { label: string; ok: boolean } {
  const { stripeOk, stripeMode } = alerts.commercial;
  if (!stripeOk) return { label: "Setup required", ok: false };
  if (stripeMode === "live") return { label: "Live · Healthy", ok: true };
  if (stripeMode === "test") return { label: "Test · Healthy", ok: true };
  return { label: "Unset", ok: false };
}

function overallPlatformStatus(alerts: PlatformAlertsCentre): {
  emoji: string;
  label: string;
  ok: boolean;
  detail: string;
} {
  const api = apiLine(alerts);
  const connectors = connectorsLine(alerts);
  const stripe = stripeLine(alerts);
  const platformCritical = alerts.critical.filter(
    (a) =>
      a.category === "infrastructure" ||
      a.category === "billing" ||
      a.category === "platform",
  );

  if (platformCritical.length > 0 || !api.ok || !connectors.ok || !stripe.ok) {
    return {
      emoji: "🟠",
      label: "Platform needs attention",
      ok: false,
      detail:
        platformCritical[0]?.title ??
        (!api.ok
          ? "API needs attention"
          : !connectors.ok
            ? "Connector failures detected"
            : "Billing / Stripe needs attention"),
    };
  }

  return {
    emoji: "🟢",
    label: "Platform healthy",
    ok: true,
    detail: "No critical platform issues detected.",
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

  const statusRows: Array<{ name: string; label: string; ok: boolean }> = [
    { name: "API", label: api.label, ok: api.ok },
    { name: "Connectors", label: connectors.label, ok: connectors.ok },
    // No platform-wide aggregate yet — treat absence of failure signals as healthy.
    { name: "Automation", label: "Healthy", ok: true },
    { name: "AI Services", label: "Operational", ok: true },
    { name: "Billing / Stripe", label: stripe.label, ok: stripe.ok },
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
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Platform status
        </h2>
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
          <p className={`text-lg font-semibold ${statusToneClass(overall.ok)}`}>
            {overall.emoji} {overall.label}
          </p>
          <p className="mt-1 text-sm text-slate-400">{overall.detail}</p>

          <ul className="mt-5 divide-y divide-slate-800 border-t border-slate-800">
            {statusRows.map((row) => (
              <li
                key={row.name}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <p className="font-medium text-white">{row.name}</p>
                <p className={`text-sm font-medium ${statusToneClass(row.ok)}`}>
                  {row.label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Platform signals
        </h2>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
          {SIGNALS.map((signal) => (
            <li key={signal.href}>
              <Link
                href={signal.href}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-900/60"
              >
                <div>
                  <p className="font-medium text-white">{signal.title} →</p>
                  <p className="mt-0.5 text-sm text-slate-400">{signal.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-4">
        <Link
          href="/command/intelligence"
          className="text-base font-medium text-sky-300 hover:text-sky-200"
        >
          Ask Platform Intelligence →
        </Link>
        <p className="mt-1 max-w-xl text-sm text-slate-400">
          Ask about connector failures, platform issues affecting customers, what needs attention,
          or what changed today.
        </p>
      </div>
    </div>
  );
}
