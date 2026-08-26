import Link from "next/link";
import { listGrowthProspectReports } from "@dg/platform-core";

import {
  ConvertProspectToOrgButton,
  CopyShareLinkButton,
  MarkReportSentButton,
} from "@/components/command/GrowthEngineActions";

const CONVERT_STAGES = new Set(["proposal_sent", "won", "onboarding"]);

export default async function GrowthReportsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const reports = db ? await listGrowthProspectReports() : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Opportunity Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Staff drafts plus public token links — share{" "}
          <code className="text-slate-300">/opportunity/&lt;token&gt;</code> with prospects.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!db ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to generate opportunity reports.
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-6">
            <p className="text-slate-300">No reports yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Run a presence audit, then generate a report from the Audits screen.
            </p>
            <Link
              href="/command/growth-engine/audits"
              className="mt-4 inline-block text-sm text-sky-400 hover:underline"
            >
              Open AI Audit Engine →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {report.prospect.industry || "Prospect"}
                      {report.prospect.location ? ` · ${report.prospect.location}` : ""}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {report.prospect.businessName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Generated{" "}
                      {new Date(report.generatedAt).toLocaleString("en-AU")}
                      {report.sentAt
                        ? ` · Sent ${new Date(report.sentAt).toLocaleString("en-AU")}`
                        : " · Draft"}
                      {` · ${report.viewCount} view${report.viewCount === 1 ? "" : "s"}`}
                      {report.firstViewedAt
                        ? ` · First view ${new Date(report.firstViewedAt).toLocaleString("en-AU")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!report.sentAt ? <MarkReportSentButton reportId={report.id} /> : null}
                    <CopyShareLinkButton sharePath={report.sharePath} />
                    <Link
                      href={`${report.sharePath}?preview=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Open preview →
                    </Link>
                    <Link
                      href={report.sharePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-sky-400 hover:underline"
                    >
                      Open as prospect (counts view) →
                    </Link>
                    <Link
                      href="/command/growth-engine/pipeline"
                      className="text-xs text-slate-500 hover:text-sky-400 hover:underline"
                    >
                      Pipeline →
                    </Link>
                    {CONVERT_STAGES.has(report.prospect.stage) ||
                    report.prospect.convertedOrganisationId ? (
                      <ConvertProspectToOrgButton
                        prospectId={report.prospectId}
                        convertedOrganisationId={
                          report.prospect.convertedOrganisationId
                        }
                        label="Convert to org"
                      />
                    ) : null}
                  </div>
                </div>
                {report.executiveSummary ? (
                  <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
                      Executive summary
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-200">
                      {report.executiveSummary}
                    </p>
                  </div>
                ) : null}
                {report.prospect.websiteUrl ? (
                  <a
                    href={report.prospect.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-sky-400 hover:underline"
                  >
                    {report.prospect.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
