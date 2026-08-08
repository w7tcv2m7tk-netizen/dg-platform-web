import type { AgencyHealthTier } from "@dg/platform-core";
import { tierLabel } from "@dg/platform-core";

export function TierBadge({ tier }: { tier: AgencyHealthTier | string }) {
  const label =
    tier === "top_performer" || tier === "healthy" || tier === "needs_attention"
      ? tierLabel(tier)
      : tier;
  const cls =
    tier === "top_performer"
      ? "bg-emerald-500/15 text-emerald-300"
      : tier === "healthy"
        ? "bg-sky-500/15 text-sky-300"
        : "bg-amber-500/15 text-amber-200";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ScoreCell({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-emerald-300" : score >= 70 ? "text-sky-300" : "text-amber-300";
  return <span className={`font-semibold tabular-nums ${color}`}>{score}</span>;
}
