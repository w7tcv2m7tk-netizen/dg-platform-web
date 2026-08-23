import Link from "next/link";
import type { AgencyHealthTier } from "@dg/platform-core";

import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

export type OperatorOrgRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug?: string;
  successScore?: number;
  healthTier?: AgencyHealthTier | string;
  rank?: number;
  highlights?: string[];
  attentionReasons?: string[];
  detail?: string;
};

export function OperatorOrgTable({
  rows,
  emptyMessage = "No organisations match this view.",
  showScore = true,
  showTier = true,
  showRank = false,
  secondaryLabel = "Signal",
}: {
  rows: OperatorOrgRow[];
  emptyMessage?: string;
  showScore?: boolean;
  showTier?: boolean;
  showRank?: boolean;
  secondaryLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/80">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {showRank ? <th className="px-4 py-3 font-medium">#</th> : null}
            <th className="px-4 py-3 font-medium">Organisation</th>
            {showScore ? <th className="px-4 py-3 font-medium">Score</th> : null}
            {showTier ? <th className="px-4 py-3 font-medium">Tier</th> : null}
            <th className="px-4 py-3 font-medium">{secondaryLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row) => {
            const signal =
              row.detail ??
              (row.attentionReasons?.length
                ? row.attentionReasons.slice(0, 2).join(" · ")
                : row.highlights?.slice(0, 2).join(" · ")) ??
              "—";
            return (
              <tr key={row.organisationId} className="hover:bg-slate-900/40">
                {showRank ? (
                  <td className="px-4 py-3 tabular-nums text-slate-500">{row.rank ?? "—"}</td>
                ) : null}
                <td className="px-4 py-3">
                  <Link
                    href={`/command/clients/${row.organisationId}`}
                    className="font-medium text-white hover:text-sky-300"
                  >
                    {row.organisationName}
                  </Link>
                  {row.organisationSlug ? (
                    <p className="text-xs text-slate-500">{row.organisationSlug}</p>
                  ) : null}
                </td>
                {showScore ? (
                  <td className="px-4 py-3">
                    {typeof row.successScore === "number" ? (
                      <ScoreCell score={row.successScore} />
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
                {showTier ? (
                  <td className="px-4 py-3">
                    {row.healthTier ? <TierBadge tier={row.healthTier} /> : "—"}
                  </td>
                ) : null}
                <td className="max-w-md px-4 py-3 text-slate-400">{signal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
