import Link from "next/link";
import type { EnrichedCommandClient } from "@dg/platform-core";
import {
  clientInterventionTierLabel,
  interventionWhy,
  recommendIntervention,
} from "@dg/platform-core";

export function AttentionInterventionCards({
  clients,
  emptyMessage = "No organisations currently flagged for attention.",
}: {
  clients: EnrichedCommandClient[];
  emptyMessage?: string;
}) {
  if (clients.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <div
          key={client.organisationId}
          className="rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-amber-300">
                🟠{" "}
                <Link
                  href={`/command/clients/${client.organisationId}`}
                  className="text-white hover:text-sky-300"
                >
                  {client.organisationName}
                  {client.isInternalOrg ? (
                    <span className="ml-1.5 text-xs font-normal text-sky-400/90">
                      · Internal
                    </span>
                  ) : null}
                </Link>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Success Score™ {client.successScore} · {clientInterventionTierLabel(client)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                <span className="text-slate-500">Why: </span>
                {interventionWhy(client)}
              </p>
              <p className="mt-2 text-sm text-sky-200/90">
                <span className="text-slate-500">Recommended action: </span>
                {recommendIntervention(client)}
              </p>
            </div>
            <div className="shrink-0 whitespace-nowrap text-sm">
              <Link
                href={`/command/clients/${client.organisationId}`}
                className="text-sky-400 hover:underline"
              >
                Open →
              </Link>
              <span className="mx-1.5 text-slate-600">·</span>
              <Link
                href={`/command/advisor?org=${client.organisationId}`}
                className="text-sky-400 hover:underline"
              >
                Advise →
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
