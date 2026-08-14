import {
  getCommerciallyReadyV1Summary,
  getRoadmapSummary,
} from "@dg/platform-core";

function ProgressRow({
  label,
  percent,
  detail,
  primary,
}: {
  label: string;
  percent: number;
  detail: string;
  primary?: boolean;
}) {
  return (
    <div className={primary ? undefined : "mt-4"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {!primary ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">
              Full backlog
            </p>
          ) : null}
          <p
            className={
              primary
                ? "text-sm font-semibold text-white"
                : "mt-0.5 text-xs font-medium text-slate-400"
            }
          >
            {label}
          </p>
        </div>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <div
        className={`mt-2 overflow-hidden rounded-full bg-slate-800 ${primary ? "h-2.5" : "h-1.5"}`}
      >
        <div
          className={
            primary
              ? "h-full rounded-full bg-gradient-to-r from-emerald-600 via-blue-500 to-amber-500 transition-all duration-500"
              : "h-full rounded-full bg-slate-600 transition-all duration-500"
          }
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export function PlatformRoadmapBar() {
  const crv1 = getCommerciallyReadyV1Summary();
  const gen2 = getRoadmapSummary();

  return (
    <div className="border-b border-slate-800/80 bg-slate-950/80 px-8 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Roadmap
      </p>
      <ProgressRow
        primary
        label={crv1.label}
        percent={crv1.percentComplete}
        detail={`${crv1.done} done · ${crv1.inProgress} in progress · ${crv1.scaffold} scaffold · ${crv1.planned} planned`}
      />
      <ProgressRow
        label={gen2.label}
        percent={gen2.percentComplete}
        detail={`${gen2.done} done · ${gen2.inProgress} in progress · ${gen2.total} items`}
      />
      <p className="mt-2 text-[11px] text-slate-600">
        Primary bar = Commercially Ready v1 (founding path). Secondary = full Gen 2 including
        later Industry Apps.
      </p>
    </div>
  );
}
