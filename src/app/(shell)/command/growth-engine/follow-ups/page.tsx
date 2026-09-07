import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  getOperatorGrowthFollowUpQueue,
  growthPipelineStages,
} from "@dg/platform-core";

import {
  ConvertProspectToOrgButton,
  CopyShareLinkButton,
  CreateProposalQuoteButton,
  GenerateProspectReportButton,
  MarkReportSentButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

const CONVERT_STAGES = new Set(["proposal_sent", "won", "onboarding", "report_viewed"]);

export default async function GrowthFollowUpsPage() {
  const operator = await requirePlatformOperatorContext();
  const db = Boolean(process.env.DATABASE_URL);
  const queue = db ? await getOperatorGrowthFollowUpQueue(operator, { idleDays: 5 }) : [];
  const stages = growthPipelineStages();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Smart Follow-Up</h1>
        <p className="mt-1 text-sm text-slate-400">
          Idle prospects (≥5 days without stage movement) — actionable CTAs from live pipeline data.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
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
                      {item.hasReport
                        ? ` · ${item.reportViewCount} view${item.reportViewCount === 1 ? "" : "s"}`
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
                      <>
                        <GenerateProspectReportButton
                          prospectId={item.prospectId}
                          auditId={item.latestAuditId ?? undefined}
                          markSent
                        />
                        <GenerateProspectReportButton
                          prospectId={item.prospectId}
                          auditId={item.latestAuditId ?? undefined}
                          label="Generate draft"
                        />
                      </>
                    ) : (
                      <>
                        {item.reportSharePath ? (
                          <>
                            <CopyShareLinkButton sharePath={item.reportSharePath} />
                            <Link
                              href={`${item.reportSharePath}?preview=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sky-400 hover:underline"
                            >
                              Open report (preview) →
                            </Link>
                          </>
                        ) : null}
                        {item.reportId && !item.reportSentAt ? (
                          <MarkReportSentButton reportId={item.reportId} />
                        ) : null}
                        <CreateProposalQuoteButton
                          prospectId={item.prospectId}
                          label="Propose quote"
                        />
                        {CONVERT_STAGES.has(item.stage) || item.convertedOrganisationId ? (
                          <ConvertProspectToOrgButton
                            prospectId={item.prospectId}
                            convertedOrganisationId={item.convertedOrganisationId}
                            label="Convert to org"
                          />
                        ) : null}
                      </>
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
