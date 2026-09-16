import Link from "next/link";

export type AnalyticsBusinessInsight = {
  id: string;
  title: string;
  detail: string;
  action: string;
  href: string;
  tone: "positive" | "attention" | "opportunity" | "info";
};

const toneClasses: Record<AnalyticsBusinessInsight["tone"], string> = {
  positive: "border-emerald-500/25 bg-emerald-500/5",
  attention: "border-amber-500/30 bg-amber-500/5",
  opportunity: "border-violet-500/30 bg-violet-500/5",
  info: "border-sky-500/25 bg-sky-500/5",
};

export function AnalyticsBusinessIntelligence({
  insights,
}: {
  insights: AnalyticsBusinessInsight[];
}) {
  return (
    <section className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Business intelligence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">What DigitalGate is noticing</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Live signals from your CRM, pipeline, commerce and Digital Twin, translated into actions.
          </p>
        </div>
        <Link href="/dashboard/insights" className="text-sm text-sky-400 hover:underline">
          Open all insights →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => (
          <article key={insight.id} className={`rounded-xl border p-4 ${toneClasses[insight.tone]}`}>
            <h3 className="font-medium text-white">{insight.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-300">{insight.detail}</p>
            <Link href={insight.href} className="mt-3 inline-flex text-sm font-medium text-sky-400 hover:underline">
              {insight.action} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
