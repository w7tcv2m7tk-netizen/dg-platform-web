import { notFound } from "next/navigation";

type Finding = { title?: string; detail?: string; observed?: string; interpretation?: string; recommendedAction?: string };
function findingsFrom(value: unknown): Finding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter((x): x is Finding => Boolean(x && typeof x === "object")) : [];
}

export default async function OpportunityReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { prisma } = await import("@dg/database");
  const report = await prisma.growthProspectReport.findUnique({ where: { shareToken: token }, include: { prospect: { include: { audits: { orderBy: { auditedAt: "desc" }, take: 1 } } } } });
  if (!report) notFound();

  const audit = report.prospect.audits[0];
  const findings = findingsFrom(audit?.findings);
  await prisma.growthProspectReport.update({
    where: { id: report.id },
    data: { viewCount: { increment: 1 }, firstViewedAt: report.firstViewedAt ?? new Date() },
  });
  await prisma.growthProspectEngagement.create({ data: { prospectId: report.prospectId, reportId: report.id, type: "report_viewed" } });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-12 text-slate-900 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">DigitalGate · Digital Opportunity Report</p>
      <h1 className="mt-3 text-3xl font-semibold">{report.prospect.businessName}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">An evidence-based review of the business's current digital position and practical opportunities to improve visibility, customer acquisition and digital operations.</p>

      {audit ? <>
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Business Health",audit.businessHealth],["AI Visibility",audit.aiVisibility],["SEO",audit.seoScore],["Website Health",audit.websiteHealth]].map(([label,value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value ?? "—"}/100</p></div>
          ))}
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Key opportunities</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {findings.slice(0,6).map((finding,index)=><article key={index} className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold">{finding.title || "Digital opportunity"}</h3><p className="mt-2 text-sm text-slate-600">{finding.observed || finding.detail || "Evidence recorded by the DigitalGate audit."}</p>{finding.recommendedAction ? <p className="mt-3 text-sm font-medium text-violet-800">{finding.recommendedAction}</p>:null}</article>)}
          </div>
        </section>
      </> : <p className="mt-8">The underlying audit is unavailable.</p>}

      <section className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
        <h2 className="text-xl font-semibold">What would we prioritise?</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">{findings.slice(0,3).map((f,i)=><li key={i}>{i+1}. {f.recommendedAction || f.interpretation || f.title}</li>)}</ol>
        <p className="mt-5 text-sm text-slate-600">A DigitalGate Platform Consultation can turn these findings into a practical implementation plan and demonstrate the relevant capabilities against your business.</p>
      </section>
      <footer className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500">DigitalGate · The Gateway to Your Digital World™</footer>
    </main>
  );
}
