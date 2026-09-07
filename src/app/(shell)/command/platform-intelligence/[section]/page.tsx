import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOperatorCommandCentreOpsHome,
  getOperatorPlatformAlertsCentre,
} from "@dg/platform-core";

import { ConnectorHealthPanel } from "@/components/command/ConnectorHealthPanel";
import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { PlatformIntelligenceOverview } from "@/components/command/PlatformIntelligenceOverview";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

function shell(title: string, question: string, body: React.ReactNode) {
  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Platform Intelligence"
          title={title}
          question={question}
          backHref="/command/platform-intelligence/overview"
          backLabel="Platform Intelligence"
        />
      </header>
      <main className="dg-page-main space-y-6">{body}</main>
    </>
  );
}

export default async function PlatformIntelligenceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const operator = await requirePlatformOperatorContext();

  const { section } = await params;
  const db = Boolean(process.env.DATABASE_URL);
  const allowed = [
    "overview",
    "health",
    "connectors",
    "automation",
    "ai-usage",
    "activity",
    "service-status",
    "diagnostics",
  ];
  if (!allowed.includes(section)) {
    redirect("/command/platform-intelligence/overview");
  }

  if (section === "overview") {
    const ops = db ? await getOperatorCommandCentreOpsHome(operator) : null;
    const alerts = db ? await getOperatorPlatformAlertsCentre(operator) : null;
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Platform Intelligence</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Platform ecosystem health — infrastructure, connectors, automation, AI usage and
            system activity. Customer business health lives in Customer Intelligence.
          </p>
        </header>
        <main className="dg-page-main space-y-6">
          {!ops || !alerts ? (
            <DbMissing />
          ) : (
            <PlatformIntelligenceOverview ops={ops} alerts={alerts} />
          )}
        </main>
      </>
    );
  }

  if (section === "health") {
    const alerts = db ? await getOperatorPlatformAlertsCentre(operator) : null;
    return shell(
      "Platform Health",
      "Operator infrastructure checklist — API, DNS, SSL. Not Command Centre Alerts.",
      !alerts ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Services tracked",
                value: alerts.infrastructureServices.length,
              },
              {
                label: "Critical",
                value: alerts.critical.length,
                tone: alerts.critical.length ? "amber" : "emerald",
              },
            ]}
          />
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
            {alerts.infrastructureServices.map((svc) => (
              <li
                key={svc.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{svc.label}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{svc.detail}</p>
                </div>
                <p className="text-sm text-slate-300">{svc.statusLabel}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            External system connectivity lives under{" "}
            <Link
              href="/command/platform-intelligence/connectors"
              className="text-sky-400 hover:underline"
            >
              Connector Health
            </Link>
            .
          </p>
        </>
      ),
    );
  }

  if (section === "connectors") {
    const [alerts, ops] = db
      ? await Promise.all([getOperatorPlatformAlertsCentre(operator), getOperatorCommandCentreOpsHome(operator)])
      : [null, null];
    const connectorAlerts = alerts
      ? [...alerts.critical, ...alerts.attention, ...alerts.notices].filter(
          (a) => a.category === "connectors",
        )
      : [];
    return shell(
      "Connector Health",
      "Are DigitalGate’s external systems connected and working?",
      !alerts || !ops ? (
        <DbMissing />
      ) : (
        <ConnectorHealthPanel
          summary={alerts.connectors}
          orgs={ops.connectors.orgs}
          connectorAlerts={connectorAlerts}
        />
      ),
    );
  }

  if (section === "automation") {
    return shell(
      "Automation health",
      "Platform automation run health — when telemetry exists.",
      <div className="max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5 text-sm text-slate-300">
        <p className="font-medium text-white">Not instrumented yet</p>
        <p className="mt-2 text-slate-400">
          There is no platform-wide automation health aggregate today. Feature flags remain under
          Product — they are not duplicated here.
        </p>
      </div>,
    );
  }

  if (section === "ai-usage") {
    return shell(
      "AI usage",
      "Platform-wide AI actions, model usage and cost — when telemetry exists.",
      <div className="max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5 text-sm text-slate-300">
        <p className="font-medium text-white">Not instrumented yet</p>
        <p className="mt-2 text-slate-400">
          There is no platform-wide AI usage aggregate today. Do not invent counters.
        </p>
      </div>,
    );
  }

  if (section === "activity") {
    const ops = db ? await getOperatorCommandCentreOpsHome(operator) : null;
    const activity = ops?.recentActivity ?? [];
    return shell(
      "System activity",
      "Recent platform events across organisations.",
      !ops ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "Recent events", value: activity.length, tone: "sky" },
              { label: "Organisations", value: ops.pulse.organisations },
              { label: "Open tasks due", value: ops.pulse.openTasksDue },
            ]}
          />
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent platform activity recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
              {activity.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="font-medium text-white">{item.humanTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.organisationName}
                    {item.sourceApp ? ` · ${item.sourceApp}` : ""} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    );
  }

  if (section === "diagnostics") {
    return shell(
      "Diagnostics",
      "Operator diagnostics for platform services.",
      <div className="max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5 text-sm text-slate-300">
        <p className="font-medium text-white">Use Platform health + service status</p>
        <p className="mt-2 text-slate-400">
          Dedicated diagnostics tooling lives under those tabs. Command Centre Alerts remains the
          priority triage surface — not duplicated here.
        </p>
      </div>,
    );
  }

  // service-status
  const alerts = db ? await getOperatorPlatformAlertsCentre(operator) : null;
  return shell(
    "Service status",
    "Operator-facing infrastructure and commercial checklist.",
    !alerts ? (
      <DbMissing />
    ) : (
      <>
        <OperatorMetricStrip
          metrics={[
            {
              label: "Services tracked",
              value: alerts.infrastructureServices.length,
            },
            {
              label: "Critical alerts",
              value: alerts.critical.length,
              tone: alerts.critical.length ? "amber" : "emerald",
            },
            {
              label: "Stripe",
              value: alerts.commercial.stripeOk
                ? alerts.commercial.stripeMode
                : "unset",
              tone: alerts.commercial.stripeOk ? "emerald" : "amber",
            },
          ]}
        />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Infrastructure</h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
            {alerts.infrastructureServices.map((svc) => (
              <li
                key={svc.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{svc.label}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{svc.detail}</p>
                </div>
                <p className="text-sm text-slate-300">{svc.statusLabel}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Commercial checklist</h2>
          <ul className="space-y-2">
            {alerts.commercial.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm text-slate-300">
                <span className={item.done ? "text-emerald-400" : "text-slate-600"}>
                  {item.done ? "✓" : "○"}
                </span>
                {item.label}
                {item.optional ? (
                  <span className="text-xs text-slate-500">(optional)</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </>
    ),
  );
}

function DbMissing() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
      Database not configured — platform intelligence unavailable.
    </div>
  );
}
