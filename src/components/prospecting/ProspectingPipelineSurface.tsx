import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listGrowthProspects,
} from "@dg/platform-core";

import { EditProspectForm } from "@/components/command/EditProspectForm";
import {
  ArchiveProspectButton,
  ConvertProspectToOrgButton,
} from "@/components/command/GrowthEngineActions";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";
import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";

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

export async function ProspectingPipelineSurface({
  organisationId,
  showArchived,
  variant,
}: {
  organisationId: string;
  showArchived: boolean;
  variant: "apps" | "command";
}) {
  const discoveryHref = "/apps/prospecting/discovery";
  const pipelinePath =
    variant === "apps"
      ? "/apps/prospecting/pipeline"
      : "/command/growth-engine/pipeline";
  const hubHref =
    variant === "apps" ? "/apps/prospecting" : "/command/growth-engine";

  const prospects = process.env.DATABASE_URL
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

  return (
    <>
      <header className="dg-page-header">
        <Link href={hubHref} className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospect Pipeline</h1>
        <p className="mt-1 text-sm text-slate-400">
          {prospects.length} {showArchived ? "archived" : "active"} prospect
          {prospects.length === 1 ? "" : "s"}
        </p>
        {variant === "apps" ? (
          <ProspectingSubnav active="/apps/prospecting/pipeline" />
        ) : null}
        <p className="mt-2 text-xs">
          {showArchived ? (
            <Link href={pipelinePath} className="text-sky-400 hover:underline">
              ← Hide archived
            </Link>
          ) : (
            <Link
              href={`${pipelinePath}?archived=1`}
              className="text-slate-500 hover:text-sky-400 hover:underline"
            >
              Show archived
            </Link>
          )}
          {" · "}
          <Link href={discoveryHref} className="text-sky-400 hover:underline">
            Discovery
          </Link>
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!process.env.DATABASE_URL ? (
          <p className="text-sm text-amber-200">DATABASE_URL required for pipeline.</p>
        ) : prospects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No prospects yet.{" "}
            <Link href={discoveryHref} className="text-sky-400 hover:underline">
              Run Discovery
            </Link>{" "}
            to import businesses.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => (
              <section
                key={col.stage}
                className="w-64 shrink-0 rounded-xl border border-slate-800 bg-slate-950/40"
              >
                <header className="border-b border-slate-800 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {GROWTH_ENGINE_STAGE_LABELS[col.stage] ?? col.stage}
                  </p>
                  <p className="text-xs text-slate-600">{col.items.length}</p>
                </header>
                <ul className="space-y-2 p-2">
                  {col.items.map((prospect) => (
                    <li
                      key={prospect.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-white">
                        {prospect.businessName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[prospect.industry, prospect.location].filter(Boolean).join(" · ")}
                      </p>
                      {!showArchived ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <ProspectStageSelect
                            prospectId={prospect.id}
                            stage={prospect.stage}
                          />
                          <EditProspectForm prospect={prospect} />
                          {CONVERT_STAGES.has(prospect.stage) ? (
                            <ConvertProspectToOrgButton prospectId={prospect.id} />
                          ) : null}
                          <ArchiveProspectButton
                            prospectId={prospect.id}
                            businessName={prospect.businessName}
                            archived={false}
                          />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <ArchiveProspectButton
                            prospectId={prospect.id}
                            businessName={prospect.businessName}
                            archived
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
