import Link from "next/link";

import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";

export type DigitalPerformanceSignal = {
  id: "website_operations" | "seo" | "ai_visibility" | "analytics";
  label: string;
  value: string;
  detail: string;
  href: string;
  state: "live" | "stale" | "unavailable";
};

type GrowthSummaryCard = {
  id: string;
  appId: string;
  label: string;
  value: string;
  detail: string;
  href: string;
  state: DigitalPerformanceSignal["state"];
};

const GROWTH_APP_ORDER = [
  "seo",
  "ai-visibility",
  "reviews",
  "analytics",
  "automation",
  "prospecting",
  "social",
] as const;

function stateClasses(state: DigitalPerformanceSignal["state"]) {
  if (state === "live") {
    return {
      border: "border-emerald-500/25 hover:border-emerald-400/45",
      badge: "bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
      label: "Live",
    };
  }
  if (state === "stale") {
    return {
      border: "border-amber-500/25 hover:border-amber-400/45",
      badge: "bg-amber-500/10 text-amber-300",
      dot: "bg-amber-400",
      label: "Refresh due",
    };
  }
  return {
    border: "border-slate-800 hover:border-sky-500/40",
    badge: "bg-slate-800/80 text-slate-400",
    dot: "bg-slate-500",
    label: "Needs data",
  };
}

function actionLabel(card: GrowthSummaryCard) {
  if (card.state === "stale") return "Refresh now →";
  if (card.state === "unavailable") return "Fix missing data →";
  return `Open ${card.label} →`;
}

function fallbackGrowthCard(appId: string): GrowthSummaryCard | null {
  if (appId === "reviews") {
    return {
      id: "reviews",
      appId,
      label: "Reputation",
      value: "Awaiting review data",
      detail: "Reputation Score™ appears here once connected review evidence is available.",
      href: "/apps/reviews",
      state: "unavailable",
    };
  }
  if (appId === "automation") {
    return {
      id: "automation",
      appId,
      label: "Automation",
      value: "Awaiting run data",
      detail: "Automation health will summarise supported workflow activity and failures when measured evidence is available.",
      href: "/apps/automation",
      state: "unavailable",
    };
  }
  if (appId === "prospecting") {
    return {
      id: "prospecting",
      appId,
      label: "Prospecting",
      value: "Awaiting opportunity data",
      detail: "Qualified prospect and opportunity evidence will become the executive summary for this Growth App.",
      href: "/apps/prospecting",
      state: "unavailable",
    };
  }
  if (appId === "social") {
    return {
      id: "social",
      appId,
      label: "Social",
      value: "Awaiting activity data",
      detail: "This card stays evidence-led while publishing remains closed beta; no synthetic engagement score is shown.",
      href: "/apps/social",
      state: "unavailable",
    };
  }
  return null;
}

function signalAppId(signal: DigitalPerformanceSignal): string | null {
  if (signal.id === "seo") return "seo";
  if (signal.id === "ai_visibility") return "ai-visibility";
  if (signal.id === "analytics") return "analytics";
  return null;
}

function ScoreCard({ card }: { card: GrowthSummaryCard }) {
  const styles = stateClasses(card.state);
  return (
    <Link
      href={card.href}
      className={`group rounded-2xl border bg-slate-950/45 px-4 py-4 transition ${styles.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {card.label}
        </p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${styles.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {styles.label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{card.value}</p>
      <p className="mt-2 min-h-10 text-xs leading-relaxed text-slate-500">{card.detail}</p>
      <p className={`mt-3 text-xs font-semibold transition group-hover:text-white ${card.state === "live" ? "text-sky-400" : "text-amber-300"}`}>
        {actionLabel(card)}
      </p>
    </Link>
  );
}

export async function DigitalPerformanceStrip({
  signals,
  reputation,
  social,
  prospecting,
}: {
  signals: DigitalPerformanceSignal[];
  reputation?: { score: number | null; reviewCount: number };
  social?: { connected: boolean; activityCount: number };
  prospecting?: { openOpportunityCount: number };
}) {
  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const enabled = new Set(enabledAppIds);

  const measuredByApp = new Map<string, GrowthSummaryCard>();
  for (const signal of signals) {
    const appId = signalAppId(signal);
    if (!appId || !enabled.has(appId)) continue;
    measuredByApp.set(appId, {
      id: signal.id,
      appId,
      label: signal.label === "Web Analytics" ? "Analytics" : signal.label,
      value: signal.value,
      detail: signal.detail,
      href: signal.href,
      state: signal.state,
    });
  }

  if (enabled.has("reviews") && reputation && reputation.reviewCount > 0) {
    measuredByApp.set("reviews", {
      id: "reviews",
      appId: "reviews",
      label: "Reputation",
      value: reputation.score == null ? `${reputation.reviewCount} reviews` : `${reputation.score} / 100`,
      detail: `${reputation.reviewCount} connected review${reputation.reviewCount === 1 ? "" : "s"} contributing live reputation evidence.`,
      href: "/apps/reviews",
      state: "live",
    });
  }
  if (enabled.has("social") && social?.connected) {
    measuredByApp.set("social", {
      id: "social",
      appId: "social",
      label: "Social",
      value: social.activityCount > 0 ? `${social.activityCount} recent activities` : "Connected",
      detail: social.activityCount > 0
        ? "Live authorised social evidence is contributing to your Business Brain."
        : "A social account is authorised and connected; activity will appear as it is measured.",
      href: "/apps/social",
      state: "live",
    });
  }
  if (enabled.has("prospecting") && prospecting && prospecting.openOpportunityCount > 0) {
    measuredByApp.set("prospecting", {
      id: "prospecting",
      appId: "prospecting",
      label: "Prospecting",
      value: `${prospecting.openOpportunityCount} open opportunit${prospecting.openOpportunityCount === 1 ? "y" : "ies"}`,
      detail: "Live CRM opportunity evidence is available for prospecting and pipeline decisions.",
      href: "/apps/prospecting",
      state: "live",
    });
  }

  const growthCards = GROWTH_APP_ORDER.flatMap((appId) => {
    if (!enabled.has(appId)) return [];
    const measured = measuredByApp.get(appId);
    if (measured) return [measured];
    const fallback = fallbackGrowthCard(appId);
    return fallback ? [fallback] : [];
  });

  const websiteSignal = enabled.has("websites")
    ? signals.find((signal) => signal.id === "website_operations")
    : null;

  if (!growthCards.length && !websiteSignal) return null;

  return (
    <div className="mb-7 space-y-5">
      {growthCards.length ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                Growth performance
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Your subscribed Growth Apps</h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                DigitalGate shows measured performance where evidence exists. When data is stale or missing,
                the card becomes the direct route to refresh or fix it rather than a dead-end warning.
              </p>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {growthCards.length} subscribed
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {growthCards.map((card) => <ScoreCard key={card.id} card={card} />)}
          </div>
        </section>
      ) : null}

      {websiteSignal ? (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/25 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Digital infrastructure</p>
              <p className="mt-1 text-sm font-medium text-white">Website Operations</p>
              <p className="mt-1 text-xs text-slate-500">{websiteSignal.detail}</p>
            </div>
            <Link
              href={websiteSignal.href}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${websiteSignal.state === "live" ? "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-sky-500/40" : "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/50"}`}
            >
              {websiteSignal.state === "live"
                ? `${websiteSignal.value} · View →`
                : websiteSignal.state === "stale"
                  ? "Refresh website check →"
                  : "Fix website data →"}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
