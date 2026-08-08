import Link from "next/link";
import { listGrowthProposalDrafts } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { CreateProposalQuoteButton } from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Proposal drafts from live audits — create a Commerce quote on the operator org.
 */
export default async function GrowthProposalsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const drafts = db ? await listGrowthProposalDrafts() : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Proposal Generator</h1>
        <p className="mt-1 text-sm text-slate-400">
          List-price packages from presence audits. Create a draft Commerce quote on this org.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="/command/growth-engine/proposals" />

        {!db ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to draft proposals.
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-6">
            <p className="text-slate-300">No proposal-ready prospects yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Advance prospects past audit / report stages, or run audits first.
            </p>
            <Link
              href="/command/growth-engine/audits"
              className="mt-4 inline-block text-sm text-sky-400 hover:underline"
            >
              Open audits →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <article
                key={draft.prospectId}
                className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {draft.stage.replace(/_/g, " ")}
                      {draft.businessHealth != null
                        ? ` · Health ${draft.businessHealth}`
                        : " · No audit"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {draft.businessName}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                      {draft.coverLetter}
                    </p>
                    {draft.services.length > 0 ? (
                      <p className="mt-2 text-sm font-medium text-sky-300">
                        {draft.totalLabel}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {draft.periodHint}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {draft.auditId ? (
                      <CreateProposalQuoteButton prospectId={draft.prospectId} />
                    ) : null}
                    {draft.latestQuoteId ? (
                      <Link
                        href={`/apps/commerce/quotes/${draft.latestQuoteId}`}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Open last quote →
                      </Link>
                    ) : null}
                  </div>
                </div>
                {draft.services.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {draft.services.map((line) => (
                      <li
                        key={line.label}
                        className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-2 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium text-white">{line.label}</p>
                          <p className="mt-0.5 text-sm text-slate-400">{line.description}</p>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums text-slate-300">
                          {formatAud(line.amountCents)}
                          <span className="text-xs text-slate-500">/mo</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
