import Link from "next/link";
import type { AgencyHealthTier } from "@dg/platform-core";

import { ScoreCell, ScoreTierBadge } from "@/components/command/tier-badge";

export type OperatorOrgRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug?: string;
  /** Shown under org name — e.g. slug or "Internal" for operator org */
  organisationMeta?: string | null;
  isInternalOrg?: boolean;
  successScore?: number;
  scoreTier?: AgencyHealthTier | "provisional" | string;
  scoreTierEmoji?: string;
  rank?: number;
  observedSignal?: string;
  /** @deprecated use observedSignal */
  highlights?: string[];
  /** @deprecated use observedSignal */
  attentionReasons?: string[];
  /** @deprecated use observedSignal */
  detail?: string;
};

function headerHint(label: string, hint: string) {
  return (
    <th className="px-4 py-3 font-medium">
      <span className="block">{label}</span>
      <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-600">
        {hint}
      </span>
    </th>
  );
}

export function OperatorOrgTable({
  rows,
  emptyMessage = "No organisations match this view.",
  showScore = true,
  showTier = true,
  showRank = false,
  secondaryLabel = "Signal",
  secondaryHint = "What DigitalGate has observed",
}: {
  rows: OperatorOrgRow[];
  emptyMessage?: string;
  showScore?: boolean;
  showTier?: boolean;
  showRank?: boolean;
  secondaryLabel?: string;
  secondaryHint?: string;
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
            {showScore
              ? headerHint("Score", "Quantitative Success Score™")
              : null}
            {showTier ? headerHint("Tier", "Score classification") : null}
            {headerHint(secondaryLabel, secondaryHint)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row) => {
            const signal =
              row.observedSignal ??
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
                    {row.isInternalOrg ? (
                      <span className="ml-1.5 text-xs font-normal text-sky-400/90">
                        · Internal
                      </span>
                    ) : null}
                  </Link>
                  {(row.organisationMeta ?? row.organisationSlug) &&
                  !row.isInternalOrg ? (
                    <p className="text-xs text-slate-500">
                      {row.organisationMeta ?? row.organisationSlug}
                    </p>
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
                    {row.scoreTier ? (
                      <ScoreTierBadge tier={row.scoreTier} emoji={row.scoreTierEmoji} />
                    ) : (
                      "—"
                    )}
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
