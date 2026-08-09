import Link from "next/link";

import type { InfraDomainsBetaReadiness } from "@dg/platform-core";

export function InfraDomainsBetaChecklist({
  readiness,
}: {
  readiness: InfraDomainsBetaReadiness;
}) {
  const allDone = readiness.completedCount === readiness.totalCount;

  return (
    <section className="mb-6 rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
            Closed beta
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Domains checklist
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDone
              ? "Pilot-ready — search → connect/register → Apply DNS → Make it live."
              : `${readiness.completedCount} of ${readiness.totalCount} steps. Hosting / mailbox / monitoring are out of beta.`}
          </p>
          {readiness.providerConfigured ? (
            <p className="mt-2 text-xs text-slate-500">
              API: {readiness.isSandbox ? "sandbox" : "production"} ·{" "}
              <span className="text-slate-400">{readiness.soapHost}</span>
            </p>
          ) : null}
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
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-slate-500">
        Paid register needs{" "}
        <code className="text-slate-400">infra.domain_register</code> separately.
        Playbook:{" "}
        <code className="text-slate-400">docs/INFRASTRUCTURE-BETA-LAUNCH.md</code>
      </p>
    </section>
  );
}
