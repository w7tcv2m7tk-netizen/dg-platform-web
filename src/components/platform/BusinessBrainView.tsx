import Link from "next/link";

import type { BusinessBrainSnapshot } from "@dg/platform-core";

const STATUS: Record<string, string> = {
  ready: "text-emerald-300",
  partial: "text-amber-200",
  missing: "text-slate-500",
};

export function BusinessBrainView({ brain }: { brain: BusinessBrainSnapshot }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-xl border border-sky-700/40 bg-sky-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Digital Business Brain
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          What DigitalGate AI knows about {brain.organisationName}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          This is the customer knowledge corpus — not a generic knowledge base. Twin is live
          operating state. Brain is identity, people, operations, commercial, knowledge, technology
          and AI instructions that Advisor, Communications, CRM and Automation read.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Coverage</span>
            <span className="font-semibold text-white">
              {brain.percent}% · {brain.readyCount}/{brain.totalCount}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${brain.percent}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {brain.dimensions.map((dim) => (
          <div
            key={dim.id}
            className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{dim.name}</p>
                <p className="mt-1 text-xs text-slate-400">{dim.summary}</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-sky-300">{dim.percent}%</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {dim.fields.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-2 text-sm hover:text-white"
                  >
                    <span className={STATUS[item.status]}>
                      {item.status === "ready" ? "✅" : "🔲"} {item.label}
                    </span>
                    {item.value ? (
                      <span className="max-w-[10rem] truncate text-xs text-slate-500">
                        {item.value}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Used across the platform</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {brain.surfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3 hover:border-slate-500"
            >
              <p className="text-sm font-medium text-white">{surface.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{surface.uses}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
