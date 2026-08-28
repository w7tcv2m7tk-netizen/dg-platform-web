import type { AgencyHealthTier } from "@dg/platform-core";
import { tierLabel } from "@dg/platform-core";

const TIER_STYLES: Record<string, string> = {
  top_performer: "bg-emerald-500/15 text-emerald-300",
  healthy: "bg-emerald-500/15 text-emerald-300",
  needs_attention: "bg-amber-500/15 text-amber-200",
  at_risk: "bg-red-500/15 text-red-300",
  critical: "bg-red-500/20 text-red-200",
  provisional: "bg-slate-500/15 text-slate-300",
};

const KNOWN_TIERS = new Set([
  "top_performer",
  "healthy",
  "needs_attention",
  "at_risk",
  "critical",
]);

export function TierBadge({ tier }: { tier: AgencyHealthTier | string }) {
  const label =
    tier === "provisional"
      ? "Provisional"
      : KNOWN_TIERS.has(tier)
        ? tierLabel(tier as AgencyHealthTier)
        : tier;
  const cls = TIER_STYLES[tier] ?? "bg-slate-500/15 text-slate-300";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ScoreTierBadge({
  tier,
  emoji,
}: {
  tier: AgencyHealthTier | "provisional" | string;
  emoji?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {emoji ? <span aria-hidden>{emoji}</span> : null}
      <TierBadge tier={tier} />
    </span>
  );
}

export function ScoreCell({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-300"
      : score >= 65
        ? "text-emerald-300/90"
        : score >= 50
          ? "text-amber-300"
          : score >= 30
            ? "text-red-300"
            : "text-red-400";
  return <span className={`font-semibold tabular-nums ${color}`}>{score}</span>;
}
