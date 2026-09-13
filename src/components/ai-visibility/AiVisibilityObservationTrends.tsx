import type { AiVisibilityObservationEvidence } from "@dg/platform-core";

type Period = {
  label: string;
  observations: AiVisibilityObservationEvidence[];
};

function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function seriesKey(item: AiVisibilityObservationEvidence) {
  return `${item.prompt.id}::${item.engine}::${item.engineModel ?? ""}`;
}

function latestBySeries(observations: AiVisibilityObservationEvidence[]) {
  const latest = new Map<string, AiVisibilityObservationEvidence>();
  for (const item of observations) {
    const key = seriesKey(item);
    const existing = latest.get(key);
    if (!existing || new Date(item.observedAt).getTime() > new Date(existing.observedAt).getTime()) {
      latest.set(key, item);
    }
  }
  return latest;
}

function summarise(period: Period) {
  const total = period.observations.length;
  const mentioned = period.observations.filter((item) => item.brandMentioned).length;
  const competitorComplete = period.observations.filter((item) => item.competitorCaptureComplete === true);
  const competitorMentions = competitorComplete.flatMap((item) => item.competitorMentions).filter((item) => item.mentioned).length;

  return {
    label: period.label,
    total,
    presence: total ? Math.round((mentioned / total) * 100) : null,
    competitorComplete: competitorComplete.length,
    competitorMentions,
  };
}

export function AiVisibilityObservationTrends({
  observations,
  activePromptIds,
}: {
  observations: AiVisibilityObservationEvidence[];
  activePromptIds: string[];
}) {
  const activePromptSet = new Set(activePromptIds);
  const activeObservations = observations.filter((item) => activePromptSet.has(item.prompt.id));
  if (activeObservations.length < 2) return null;

  const newest = new Date(activeObservations[0].observedAt);
  const newestDay = startOfUtcDay(newest);
  const recentCutoff = newestDay - 6 * 24 * 60 * 60 * 1000;
  const previousCutoff = recentCutoff - 7 * 24 * 60 * 60 * 1000;

  const recentSeries = latestBySeries(
    activeObservations.filter((item) => startOfUtcDay(new Date(item.observedAt)) >= recentCutoff),
  );
  const previousSeries = latestBySeries(
    activeObservations.filter((item) => {
      const day = startOfUtcDay(new Date(item.observedAt));
      return day >= previousCutoff && day < recentCutoff;
    }),
  );
  const comparableKeys = [...recentSeries.keys()].filter((key) => previousSeries.has(key));

  const recent = summarise({
    label: "Latest 7 days",
    observations: comparableKeys.flatMap((key) => {
      const item = recentSeries.get(key);
      return item ? [item] : [];
    }),
  });
  const previous = summarise({
    label: "Previous 7 days",
    observations: comparableKeys.flatMap((key) => {
      const item = previousSeries.get(key);
      return item ? [item] : [];
    }),
  });

  const delta = recent.presence != null && previous.presence != null ? recent.presence - previous.presence : null;
  const deltaLabel = delta == null ? "Comparable history needed" : delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} pts`;

  return (
    <section className="dg-card border-violet-500/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Evidence trend</p>
          <h2 className="mt-1 font-semibold text-white">AI Presence over time</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Compares active governed prompts using one latest observation per prompt/provider-model series in each period. Only series present in both periods contribute to the movement shown.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-800 px-2.5 py-1 text-xs text-slate-400">{deltaLabel}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[recent, previous].map((period) => (
          <div key={period.label} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
            <p className="text-xs font-medium text-slate-500">{period.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-semibold text-white">{period.presence == null ? "—" : `${period.presence}%`}</span>
              <span className="pb-1 text-xs text-slate-500">AI Presence</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {period.total} comparable series
              {period.competitorComplete ? ` · ${period.competitorMentions} configured competitor mention${period.competitorMentions === 1 ? "" : "s"}` : " · competitor comparison unavailable"}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {comparableKeys.length
          ? `${comparableKeys.length} active prompt/provider-model series are comparable across both periods. `
          : "No active prompt/provider-model series has evidence in both periods yet. "}
        Trend values reflect the recorded observation surface and provider/model provenance in the evidence ledger. They are not consumer-interface rankings unless that surface was explicitly captured.
      </p>
    </section>
  );
}
