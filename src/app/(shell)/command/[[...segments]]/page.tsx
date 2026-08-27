import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCommandCentreOpsHome, resolveSalesWeekPrompt } from "@dg/platform-core";

import { CommandBetaStatus } from "@/components/command/CommandBetaStatus";
import { CommandOpsHome } from "@/components/command/CommandOpsHome";
import { SalesWeekNowBanner } from "@/components/command/SalesWeekNowBanner";
import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";
import { getPlatformPageContext } from "@/lib/platform-page-context";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Placeholder Command routes that must not show fake UI — redirect to real surfaces. */
const VAPOR_REDIRECTS: Record<string, string> = {
  support: "/support",
  audit: "/dashboard/settings/audit",
};

async function CommandOverviewPage() {
  await connection();
  await getPlatformPageContext();
  const data = process.env.DATABASE_URL ? await getCommandCentreOpsHome() : null;
  const salesPrompt = resolveSalesWeekPrompt();

  return (
    <>
      <header className="dg-page-header relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(14, 165, 233, 0.18), transparent 55%), linear-gradient(180deg, rgba(2,6,23,0.2), transparent)",
          }}
        />
        <div className="relative">
          <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
            ← Business workspace
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
            DigitalGate
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Command Centre
          </h1>
          <p className="mt-1 text-sm font-medium text-sky-200/90">
            DigitalGate Platform Operations
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {data?.briefing ??
              "DigitalGate Platform Operations — run DigitalGate, not customer industry ops."}
          </p>
        </div>
      </header>
      <main className="dg-page-main space-y-8">
        <SalesWeekNowBanner prompt={salesPrompt} compact />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Set <code className="text-amber-200">DATABASE_URL</code> and run{" "}
            <code className="text-amber-200">npm run db:push</code> to enable live Command Centre
            aggregates.
          </div>
        ) : (
          <CommandOpsHome data={data} />
        )}

        <CommandBetaStatus />
      </main>
    </>
  );
}

export default async function CommandPage({ params }: PageProps) {
  const { segments } = await params;

  if (!segments?.length) {
    return <CommandOverviewPage />;
  }

  const head = segments[0];
  if (head && VAPOR_REDIRECTS[head] && segments.length === 1) {
    redirect(VAPOR_REDIRECTS[head]);
  }

  const href = `/command/${segments.join("/")}`;
  return <AppFeaturePlaceholder href={href} />;
}
