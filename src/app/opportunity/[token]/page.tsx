import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicGrowthOpportunityReport } from "@dg/platform-core";

export default async function PublicOpportunityReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = process.env.DATABASE_URL
    ? await getPublicGrowthOpportunityReport(token)
    : null;

  if (!report) notFound();

  const { prospect, scores, findings, recommendedActions } = report;
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.08),_transparent_40%)]" />
      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="border-b border-slate-800/80 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            DigitalGate
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {prospect.businessName}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Opportunity Report
            {prospect.industry ? ` · ${prospect.industry}` : ""}
            {prospect.location ? ` · ${prospect.location}` : ""}
          </p>
          {prospect.websiteUrl ? (
            <a
              href={prospect.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-sky-400 hover:underline"
            >
              {prospect.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : null}
        </header>

        <section className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Executive summary
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-200">
            {report.executiveSummary}
          </p>
        </section>

        <section className="mt-10">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Digital Business Health™
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ScoreBlock label="Business Health" value={scores.businessHealth} emphasis />
            <ScoreBlock label="Website" value={scores.websiteHealth} />
            <ScoreBlock label="SEO" value={scores.seoScore} />
            <ScoreBlock label="AI Visibility™" value={scores.aiVisibility} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {critical} critical · {warnings} warning
            {findings.length
              ? ` · ${findings.length} finding${findings.length === 1 ? "" : "s"}`
              : ""}
            {report.auditedAt
              ? ` · Audited ${new Date(report.auditedAt).toLocaleDateString("en-AU")}`
              : ""}
          </p>
        </section>

        {findings.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">Findings</h2>
            <ul className="mt-4 space-y-4">
              {findings.map((finding, index) => (
                <li
                  key={`${finding.domain}-${index}`}
                  className="border-b border-slate-800/70 pb-4 last:border-0"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <SeverityPill severity={finding.severity} />
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {finding.domain.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-white">{finding.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {finding.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recommendedActions.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">Recommended actions</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-300">
              {recommendedActions.map((item) => (
                <li key={item.title} className="pl-1">
                  <span className="font-medium text-white">{item.title}</span>
                  <span className="text-slate-400"> — {item.action}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="mt-10 rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-5">
          <h2 className="text-lg font-semibold text-white">How DigitalGate can help</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {report.howDigitalGateHelps}
          </p>
          <Link
            href="https://digitalgate.com.au"
            className="mt-4 inline-block text-sm font-medium text-sky-400 hover:underline"
          >
            digitalgate.com.au →
          </Link>
        </section>

        <footer className="mt-12 border-t border-slate-800/80 pt-6 text-xs text-slate-600">
          Prepared by DigitalGate · View #{report.viewCount} · Generated{" "}
          {new Date(report.generatedAt).toLocaleDateString("en-AU")}
        </footer>
      </div>
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | null;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-3"
          : "rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-3"
      }
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          emphasis ? "text-sky-300" : "text-white"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const styles =
    severity === "critical"
      ? "bg-rose-500/15 text-rose-300"
      : severity === "warning"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-slate-500/15 text-slate-300";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${styles}`}>
      {severity}
    </span>
  );
}
