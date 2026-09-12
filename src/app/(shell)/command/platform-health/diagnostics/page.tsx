import Link from "next/link";
import { getOperatorPlatformAlertsCentre } from "@dg/platform-core";

import { OperatorDataUnavailable } from "@/components/command/OperatorDataUnavailable";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

function toneClass(tone?: "healthy" | "degraded" | "idle") {
  if (tone === "degraded") return "text-amber-200";
  if (tone === "idle") return "text-slate-400";
  return "text-emerald-200";
}

export default async function PlatformSystemDiagnosticsPage() {
  const operator = await requirePlatformOperatorContext();
  const data = process.env.DATABASE_URL ? await getOperatorPlatformAlertsCentre(operator) : null;
  const diagnostics = data?.diagnostics;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/command/platform-health"
          className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
        >
          ← Alerts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">System diagnostics</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Technical platform signals for DigitalGate operators. Customer business health remains in
          Client Intelligence and each organisation workspace.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!data || !diagnostics ? (
          <OperatorDataUnavailable label="system diagnostics" showHealthLink={false} />
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Runtime observability</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Generated {new Date(data.generatedAt).toLocaleString("en-AU")}.
                  </p>
                </div>
                <Link
                  href="/command/platform-health"
                  className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
                >
                  Open Platform Alerts →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DiagnosticCell
                  label="Error monitoring"
                  value={diagnostics.sentryConfigured ? "Configured" : "Not configured"}
                  detail={
                    diagnostics.sentryConfigured
                      ? "Runtime errors can forward to Sentry."
                      : "Runtime error forwarding is not configured."
                  }
                  tone={diagnostics.sentryConfigured ? "healthy" : "degraded"}
                />
                <DiagnosticCell
                  label="Database"
                  value={diagnostics.databaseConfigured ? "Connected" : "Unavailable"}
                  detail="Platform Core data authority."
                  tone={diagnostics.databaseConfigured ? "healthy" : "degraded"}
                />
                <DiagnosticCell
                  label="Application"
                  value={diagnostics.appUrl}
                  detail="Configured platform application URL."
                  tone="healthy"
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
              <h2 className="text-sm font-semibold text-white">Platform services</h2>
              <p className="mt-1 text-xs text-slate-500">
                Live service state from the same telemetry powering Platform Alerts.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4 font-medium">Service</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.infrastructureServices.map((service) => (
                      <tr key={service.id} className="border-b border-slate-800/70 last:border-0">
                        <td className="py-3 pr-4 text-slate-200">
                          {service.href ? (
                            <Link
                              href={service.href}
                              className="inline-flex min-h-11 items-center hover:text-sky-300"
                            >
                              {service.label}
                            </Link>
                          ) : (
                            service.label
                          )}
                        </td>
                        <td className={`py-3 pr-4 font-medium ${toneClass(service.tone)}`}>
                          {service.statusLabel}
                        </td>
                        <td className="py-3 text-slate-500">{service.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <SummaryCard
                title="Commercial infrastructure"
                status={data.commercial.stripeOk ? "Healthy" : "Needs attention"}
                statusTone={data.commercial.stripeOk ? "healthy" : "degraded"}
                lines={data.commercial.checklist.map(
                  (item) => `${item.done ? "✓" : "•"} ${item.label}${item.optional ? " (optional)" : ""}`,
                )}
                href="/command/revenue"
                action="Open Revenue"
              />
              <SummaryCard
                title="Legacy connectors"
                status={`${data.connectors.connectedOrganisations} configured`}
                statusTone={data.connectors.failed > 0 ? "degraded" : "healthy"}
                lines={[
                  `${data.connectors.healthy} recently synced`,
                  `${data.connectors.attention} idle`,
                  `${data.connectors.failed} failed`,
                ]}
                href="/command/clients"
                action="Open organisations"
              />
              <SummaryCard
                title="Operational load"
                status={`${data.operationalLoad.criticalPlatformIssues} critical`}
                statusTone={data.operationalLoad.criticalPlatformIssues > 0 ? "degraded" : "healthy"}
                lines={[
                  `${data.operationalLoad.tasksDueToday} tasks due today`,
                  `${data.operationalLoad.overdueResponses} overdue responses`,
                  `${data.operationalLoad.deliveryBlocked} delivery blockers`,
                  `${data.operationalLoad.customersRequiringAttention} customers need attention`,
                ]}
                href="/command"
                action="Open priorities"
              />
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5">
              <h2 className="text-sm font-semibold text-white">Alert telemetry</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DiagnosticCell
                  label="Critical"
                  value={String(data.critical.length)}
                  detail="Issues requiring intervention."
                  tone={data.critical.length ? "degraded" : "healthy"}
                />
                <DiagnosticCell
                  label="Attention"
                  value={String(data.attention.length)}
                  detail="Operator follow-up required."
                  tone={data.attention.length ? "degraded" : "healthy"}
                />
                <DiagnosticCell
                  label="Notices"
                  value={String(data.notices.length)}
                  detail="Informational platform signals."
                  tone="idle"
                />
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function DiagnosticCell({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "healthy" | "degraded" | "idle";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold ${toneClass(tone)}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function SummaryCard({
  title,
  status,
  statusTone,
  lines,
  href,
  action,
}: {
  title: string;
  status: string;
  statusTone: "healthy" | "degraded" | "idle";
  lines: string[];
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className={`mt-2 text-lg font-semibold ${toneClass(statusTone)}`}>{status}</p>
      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-3 inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
      >
        {action} →
      </Link>
    </section>
  );
}
