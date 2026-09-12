import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import {
  getOperatorClientIntelligence,
  getOperatorCommandCentreOpsHome,
  resolveSalesWeekPrompt,
} from "@dg/platform-core";

import { AiAdvisorPanel } from "@/components/command/AiAdvisorPanel";
import { CommandBetaStatus } from "@/components/command/CommandBetaStatus";
import { CommandOpsHome } from "@/components/command/CommandOpsHome";
import { SalesWeekNowBanner } from "@/components/command/SalesWeekNowBanner";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ org?: string }>;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Compatibility-only Command aliases that redirect to their canonical owner. */
const COMPATIBILITY_REDIRECTS: Record<string, string> = {
  support: "/support",
  audit: "/dashboard/settings/audit",
};

async function CommandOverviewPage({ initialOrgId }: { initialOrgId?: string }) {
  await connection();
  const operator = await requirePlatformOperatorContext();
  const [data, intelligence] = process.env.DATABASE_URL
    ? await Promise.all([
        getOperatorCommandCentreOpsHome(operator),
        getOperatorClientIntelligence(operator),
      ])
    : [null, null];
  const salesPrompt = resolveSalesWeekPrompt();
  const orgs =
    intelligence?.clients.map((client) => ({
      organisationId: client.organisationId,
      organisationName: client.organisationName,
      successScore: client.successScore,
      scoreProvisional: client.scoreProvisional,
      needsAttention: client.needsAttention,
    })) ?? [];

  return (
    <>
      <header className="dg-page-header relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(124, 58, 237, 0.18), transparent 55%), radial-gradient(ellipse 65% 50% at 90% 0%, rgba(14, 165, 233, 0.12), transparent 58%), linear-gradient(180deg, rgba(2,6,23,0.2), transparent)",
          }}
        />
        <div className="relative">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
          >
            ← Business workspace
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold tracking-wide text-violet-200">
              AI
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
              Aida · Operator
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Command Centre
          </h1>
          <p className="mt-1 text-sm font-medium text-sky-200/90">
            DigitalGate Platform Operations
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {data?.briefing ??
              "DigitalGate Platform Operations — run DigitalGate, not customer industry ops."}
          </p>
        </div>
      </header>

      <main className="dg-page-main space-y-8">
        <SalesWeekNowBanner prompt={salesPrompt} compact />

        <section id="command-advisor" className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">
              Aida command briefing
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Understand, prioritise and act from one cockpit
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Ask Aida about a customer, risk or operating question without leaving Command. Ranked priorities and live alerts continue directly below.
            </p>
          </div>
          {intelligence ? (
            <AiAdvisorPanel orgs={orgs} initialOrgId={initialOrgId} />
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
              Operator intelligence is temporarily unavailable. Live priorities and platform diagnostics remain available below.
            </div>
          )}
        </section>

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Live Command Centre aggregates are temporarily unavailable. Use Platform for operational diagnostics and retry when the data service is restored.
          </div>
        ) : (
          <CommandOpsHome data={data} />
        )}

        <CommandBetaStatus />
      </main>
    </>
  );
}

export default async function CommandPage({ params, searchParams }: PageProps) {
  const [{ segments }, { org }] = await Promise.all([params, searchParams]);

  if (!segments?.length) {
    return <CommandOverviewPage initialOrgId={org} />;
  }

  const head = segments[0];
  if (head && COMPATIBILITY_REDIRECTS[head] && segments.length === 1) {
    redirect(COMPATIBILITY_REDIRECTS[head]);
  }

  notFound();
}
