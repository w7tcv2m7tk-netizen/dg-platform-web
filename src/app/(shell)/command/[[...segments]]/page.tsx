import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import {
  buildCommandCockpitPresentation,
  getOperatorClientIntelligence,
  getOperatorCommandCentreOpsHome,
  resolveSalesWeekPrompt,
} from "@dg/platform-core";

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
  const cockpit = data ? buildCommandCockpitPresentation(data) : null;
  const statusDot = !cockpit
    ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,.7)]"
    : cockpit.status === "critical"
      ? "bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,.85)]"
      : cockpit.status === "attention"
        ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,.7)]"
        : "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.8)]";

  return (
    <>
      <header className="dg-page-header relative overflow-hidden border-b border-violet-500/15">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 88% 18%, rgba(124,58,237,.22), transparent 26%), radial-gradient(circle at 12% 0%, rgba(59,130,246,.14), transparent 32%), linear-gradient(180deg, rgba(10,10,18,.2), rgba(15,15,26,.72))",
          }}
        />
        <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="py-1">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center text-sm text-violet-200 transition hover:text-white"
            >
              ← Business workspace
            </Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">
                DigitalGate · {cockpit?.statusLabel ?? "Live aggregates unavailable"}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              Command Centre
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-medium text-violet-100/90">
              The operating cockpit for DigitalGate.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              {cockpit?.briefingHeadline ??
                data?.briefing ??
                "See customers, revenue, delivery, growth and platform health together — with Aida watching the signals and surfacing what matters next."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#command-advisor"
                className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,.28)] transition hover:brightness-110"
              >
                Ask Aida
              </a>
              <a
                href="#command-attention"
                className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-violet-400/40 hover:text-white"
              >
                Review priorities
              </a>
              <Link
                href="/command/platform-health"
                className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-400 transition hover:text-white"
              >
                Platform health →
              </Link>
            </div>
          </div>

          <div className="relative hidden self-end lg:block">
            <div className="absolute inset-x-4 bottom-3 h-16 rounded-full bg-violet-500/25 blur-3xl" />
            <img
              src="/aida/aida-thinking.webp"
              alt="Aida, DigitalGate intelligence"
              className="relative ml-auto max-h-[200px] w-full object-contain object-bottom drop-shadow-[0_18px_32px_rgba(0,0,0,.45)]"
            />
          </div>
        </div>
      </header>

      <main className="dg-page-main space-y-16">
        {!data ? (
          <div className="space-y-8">
            <SalesWeekNowBanner prompt={salesPrompt} compact />
            <div className="border-l-2 border-amber-400/50 pl-4 text-sm leading-6 text-amber-100">
              Live Command Centre aggregates are temporarily unavailable. Use Platform for operational
              diagnostics and retry when the data service is restored.
            </div>
          </div>
        ) : (
          <CommandOpsHome
            data={data}
            orgs={orgs}
            initialOrgId={initialOrgId}
            intelligenceAvailable={Boolean(intelligence)}
            salesPrompt={salesPrompt}
          />
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
