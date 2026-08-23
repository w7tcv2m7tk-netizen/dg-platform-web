import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCommandCentreOpsHome,
  getPlatformAlertsCentre,
} from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const REDIRECTS: Record<string, string> = {
  overview: "/command/intelligence",
  health: "/command/platform-health",
  connectors: "/command/platform-health",
  automation: "/command/flags",
  diagnostics: "/command/platform-health/diagnostics",
};

export default async function PlatformIntelligenceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const { section } = await params;
  const redirectTo = REDIRECTS[section];
  if (redirectTo) redirect(redirectTo);

  const db = Boolean(process.env.DATABASE_URL);

  if (section === "ai-usage") {
    return (
      <div className="space-y-6">
        <OperatorCategoryHeader
          eyebrow="Platform Intelligence"
          title="AI usage"
          question="Platform-wide AI actions, model usage and cost — when telemetry exists."
        />
        <div className="max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5 text-sm text-slate-300">
          <p className="font-medium text-white">Not instrumented yet</p>
          <p className="mt-2 text-slate-400">
            There is no platform-wide AI usage aggregate today. Do not invent counters. Use
            Platform Intelligence for docs-backed answers until usage telemetry ships.
          </p>
          <p className="mt-4">
            <Link href="/command/intelligence" className="text-sky-400 hover:underline">
              Open Platform Intelligence →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (section === "activity") {
    const ops = db ? await getCommandCentreOpsHome() : null;
    const activity = ops?.recentActivity ?? [];
    return (
      <div className="space-y-6">
        <OperatorCategoryHeader
          eyebrow="Platform Intelligence"
          title="System activity"
          question="Recent platform events across organisations — API-adjacent activity feed."
        />
        {!ops ? (
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
            <p className="text-sm text-slate-500">
              Ops home:{" "}
              <Link href="/command" className="text-sky-400 hover:underline">
                Command Centre Priorities
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  if (section === "service-status") {
    const alerts = db ? await getPlatformAlertsCentre() : null;
    return (
      <div className="space-y-6">
        <OperatorCategoryHeader
          eyebrow="Platform Intelligence"
          title="Service status"
          question="Operator-facing infrastructure and commercial checklist — not customer support tickets."
        />
        {!alerts ? (
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
                    <div className="text-right">
                      <p className="text-sm text-slate-300">{svc.statusLabel}</p>
                      {svc.href ? (
                        <Link
                          href={svc.href}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Open →
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Commercial checklist</h2>
              <ul className="space-y-2">
                {alerts.commercial.checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span
                      className={
                        item.done ? "text-emerald-400" : "text-slate-600"
                      }
                    >
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
            <p className="text-sm text-slate-500">
              Full alerts:{" "}
              <Link
                href="/command/platform-health"
                className="text-sky-400 hover:underline"
              >
                Platform health
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  redirect("/command/intelligence");
}

function DbMissing() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
      Database not configured — platform intelligence unavailable.
    </div>
  );
}
