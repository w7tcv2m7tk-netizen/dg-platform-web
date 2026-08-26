import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  growthPipelineStages,
  listGrowthProspects,
} from "@dg/platform-core";

import { EditProspectForm } from "@/components/command/EditProspectForm";
import {
  ArchiveProspectButton,
  ConvertProspectToOrgButton,
} from "@/components/command/GrowthEngineActions";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const CONVERT_STAGES = new Set(["proposal_sent", "won", "onboarding"]);

const BOARD_STAGES = [
  "prospect",
  "audit_created",
  "report_sent",
  "report_viewed",
  "meeting_booked",
  "proposal_sent",
  "won",
  "lost",
] as const;

interface PageProps {
  searchParams: Promise<{ archived?: string }>;
}

export default async function GrowthPipelinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showArchived = params.archived === "1";
  const stages = growthPipelineStages();
  const { session } = await getPlatformPageContext();
  const organisationId = session?.organisationId;
  const prospects =
    process.env.DATABASE_URL && organisationId
      ? await listGrowthProspects({
          organisationId,
          limit: 200,
          ...(showArchived ? { archivedOnly: true } : {}),
        })
      : [];

  const columns = BOARD_STAGES.map((stage) => ({
    stage,
    items: prospects.filter((p) => p.stage === stage),
  }));

  const overflow = prospects.filter(
    (p) => !(BOARD_STAGES as readonly string[]).includes(p.stage),
  );

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospect Pipeline</h1>
        <p className="mt-1 text-sm text-slate-400">
          {prospects.length}{" "}
          {showArchived ? "archived" : "active"} prospect
          {prospects.length === 1 ? "" : "s"} · drag-free board with stage controls
        </p>
        <p className="mt-2 text-xs">
          {showArchived ? (
            <Link
              href="/command/growth-engine/pipeline"
              className="text-sky-400 hover:underline"
            >
              ← Hide archived
            </Link>
          ) : (
            <Link
              href="/command/growth-engine/pipeline?archived=1"
              className="text-slate-500 hover:text-sky-400 hover:underline"
            >
              Show archived
            </Link>
          )}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!process.env.DATABASE_URL ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to use the prospect pipeline.
          </div>
        ) : prospects.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-6 max-w-xl">
            <p className="text-slate-300">
              {showArchived ? "No archived prospects." : "No prospects yet."}
            </p>
            {!showArchived ? (
              <Link
                  href="/apps/prospecting/discovery"
                className="mt-3 inline-block text-sm text-sky-400 hover:underline"
              >
                Add your first prospect →
              </Link>
            ) : null}
          </div>
        ) : showArchived ? (
          <ul className="space-y-2 max-w-2xl">
            {prospects.map((prospect) => (
              <li
                key={prospect.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{prospect.businessName}</p>
                  <p className="text-xs text-slate-500">
                    {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                    {prospect.archivedAt
                      ? ` · Archived ${new Date(prospect.archivedAt).toLocaleDateString("en-AU")}`
                      : ""}
                  </p>
                </div>
                <ArchiveProspectButton
                  prospectId={prospect.id}
                  businessName={prospect.businessName}
                  archived
                />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map((col) => (
                <div
                  key={col.stage}
                  className="w-64 shrink-0 rounded-xl border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {GROWTH_ENGINE_STAGE_LABELS[col.stage] ?? col.stage}
                    </p>
                    <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-400">
                      {col.items.length}
                    </span>
                  </div>
                  <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                    {col.items.length === 0 ? (
                      <li className="px-2 py-6 text-center text-xs text-slate-600">Empty</li>
                    ) : (
                      col.items.map((prospect) => (
                        <li
                          key={prospect.id}
                          className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3"
                        >
                          <p className="text-sm font-medium text-white">
                            {prospect.businessName}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {[prospect.industry, prospect.location].filter(Boolean).join(" · ") ||
                              "—"}
                          </p>
                          {prospect.websiteUrl ? (
                            <a
                              href={prospect.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block truncate text-[11px] text-sky-400 hover:underline"
                            >
                              {prospect.websiteUrl.replace(/^https?:\/\//, "")}
                            </a>
                          ) : null}
                          <div className="mt-2 space-y-2">
                            <ProspectStageSelect
                              prospectId={prospect.id}
                              stage={prospect.stage}
                              stages={stages}
                            />
                            <EditProspectForm prospect={prospect} compact />
                            {CONVERT_STAGES.has(prospect.stage) ||
                            prospect.convertedOrganisationId ? (
                              <ConvertProspectToOrgButton
                                prospectId={prospect.id}
                                convertedOrganisationId={
                                  prospect.convertedOrganisationId
                                }
                                label={
                                  prospect.stage === "proposal_sent"
                                    ? "Convert to org"
                                    : "Create client org"
                                }
                              />
                            ) : null}
                            <ArchiveProspectButton
                              prospectId={prospect.id}
                              businessName={prospect.businessName}
                            />
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>

            {overflow.length > 0 ? (
              <section>
                <h2 className="text-sm font-semibold text-white">Other stages</h2>
                <ul className="mt-2 space-y-2">
                  {overflow.map((prospect) => (
                    <li
                      key={prospect.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">{prospect.businessName}</p>
                        <p className="text-xs text-slate-500">
                          {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ProspectStageSelect
                          prospectId={prospect.id}
                          stage={prospect.stage}
                          stages={stages}
                        />
                        <EditProspectForm prospect={prospect} compact />
                        {CONVERT_STAGES.has(prospect.stage) ||
                        prospect.convertedOrganisationId ? (
                          <ConvertProspectToOrgButton
                            prospectId={prospect.id}
                            convertedOrganisationId={
                              prospect.convertedOrganisationId
                            }
                          />
                        ) : null}
                        <ArchiveProspectButton
                          prospectId={prospect.id}
                          businessName={prospect.businessName}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
