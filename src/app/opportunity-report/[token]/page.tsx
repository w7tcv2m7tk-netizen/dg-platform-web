import { notFound } from "next/navigation";

type Finding = { title?: string; detail?: string; observed?: string; interpretation?: string; recommendedAction?: string };
function findingsFrom(value: unknown): Finding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter((x): x is Finding => Boolean(x && typeof x === "object")) : [];
}
function scoreLabel(value: number | null) {
  if (value == null) return "Not assessed";
  if (value >= 75) return "Strong foundation";
  if (value >= 50) return "Room to improve";
  return "Priority opportunity";
}
function businessMeaning(f: Finding) {
  const title=(f.title||"").toLowerCase();
  if(title.includes("h1")) return "A clearer primary page topic can help search engines and visitors understand what this page is about.";
  if(title.includes("open graph")) return "Improved social sharing metadata helps links present more professionally when customers share or encounter the business online.";
  if(title.includes("structured data") || title.includes("schema")) return "Structured business information can make it easier for Google and AI systems to understand the organisation, services, location and entity relationships.";
  return f.interpretation || "This finding represents a practical opportunity to strengthen digital visibility, customer experience or conversion.";
}

export default async function OpportunityReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { prisma } = await import("@dg/database");
  const report = await prisma.growthProspectReport.findUnique({ where: { shareToken: token }, include: { prospect: { include: { audits: { orderBy: { auditedAt: "desc" }, take: 1 } } } } });
  if (!report) notFound();

  const audit = report.prospect.audits[0];
  const findings = findingsFrom(audit?.findings);
  await prisma.growthProspectReport.update({ where: { id: report.id }, data: { viewCount: { increment: 1 }, firstViewedAt: report.firstViewedAt ?? new Date() } });
  await prisma.growthProspectEngagement.create({ data: { prospectId: report.prospectId, reportId: report.id, type: "report_viewed" } });

  const scores = audit ? [["Business Health",audit.businessHealth,"Overall digital readiness"],["AI Visibility",audit.aiVisibility,"How clearly AI/search systems can understand the business"],["SEO",audit.seoScore,"Organic search foundations"],["Website Health",audit.websiteHealth,"Technical and on-page website foundations"]] as const : [];

  return (
    <main className="min-h-screen bg-[#05091a] text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
        <header className="border-b border-slate-700 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">DigitalGate · Digital Opportunity Report</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{report.prospect.businessName}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">An evidence-based review of your current digital position, highlighting practical opportunities to improve visibility, customer acquisition and digital operations.</p>
          <p className="mt-3 text-xs text-slate-500">Prepared {report.generatedAt.toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"})} · Based on observable public digital signals</p>
        </header>

        {audit ? <>
          <section className="mt-9">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Executive snapshot</p><h2 className="mt-2 text-2xl font-semibold text-white">Where things stand today</h2></div></div>
            <p className="mt-3 max-w-4xl leading-7 text-slate-300">The audit shows a workable website foundation, with the strongest immediate upside in search structure and AI/search discoverability. The scores below are directional indicators designed to identify where focused improvements could create the most value.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scores.map(([label,value,description]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><p className="text-sm font-medium text-slate-300">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value ?? "—"}<span className="text-base text-slate-500">/100</span></p><p className="mt-2 text-xs font-medium text-violet-300">{scoreLabel(value)}</p><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>)}
            </div>
          </section>

          <section className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Opportunity analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">What we found — and why it matters</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {findings.slice(0,6).map((f,i)=><article key={i} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">{i+1}</span><div>
                  <h3 className="font-semibold text-white">{f.title || "Digital opportunity"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{businessMeaning(f)}</p>
                  <div className="mt-4 border-l-2 border-slate-700 pl-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence observed</p><p className="mt-1 text-sm text-slate-400">{f.observed || f.detail || "Evidence recorded in the DigitalGate audit."}</p></div>
                  {f.recommendedAction ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-400">Recommended action</p><p className="mt-1 text-sm leading-6 text-violet-200">{f.recommendedAction}</p></div>:null}
                </div></div>
              </article>)}
            </div>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Priority plan</p><h2 className="mt-2 text-2xl font-semibold text-white">What we would address first</h2>
              <ol className="mt-5 space-y-4">{findings.slice(0,3).map((f,i)=><li key={i} className="flex gap-3"><span className="font-semibold text-violet-300">0{i+1}</span><div><p className="font-medium text-white">{f.recommendedAction || f.interpretation || f.title}</p><p className="mt-1 text-sm leading-6 text-slate-300">{businessMeaning(f)}</p></div></li>)}</ol>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">The bigger opportunity</p><h2 className="mt-2 text-xl font-semibold text-white">From audit to growth system</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">These findings are not just isolated website fixes. DigitalGate can connect visibility, lead capture, CRM, follow-up, automation and business intelligence so improvements become part of an ongoing customer-acquisition system.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300"><li>• Improve search and AI visibility foundations</li><li>• Strengthen lead capture and conversion pathways</li><li>• Centralise prospect and customer follow-up</li><li>• Automate repetitive marketing and communication</li><li>• Measure what is producing commercial results</li></ul>
            </div>
          </section>
        </> : <p className="mt-8 text-slate-300">The underlying audit is unavailable.</p>}

        <section className="mt-10 rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-slate-900 p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Next step</p><h2 className="mt-2 text-2xl font-semibold text-white">Turn these opportunities into a practical plan</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">A DigitalGate Platform Consultation will review these findings with you, identify which opportunities matter most commercially and demonstrate the relevant DigitalGate capabilities against your business. There is no obligation to proceed.</p>
          <a href="https://digitalgate.com.au/contact/" className="mt-5 inline-flex rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400">Book a Platform Consultation</a>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-white">About this report</h2><p className="mt-2 text-xs leading-5 text-slate-400">This report is based on observable public signals captured by DigitalGate at the time of the audit. Scores are directional rather than guarantees of search rankings, leads or revenue. Recommendations should be validated against your business objectives, systems and customer journey before implementation.</p>
        </section>
        <footer className="mt-10 border-t border-slate-700 pt-5 text-xs text-slate-400">DigitalGate · AI-powered Business Operating Platform · The Gateway to Your Digital World™</footer>
      </div>
    </main>
  );
}
