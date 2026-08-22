import Link from "next/link";
import {
  getCommandCentreOpsHome,
  getDigitalInfrastructureOverview,
  getStripeSetupStatus,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";

export default async function CommandPlatformHealthPage() {
  const data = process.env.DATABASE_URL ? await getCommandCentreOpsHome() : null;
  const stripe = getStripeSetupStatus();
  const connectors = data?.connectors;
  const infra = await getDigitalInfrastructureOverview("platform");
  const sentryConfigured = Boolean(
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
  );

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform health</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connectors, commercial plumbing, and Digital Infrastructure (scaffold).
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="health" />

        <p className="text-xs text-slate-500">
          Observability floor:{" "}
          {sentryConfigured
            ? "Sentry DSN configured — runtime errors can forward to Sentry (not a customer uptime dashboard)."
            : "Sentry DSN not set — set SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN for the ops error floor."}
        </p>

        <section>
          <h2 className="text-lg font-semibold text-white">Digital Infrastructure</h2>
          <p className="mt-1 text-sm text-slate-400">
            Core Platform Service — assets, health checklist, and AI renew
            recommendations (vision). Provider brand stays internal.
          </p>
          <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  infra.health.status === "ok"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : infra.health.status === "not_configured"
                      ? "bg-amber-500/15 text-amber-200"
                      : "bg-rose-500/15 text-rose-200"
                }`}
              >
                {infra.health.status} · {infra.isSandbox ? "sandbox" : "production"}
              </span>
              <span className="text-xs text-slate-500">
                {infra.assets?.domains ?? 0} domains · {infra.assets?.websites ?? 0}{" "}
                websites
              </span>
              <Link
                href="/apps/infrastructure/domains"
                className="text-sm text-sky-400 hover:underline"
              >
                Domains →
              </Link>
            </div>
            <p className="mt-3 text-sm text-slate-300">{infra.health.message}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {infra.checklist.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-400"
                >
                  {item.label}
                  <span className="ml-2 text-xs text-slate-600">{item.state}</span>
                </li>
              ))}
            </ul>
            {infra.notes[0] ? (
              <p className="mt-3 text-xs text-slate-500">{infra.notes[0]}</p>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Stripe</h2>
          <p className="mt-1 text-sm text-slate-400">Billing mode and webhook readiness.</p>
          <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  stripe.ok
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-200"
                }`}
              >
                {stripe.ok ? "Healthy" : "Needs attention"} · {stripe.mode}
              </span>
              <Link
                href="/dashboard/settings/billing"
                className="text-sm text-sky-400 hover:underline"
              >
                Billing settings →
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {stripe.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={item.done ? "text-emerald-400" : "text-slate-600"}>
                    {item.done ? "✓" : "○"}
                  </span>
                  <span className={item.done ? "text-slate-300" : "text-slate-500"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">WordPress connectors</h2>
          <p className="mt-1 text-sm text-slate-400">
            Per-org host/key configuration and recent sync signals.
          </p>
          {!connectors ? (
            <p className="mt-4 text-sm text-slate-500">Database not configured.</p>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-300">
                {connectors.wordpressConfiguredCount} configured ·{" "}
                {connectors.wordpressSyncedRecently} synced in the last 7 days ·{" "}
                {connectors.orgsWithBillingCustomer} with Stripe customer
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">WordPress</th>
                      <th className="px-4 py-3 font-medium">Last sync</th>
                      <th className="px-4 py-3 font-medium">Billing</th>
                      <th className="px-4 py-3 font-medium">Apps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {connectors.orgs.map((org) => (
                      <tr key={org.organisationId} className="bg-slate-950/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{org.organisationName}</p>
                          <p className="text-xs text-slate-500">{org.organisationSlug}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              org.wordpressConfigured ? "text-emerald-400" : "text-slate-500"
                            }
                          >
                            {org.wordpressConfigured ? "Configured" : "Not set"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {org.lastSyncAt
                            ? new Date(org.lastSyncAt).toLocaleString("en-AU", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {org.hasBillingCustomer ? "Stripe linked" : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {org.installedApps.length
                            ? org.installedApps.slice(0, 4).join(", ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href="/dashboard/settings/connectors"
                className="mt-4 inline-block text-sm text-sky-400 hover:underline"
              >
                Manage connectors →
              </Link>
            </>
          )}
        </section>

        {data ? (
          <section>
            <h2 className="text-lg font-semibold text-white">Ops load</h2>
            <p className="mt-1 text-sm text-slate-400">
              Live workload indicators — not APM, but useful for morning triage.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Overdue responses</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {data.pulse.overdueLeadResponses}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tasks due today</p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.pulse.openTasksDue}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Delivery blocked
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.delivery.blocked}</p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
