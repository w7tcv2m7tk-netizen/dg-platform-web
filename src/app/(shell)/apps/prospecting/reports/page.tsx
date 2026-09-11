import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listGrowthProspectReports,
  organisationGrowthScope,
} from "@dg/platform-core";

import { CopyShareLinkButton } from "@/components/command/GrowthEngineActions";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/**
 * Prospecting → Reports — customer-facing opportunity reports under the acquisition workspace.
 */
export default async function ProspectingReportsPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  let reports: Awaited<ReturnType<typeof listGrowthProspectReports>> = [];
  let loadFailed = false;

  if (process.env.DATABASE_URL) {
    try {
      reports = await listGrowthProspectReports(
        organisationGrowthScope(session.organisationId),
      );
    } catch (error) {
      console.error("[prospecting/reports] load failed", error);
      loadFailed = true;
    }
  } else {
    loadFailed = true;
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Prospecting &amp; Opportunity Engine™
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Opportunity Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review and share prospect-facing opportunity reports generated from DigitalGate evidence.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {loadFailed ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Opportunity reports are temporarily unavailable. Try again shortly.
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-6">
            <p className="text-slate-300">No reports yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Audit prospects first, then use the available prospecting workflow to create a report from real opportunity evidence.
            </p>
            <Link
              href="/apps/prospecting/scores"
              className="mt-4 inline-block text-sm text-sky-400 hover:underline"
            >
              Open Opportunities →
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
                      Generated {new Date(report.generatedAt).toLocaleString("en-AU")}
                      {report.sentAt
                        ? ` · Shared ${new Date(report.sentAt).toLocaleString("en-AU")}`
                        : " · Draft"}
                      {` · ${report.viewCount} view${report.viewCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <CopyShareLinkButton sharePath={report.sharePath} />
                    <Link
                      href={`${report.sharePath}?preview=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Preview report →
                    </Link>
                    <Link
                      href={report.sharePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-sky-400 hover:underline"
                    >
                      Open public report →
                    </Link>
                    <Link
                      href="/apps/prospecting/pipeline"
                      className="text-xs text-slate-500 hover:text-sky-400 hover:underline"
                    >
                      Pipeline →
                    </Link>
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
