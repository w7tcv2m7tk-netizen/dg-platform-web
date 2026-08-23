import Link from "next/link";

/** Day-one operator framing — catalogue discoverable, not unavoidable. */
export function FoundingPrioritiesBanner() {
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-slate-300">
      <p className="font-medium text-white">Your business needs attention here</p>
      <p className="mt-1 text-slate-400">
        Start with Priorities below — then CRM, Commerce and Design Studio. Industry and Growth
        apps appear when you add them from{" "}
        <Link href="/dashboard/apps" className="text-sky-400 hover:underline">
          Apps
        </Link>
        .
      </p>
    </div>
  );
}
