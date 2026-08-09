import Link from "next/link";

import type { WebsitesBetaReadiness } from "@dg/platform-core";

export function WebsitesBetaChecklist({
  readiness,
}: {
  readiness: WebsitesBetaReadiness;
}) {
  const allDone = readiness.completedCount === readiness.totalCount;

  return (
    <section className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-400/90">
            Closed beta
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Website Builder checklist
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDone
              ? "Pilot-ready — generate → Studio → publish → Domains go-live."
              : `${readiness.completedCount} of ${readiness.totalCount} steps. Core path: create site → Studio → preview/publish → Domains.`}
          </p>
        </div>
        {readiness.readyForPilot ? (
          <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Pilot-ready
          </span>
        ) : (
          <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
            Setup in progress
          </span>
        )}
      </div>

      <ol className="mt-5 space-y-2">
        {readiness.items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 transition hover:border-slate-600"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  item.done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-800 text-slate-500"
                }`}
                aria-hidden
              >
                {item.done ? "✓" : "·"}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${
                    item.done ? "text-slate-400 line-through" : "text-white"
                  }`}
                >
                  {item.label}
                </span>
                {!item.done ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {item.hint}
                  </span>
                ) : null}
              </span>
              {!item.done ? (
                <span className="shrink-0 text-xs text-sky-400">Open →</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-slate-500">
        WP import converts pages/content into Studio blocks — not Elementor/theme
        layouts. Playbook:{" "}
        <code className="text-slate-400">docs/WEBSITES-BETA-LAUNCH.md</code>
      </p>
    </section>
  );
}
