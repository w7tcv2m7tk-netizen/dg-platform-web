import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientIntelligence } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { ProvisionAccBetaButton } from "@/components/command/ProvisionAccBetaButton";
import { ProvisionInfraDomainsBetaButton } from "@/components/command/ProvisionInfraDomainsBetaButton";
import { ProvisionReBetaButton } from "@/components/command/ProvisionReBetaButton";
import { ProvisionWebsitesBetaButton } from "@/components/command/ProvisionWebsitesBetaButton";
import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

type Ctx = { params: Promise<{ orgId: string }> };

export default async function CommandClientDetailPage({ params }: Ctx) {
  const { orgId } = await params;
  const intel = process.env.DATABASE_URL
    ? await getClientIntelligence()
    : null;
  const client = intel?.clients.find((c) => c.organisationId === orgId);

  if (!intel) {
    return (
      <>
        <header className="dg-page-header">
          <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
            ← Clients
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Client detail</h1>
        </header>
        <main className="dg-page-main">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — client detail unavailable.
          </div>
        </main>
      </>
    );
  }

  if (!client) notFound();

  const breakdown = client.scoreBreakdown;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {client.organisationName}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {client.organisationSlug}
          {client.industry ? ` · ${client.industry}` : ""} · rank #{client.rank}
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="clients" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Success Score™
            </p>
            <div className="mt-2">
              <ScoreCell score={client.successScore} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Health tier</p>
            <div className="mt-2">
              <TierBadge tier={client.healthTier} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">CRM / Acc·RE</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {client.leadCount} / {client.propertyCount}/{client.stayBookingCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 text-sm text-slate-300">
              {client.needsAttention ? (
                <span className="text-amber-300">
                  {client.attentionReasons[0] ?? "Needs attention"}
                </span>
              ) : (
                <span className="text-emerald-300">
                  {client.highlights[0] ?? "Healthy"}
                </span>
              )}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Score breakdown</h2>
          <p className="mt-1 text-xs text-slate-500">
            Live signals only — sparse orgs show early data, not invented gaps.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {(
              [
                ["Connectors", breakdown.connectors],
                ["CRM", breakdown.crm],
                ["Usage", breakdown.usage],
                ["Billing", breakdown.billing],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-800 px-3 py-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 space-y-3">
          <h2 className="text-lg font-semibold text-white">Beta enrolment</h2>
          <div className="flex flex-wrap gap-3">
            <ProvisionReBetaButton
              organisationId={client.organisationId}
              organisationName={client.organisationName}
              alreadyBeta={client.reBeta}
            />
            <ProvisionAccBetaButton
              organisationId={client.organisationId}
              organisationName={client.organisationName}
              alreadyBeta={client.accBeta}
            />
            <ProvisionWebsitesBetaButton
              organisationId={client.organisationId}
              organisationName={client.organisationName}
              alreadyBeta={client.websitesBeta}
            />
            <ProvisionInfraDomainsBetaButton
              organisationId={client.organisationId}
              organisationName={client.organisationName}
              alreadyBeta={client.infraDomainsBeta}
            />
          </div>
        </section>

        {(client.highlights.length > 0 || client.attentionReasons.length > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {client.highlights.length ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                <h3 className="text-sm font-semibold text-emerald-200">Highlights</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                  {client.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {client.attentionReasons.length ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                <h3 className="text-sm font-semibold text-amber-200">Attention</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                  {client.attentionReasons.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/command/advisor?org=${client.organisationId}`}
            className="rounded-md bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-600"
          >
            AI Advisor
          </Link>
          <Link
            href={`/command/opportunities?org=${client.organisationId}`}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-slate-500"
          >
            Expansion
          </Link>
          <Link
            href="/command/flags"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-slate-500"
          >
            Flags
          </Link>
        </div>
      </main>
    </>
  );
}
