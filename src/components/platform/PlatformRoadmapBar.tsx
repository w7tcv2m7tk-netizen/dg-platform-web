import { getRoadmapSummary } from "@dg/platform-core";

export function PlatformRoadmapBar() {
  const summary = getRoadmapSummary();

  return (
    <div className="border-b border-slate-800/80 bg-slate-950/80 px-8 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Roadmap
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">{summary.label}</p>
        </div>
        <p className="text-xs text-slate-500">
          {summary.done} done · {summary.inProgress} in progress · {summary.scaffold}{" "}
          scaffold · {summary.planned} planned
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-blue-500 to-amber-500 transition-all duration-500"
          style={{ width: `${summary.percentComplete}%` }}
          role="progressbar"
          aria-valuenow={summary.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Platform ${summary.percentComplete}% complete`}
        />
      </div>
    </div>
  );
}
