import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  getGrowthFollowUpQueue,
  growthPipelineStages,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import {
  GenerateProspectReportButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";

export default async function GrowthFollowUpsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const queue = db ? await getGrowthFollowUpQueue({ idleDays: 5 }) : [];
  const stages = growthPipelineStages();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Smart Follow-Up</h1>
        <p className="mt-1 text-sm text-slate-400">
          Idle prospects (≥5 days without stage movement) — queue from live pipeline data.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="/command/growth-engine/follow-ups" />

        {!db ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to load the follow-up queue.
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-5 text-sm text-emerald-100">
            No idle prospects — pipeline looks active. Check back after new audits go quiet.
          </div>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
              <li
                key={item.prospectId}
                className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.businessName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {GROWTH_ENGINE_STAGE_LABELS[item.stage] ?? item.stage} · idle{" "}
                      {item.idleDays}d
                      {item.latestAuditScore != null
                        ? ` · Health ${item.latestAuditScore}`
                        : ""}
                      {item.lastEngagementType
                        ? ` · last ${item.lastEngagementType.replace(/_/g, " ")}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm text-amber-100/90">{item.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[item.contactEmail, item.contactPhone, item.websiteUrl]
                        .filter(Boolean)
                        .join(" · ") || "No contact details"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ProspectStageSelect
                      prospectId={item.prospectId}
                      stage={item.stage}
                      stages={stages}
                    />
                    {!item.latestAuditScore ? (
                      <RunProspectAuditButton prospectId={item.prospectId} />
                    ) : !item.hasReport ? (
                      <GenerateProspectReportButton prospectId={item.prospectId} />
                    ) : (
                      <Link
                        href="/command/growth-engine/reports"
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Open reports →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
