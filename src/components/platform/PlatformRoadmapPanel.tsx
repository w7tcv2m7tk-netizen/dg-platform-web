import Link from "next/link";
import { getRoadmapByArea } from "@dg/platform-core";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

export function PlatformRoadmapPanel() {
  const areas = getRoadmapByArea();

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">What&apos;s shipped &amp; what&apos;s next</h2>
      <p className="mt-1 text-sm text-slate-400">
        Live roadmap for Platform Gen 2 — statuses update as we ship.
      </p>

      <div className="mt-6 space-y-6">
        {areas.map(({ area, items }) => (
          <section key={area}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {area}
            </h3>
            <ul className="mt-2 divide-y divide-slate-800/80">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.href && item.status !== "planned" ? (
                        <Link
                          href={item.href}
                          className="font-medium text-white hover:text-blue-300"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-200">{item.label}</span>
                      )}
                      <RoadmapStatusBadge status={item.status} />
                      {item.priority === "high" ? (
                        <span className="text-[10px] uppercase tracking-wide text-red-400/90">
                          High
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>
                  {item.href && item.status === "planned" ? (
                    <Link
                      href={item.href}
                      className="shrink-0 text-xs text-blue-400 hover:underline"
                    >
                      Preview →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
