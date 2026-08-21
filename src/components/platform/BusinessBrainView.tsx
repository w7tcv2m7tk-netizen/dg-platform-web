import Link from "next/link";

import {
  BUSINESS_BRAIN_CONNECTED_SOURCES,
  BUSINESS_BRAIN_KNOWLEDGE_LAYERS,
  type BusinessBrainSnapshot,
} from "@dg/platform-core";

const STATUS: Record<string, string> = {
  ready: "text-emerald-300",
  partial: "text-amber-200",
  missing: "text-slate-500",
};

export function BusinessBrainView({ brain }: { brain: BusinessBrainSnapshot }) {
  const missing = brain.dimensions.flatMap((dim) =>
    dim.fields
      .filter((f) => f.status === "missing" || f.status === "partial")
      .map((f) => ({ ...f, dimension: dim.name })),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-xl border border-sky-700/40 bg-sky-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Business Brain™
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          What DigitalGate knows about {brain.organisationName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The intelligence layer on your connected business — Digital Twin awareness, business
          knowledge, goals and live activity — so Advisor, Command Centre and Communications can
          recommend what matters next. You should not need to understand how the retrieval works.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Business Brain readiness</span>
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

      {missing.length > 0 ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-amber-100">Improve your Business Brain</h2>
          <p className="mt-1 text-xs text-slate-400">
            Fill the gaps below so AI recommendations stay grounded in how your business actually
            works.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {missing.slice(0, 8).map((item) => (
              <li key={`${item.dimension}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 hover:border-sky-500/40 hover:text-white"
                >
                  <span>
                    {item.label}
                    <span className="ml-2 text-[11px] text-slate-500">{item.dimension}</span>
                  </span>
                  <span className="text-[11px] text-sky-400">Add →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-base font-semibold text-white">Business understanding</h2>
        <p className="mt-1 text-sm text-slate-400">
          What DigitalGate understands about your business across seven dimensions.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                        {item.status === "ready" ? "●" : item.status === "partial" ? "◐" : "○"}{" "}
                        {item.label}
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
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Connected context</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live systems feeding the Twin and Brain. Activate more Apps to deepen understanding.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BUSINESS_BRAIN_CONNECTED_SOURCES.map((source) => (
            <Link
              key={source.id}
              href={source.href}
              className="rounded-full border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-white"
            >
              {source.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Knowledge layers</h2>
        <p className="mt-1 text-sm text-slate-400">
          AI reasons across these layers with organisation and user permissions — never as a
          generic chatbot.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {BUSINESS_BRAIN_KNOWLEDGE_LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{layer.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{layer.summary}</p>
            </div>
          ))}
        </div>
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
