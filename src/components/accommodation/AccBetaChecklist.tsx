import Link from "next/link";

import type { AccBetaReadiness } from "@dg/platform-core";

export function AccBetaChecklist({ readiness }: { readiness: AccBetaReadiness }) {
  const allDone = readiness.completedCount === readiness.totalCount;

  return (
    <section className="dg-card border border-teal-500/20 bg-teal-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-400/90">
            Getting started
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Accommodation beta checklist
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDone
              ? "You’re set — run units → availability → bookings → housekeeping for a live stay."
              : `${readiness.completedCount} of ${readiness.totalCount} steps complete. Finish these before inviting the whole ops team.`}
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
                <span className="shrink-0 text-xs text-teal-400">Open →</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>

      {!readiness.connectorConfigured ? (
        <p className="mt-4 text-xs text-amber-200/90">
          Public book-now and guest Stripe stay on WordPress — connect the site so units and stays
          land here for ops. Paste Airbnb/Booking.com <em>import</em> iCal URLs on Units; paste the
          DigitalGate <em>export</em> URL into each OTA (never OTA↔OTA).
        </p>
      ) : null}
    </section>
  );
}

export function AccBetaGateMessage() {
  return (
    <div className="dg-card border border-amber-500/30 bg-amber-500/5">
      <h2 className="text-lg font-semibold text-white">Accommodation beta</h2>
      <p className="mt-2 text-sm text-slate-300">
        This organisation isn’t enrolled in the Accommodation beta yet. Ask DigitalGate to use{" "}
        <strong className="font-medium text-amber-100">Enable Acc beta</strong> on Command Centre →
        Clients (installs the app + sets{" "}
        <code className="text-amber-200">acc.beta</code>), or create a new business with the
        Accommodation template. Flags-only may hide the app until the install runs.
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
