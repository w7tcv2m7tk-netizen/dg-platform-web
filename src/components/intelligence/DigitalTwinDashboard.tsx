import Link from "next/link";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import type { DigitalTwinDashboardBundle, TwinLayer } from "@dg/platform-core";

function completenessTone(value: number) {
  if (value >= 75) return "text-emerald-400";
  if (value >= 55) return "text-sky-400";
  return "text-amber-300";
}

function statusClass(status: "live" | "partial" | "offline") {
  if (status === "live") return "text-emerald-400";
  if (status === "partial") return "text-amber-300";
  return "text-slate-500";
}

function LayerCard({ layer }: { layer: TwinLayer }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            {layer.icon} {layer.label}
          </p>
          <p className="mt-1 text-sm text-slate-400">{layer.summary}</p>
        </div>
        <p className={`text-2xl font-bold ${completenessTone(layer.completeness)}`}>
          {layer.completeness}%
        </p>
      </div>

      {layer.signals.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {layer.signals.map((signal) =>
            signal.href ? (
              <Link
                key={`${layer.id}-${signal.label}`}
                href={signal.href}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 hover:border-sky-500/40"
              >
                <p className="text-xs text-slate-500">{signal.label}</p>
                <p className="mt-0.5 text-sm font-medium text-white">{signal.value}</p>
              </Link>
            ) : (
              <div
                key={`${layer.id}-${signal.label}`}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <p className="text-xs text-slate-500">{signal.label}</p>
                <p className="mt-0.5 text-sm font-medium text-white">{signal.value}</p>
              </div>
            ),
          )}
        </div>
      ) : null}

      {layer.gaps.length ? (
        <ul className="mt-4 space-y-1 text-xs text-amber-200/80">
          {layer.gaps.map((gap) => (
            <li key={gap}>· {gap}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function DigitalTwinDashboard({ data }: { data: DigitalTwinDashboardBundle }) {
  return (
    <div className="space-y-6">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Twin preview — connect CRM, website, and finance systems to deepen your live digital
          state.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-300/90">
          Digital Twin™
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{data.organisationName}</h2>
            {data.tagline ? (
              <p className="mt-1 text-sm text-slate-300">{data.tagline}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                The live digital state of your business — what is happening right now.
              </p>
            )}
            {data.capturedAtLabel ? (
              <p className="mt-2 text-xs text-slate-500">Last captured {data.capturedAtLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 text-right">
              <p className="text-xs text-slate-500">Twin completeness</p>
              <p className={`text-2xl font-bold ${completenessTone(data.overallCompleteness)}`}>
                {data.overallCompleteness}%
              </p>
            </div>
            {data.businessHealth != null ? (
              <Link
                href="/dashboard/health"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right hover:opacity-90"
              >
                <p className="text-xs text-emerald-300/80">Business Health</p>
                <p className="text-2xl font-bold text-emerald-300">{data.businessHealth}/100</p>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          What the Twin knows
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Business Profile is what you edit. The Twin is the live operating picture DigitalGate and
          AI read right now.
        </p>
        {data.contextSummary.length ? (
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            {data.contextSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Add industry, services, and audience on Business Profile.
          </p>
        )}
        <Link href="/dashboard/business" className="mt-4 inline-block text-sm text-sky-400 hover:underline">
          Edit Business Profile →
        </Link>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Twin layers
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Identity, commercial, operations, digital presence, and intelligence — each layer
            deepens as you connect more of the business.
          </p>
        </div>
        {data.layers.map((layer) => (
          <LayerCard key={layer.id} layer={layer} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Connected systems
          </h2>
          <ul className="mt-4 space-y-2">
            {data.connectedSystems.map((system) => (
              <li
                key={system.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span className="text-white">{system.label}</span>
                <span className={`text-xs capitalize ${statusClass(system.status)}`}>
                  {system.status}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/settings/connectors"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Manage connectors →
          </Link>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Operating apps
          </h2>
          {data.enabledApps.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.enabledApps.map((app) => (
                <li
                  key={app.id}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  {app.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No apps enabled yet.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Intelligence powered by this Twin
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Scores, health, benchmarks, and Advisor recommendations are generated from this state —
          not isolated app silos.
        </p>
        <ul className="mt-4 space-y-3">
          {data.intelligenceSurfaces.map((surface) => (
            <li key={surface.label}>
              <Link href={surface.href} className="group block rounded-lg border border-slate-800 px-4 py-3 hover:border-sky-500/40">
                <p className="font-medium text-white group-hover:text-sky-200">{surface.label}</p>
                <p className="mt-0.5 text-sm text-slate-400">{surface.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {data.recentActivity.length ? (
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent activity
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="flex gap-3 border-b border-slate-800/80 py-2 last:border-0">
                <span className="w-16 shrink-0 text-xs text-slate-500">{entry.timeLabel}</span>
                <span className="text-slate-300">{entry.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <IntelligenceFlow active="Digital Twin" />
      <IntelligenceHierarchy active="twin" />

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard/brain"
          className="rounded-full bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
        >
          Explore Business Brain →
        </Link>
        <Link href="/dashboard/advisor" className="font-medium text-sky-400 hover:text-white">
          Open AI Advisor →
        </Link>
        <Link href="/dashboard" className="font-medium text-sky-400 hover:text-white">
          Open Command Centre →
        </Link>
      </div>
    </div>
  );
}
