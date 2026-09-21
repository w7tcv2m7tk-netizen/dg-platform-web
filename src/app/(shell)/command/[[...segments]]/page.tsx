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
      <header className="dg-page-header relative overflow-hidden border-b border-violet-500/15">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 82% 22%, rgba(139,92,246,.24), transparent 28%), radial-gradient(circle at 18% 8%, rgba(14,165,233,.16), transparent 34%), linear-gradient(135deg, rgba(2,6,23,.2), rgba(15,23,42,.78))",
          }}
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="py-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center text-sm text-sky-300 transition hover:text-white"
            >
              ← Business workspace
            </Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.8)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">
                DigitalGate · Live command
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl">
              Command Centre
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-medium text-sky-100">
              One view of the DigitalGate platform.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {data?.briefing ??
                "See customers, revenue, delivery, growth and platform health together — with Aida watching the signals and surfacing what matters next."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#command-advisor"
                className="inline-flex min-h-11 items-center rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400"
              >
                Ask Aida
              </a>
              <a
                href="#command-attention"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-600/80 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/50 hover:text-white"
              >
                Review priorities
              </a>
              <Link
                href="/command/platform-health"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-700/80 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Platform health →
              </Link>
            </div>
          </div>

          <div className="relative hidden self-end lg:block">
            <div className="absolute inset-x-6 bottom-4 h-24 rounded-full bg-violet-500/20 blur-3xl" />
            <img
              src="/aida/aida-thinking.webp"
              alt="Aida, DigitalGate intelligence"
              className="relative ml-auto max-h-[330px] w-full object-contain object-bottom drop-shadow-[0_22px_40px_rgba(0,0,0,.4)]"
            />
            <div className="absolute bottom-5 right-0 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 shadow-xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">Aida</p>
              <p className="mt-0.5 text-xs text-slate-300">Platform intelligence</p>
            </div>
          </div>
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
