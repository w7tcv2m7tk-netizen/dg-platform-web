import Link from "next/link";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import {
  BUSINESS_BRAIN_KNOWLEDGE_LAYERS,
  type BusinessBrainDashboardBundle,
  type BusinessBrainDimension,
  type BusinessBrainField,
} from "@dg/platform-core";

function completenessTone(value: number) {
  if (value >= 75) return "text-emerald-400";
  if (value >= 55) return "text-sky-400";
  return "text-amber-300";
}

function fieldStatusClass(status: BusinessBrainField["status"]) {
  if (status === "ready") return "text-emerald-300";
  if (status === "partial") return "text-amber-200";
  return "text-slate-500";
}

function fieldStatusIcon(status: BusinessBrainField["status"]) {
  if (status === "ready") return "●";
  if (status === "partial") return "◐";
  return "○";
}

function DimensionCard({ dimension }: { dimension: BusinessBrainDimension }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{dimension.name}</p>
          <p className="mt-1 text-xs text-slate-400">{dimension.summary}</p>
        </div>
        <p className={`text-lg font-bold ${completenessTone(dimension.percent)}`}>
          {dimension.percent}%
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {dimension.fields.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm hover:border-sky-500/40"
            >
              <span className={fieldStatusClass(item.status)}>
                {fieldStatusIcon(item.status)} {item.label}
              </span>
              {item.value ? (
                <span className="max-w-[10rem] truncate text-xs text-slate-500">{item.value}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function BusinessBrainDashboard({ data }: { data: BusinessBrainDashboardBundle }) {
  return (
    <div className="space-y-6">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-100/90">
          Connect CRM, Business Profile, and live systems so DigitalGate can build a complete
          picture of your business.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-300/90">
          Business Brain™
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">{data.organisationName}</h2>
        <p className="mt-2 text-sm text-slate-300">
          What DigitalGate understands about your business — identity, people, operations,
          commercial context, knowledge, technology and AI permissions.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3">
            <p className="text-xs text-slate-500">Brain completeness</p>
            <p className={`text-2xl font-bold ${completenessTone(data.completeness)}`}>
              {data.completeness}%
            </p>
            <p className="text-xs text-slate-500">
              {data.readyCount}/{data.totalCount} fields ready
            </p>
          </div>
          {data.twinCompleteness != null ? (
            <Link
              href="/dashboard/twin"
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 hover:opacity-90"
            >
              <p className="text-xs text-blue-300/80">Digital Twin</p>
              <p className="text-2xl font-bold text-blue-200">{data.twinCompleteness}%</p>
              <p className="text-xs text-blue-300/70">Live state →</p>
            </Link>
          ) : null}
          {data.businessHealth != null ? (
            <Link
              href="/dashboard/health"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 hover:opacity-90"
            >
              <p className="text-xs text-emerald-300/80">Business Health</p>
              <p className="text-2xl font-bold text-emerald-300">{data.businessHealth}/100</p>
              <p className="text-xs text-emerald-300/70">View health →</p>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Twin vs Brain
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Your <strong className="font-medium text-white">Digital Twin</strong> is the live
          operating picture — what is happening right now. Your{" "}
          <strong className="font-medium text-white">Business Brain</strong> is what DigitalGate
          understands about who you are, how you operate, and what matters — so Advisor, Insights
          and AI can act with business context, not generic answers.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          What DigitalGate understands
        </h2>
        {data.understandingSummary.length ? (
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            {data.understandingSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Add industry, services, audience and goals on Business Profile.
          </p>
        )}
        <Link href="/dashboard/business" className="mt-4 inline-block text-sm text-sky-400 hover:underline">
          Edit Business Profile →
        </Link>
      </section>

      {data.priorityGaps.length ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-5">
          <h2 className="font-semibold text-amber-100">Improve your Business Brain</h2>
          <p className="mt-1 text-sm text-slate-400">
            Fill these gaps so AI recommendations stay grounded in how your business actually works.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.priorityGaps.map((gap) => (
              <li key={gap.id}>
                <Link
                  href={gap.href}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 hover:border-sky-500/40 hover:text-white"
                >
                  <span>
                    {gap.label}
                    <span className="ml-2 text-[11px] text-slate-500">{gap.dimension}</span>
                  </span>
                  <span className="text-[11px] text-sky-400">
                    {gap.status === "partial" ? "Complete →" : "Add →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Understanding dimensions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Seven dimensions of business understanding — each deepens as you connect profile, apps
            and live data.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.brain.dimensions.map((dimension) => (
            <DimensionCard key={dimension.id} dimension={dimension} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/90">
          Business Knowledge
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          How your business works — plans, SOPs, brand guidelines, policies and approved documents.
          This is private to your organisation and distinct from DigitalGate&apos;s Platform Docs.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center">
          <p className="text-sm font-medium text-white">Your business documents</p>
          <p className="mt-2 text-xs text-slate-500">
            Upload business plans, procedures, handbooks and SOPs so Advisor, Communications and
            Automation understand how you operate.
          </p>
          <Link
            href="/dashboard/business"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Start from Business Profile →
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Knowledge layers
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          AI reasons across these layers with organisation permissions — never as a generic chatbot.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BUSINESS_BRAIN_KNOWLEDGE_LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{layer.label}</p>
              <p className="mt-1 text-xs text-slate-400">{layer.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Connected context
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Live systems feeding the Twin and Brain. Enable more Apps to deepen understanding.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.connectedSources.map((source) => (
            <Link
              key={source.id}
              href={source.href}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-500/40"
            >
              {source.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Intelligence powered by Business Brain
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Brain context flows into every Intelligence surface — not isolated app silos.
        </p>
        <ul className="mt-4 space-y-3">
          {data.intelligenceSurfaces.map((surface) => (
            <li key={surface.label}>
              <Link
                href={surface.href}
                className="group block rounded-lg border border-slate-800 px-4 py-3 hover:border-sky-500/40"
              >
                <p className="font-medium text-white group-hover:text-sky-200">{surface.label}</p>
                <p className="mt-0.5 text-sm text-slate-400">{surface.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <IntelligenceFlow active="Business Brain" />
      <IntelligenceHierarchy active="brain" />

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard/twin"
          className="rounded-full bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
        >
          View Digital Twin →
        </Link>
        <Link href="/dashboard/advisor" className="font-medium text-sky-400 hover:text-white">
          Open AI Advisor →
        </Link>
        <Link href="/apps/analytics" className="font-medium text-sky-400 hover:text-white">
          Open Analytics →
        </Link>
      </div>
    </div>
  );
}
