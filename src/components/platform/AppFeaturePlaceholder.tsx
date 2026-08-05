import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRoadmapByArea,
  getRoadmapForApp,
  getRoadmapItem,
  getRoadmapSummary,
} from "@dg/platform-core";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";
import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";

export function AppFeaturePlaceholder({ itemId }: { itemId: string }) {
  const item = getRoadmapItem(itemId);
  if (!item) notFound();

  const summary = getRoadmapSummary();
  const related = item.appId ? getRoadmapForApp(item.appId) : [];
  const areaItems = getRoadmapByArea().find((a) => a.area === item.area)?.items ?? [];

  return (
    <>
      <PlatformRoadmapBar />
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{item.label}</h1>
          <RoadmapStatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {item.area} · {item.description}
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <div className="dg-card max-w-2xl border-dashed border-slate-700">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Placeholder
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Coming to Platform Gen 2</h2>
          <p className="mt-2 text-sm text-slate-400">
            This screen is wired in navigation so you can see the full product map.
            Implementation is{" "}
            <span className="text-slate-300">{item.status.replace(/_/g, " ")}</span> — overall
            platform progress is {summary.percentComplete}%.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Back to overview
            </Link>
            {item.appId ? (
              <Link
                href="/dashboard/apps"
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
              >
                Browse apps
              </Link>
            ) : null}
          </div>
        </div>

        {(related.length > 1 ? related : areaItems).length > 1 ? (
          <div className="dg-card max-w-2xl">
            <h3 className="font-semibold text-white">
              {item.appId ? "More in this app" : `More in ${item.area}`}
            </h3>
            <ul className="mt-3 space-y-2">
              {(related.length > 1 ? related : areaItems)
                .filter((r) => r.id !== item.id)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    {r.href ? (
                      <Link href={r.href} className="text-blue-400 hover:underline">
                        {r.label}
                      </Link>
                    ) : (
                      <span className="text-slate-300">{r.label}</span>
                    )}
                    <RoadmapStatusBadge status={r.status} />
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </main>
    </>
  );
}
