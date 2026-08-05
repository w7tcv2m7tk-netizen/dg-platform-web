import type { RoadmapStatus } from "@dg/platform-core";
import { roadmapStatusLabel } from "@dg/platform-core";

const STYLES: Record<RoadmapStatus, string> = {
  done: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  scaffold: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  planned: "bg-slate-700/80 text-slate-400 ring-slate-600/40",
};

export function RoadmapStatusBadge({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {roadmapStatusLabel(status)}
    </span>
  );
}
