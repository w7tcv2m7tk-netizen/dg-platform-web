import Link from "next/link";

import type { ReBetaReadiness } from "@dg/platform-core";

export function ReBetaChecklist({ readiness }: { readiness: ReBetaReadiness }) {
  const allDone = readiness.completedCount === readiness.totalCount;

  return (
    <section className="dg-card border border-sky-500/20 bg-sky-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-400/90">
            Getting started
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Real Estate beta checklist
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDone
              ? "You’re set — run your first full vendor → appraisal → listing path."
              : `${readiness.completedCount} of ${readiness.totalCount} steps complete. Finish these before inviting the whole agency.`}
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

      {!readiness.connectorConfigured ? (
        <p className="mt-4 text-xs text-amber-200/90">
          Public property-report capture still runs on WordPress — connect the site so leads land
          here automatically.
        </p>
      ) : null}
    </section>
  );
}

export function ReBetaGateMessage() {
  return (
    <div className="dg-card border border-amber-500/30 bg-amber-500/5">
      <h2 className="text-lg font-semibold text-white">Real Estate beta</h2>
      <p className="mt-2 text-sm text-slate-300">
        This organisation isn’t enrolled in the Real Estate beta yet. Ask DigitalGate to enable{" "}
        <code className="text-amber-200">re.beta</code> in Command Centre, or create a new business
        with the Real Estate template.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/dashboard/business"
          className="text-sm text-sky-400 hover:underline"
        >
          Business Profile →
        </Link>
        <Link
          href="/dashboard/apps"
          className="text-sm text-sky-400 hover:underline"
        >
          Apps & Plan →
        </Link>
      </div>
    </div>
  );
}
