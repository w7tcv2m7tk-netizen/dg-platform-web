import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listGrowthProspects,
  sessionHasFeature,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProspectingProspectsPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  const canDiscover = sessionHasFeature(session, "prospecting.prospects.write");
  let prospects: Awaited<ReturnType<typeof listGrowthProspects>> = [];
  let loadFailed = false;

  if (process.env.DATABASE_URL) {
    try {
      prospects = await listGrowthProspects({
        organisationId: session.organisationId,
        limit: 150,
      });
    } catch (error) {
      console.error("[prospecting/prospects] load failed", error);
      loadFailed = true;
    }
  } else {
    loadFailed = true;
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Prospects</h1>
        <p className="mt-1 text-sm text-slate-400">
          Businesses {session.organisationName} has discovered or is actively working before CRM conversion.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {loadFailed ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            Prospect data is temporarily unavailable. Try again shortly.
          </div>
        ) : prospects.length === 0 ? (
          <div className="dg-card space-y-3">
            <h2 className="font-semibold text-white">No prospects yet</h2>
            <p className="text-sm text-slate-400">
              Start with Discovery to find target businesses. Qualified prospects then move through Pipeline and can be promoted into CRM.
            </p>
            {canDiscover ? (
              <Link href="/apps/prospecting/discovery" className="text-sm text-sky-400 hover:underline">
                Open Discovery →
              </Link>
            ) : (
              <Link href="/apps/prospecting/pipeline" className="text-sm text-sky-400 hover:underline">
                Open Pipeline →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">
                {prospects.length} active prospect{prospects.length === 1 ? "" : "s"}
              </p>
              <Link href="/apps/prospecting/pipeline" className="text-sm text-sky-400 hover:underline">
                Open Pipeline →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Business</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {prospects.map((prospect) => (
                    <tr key={prospect.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{prospect.businessName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[prospect.industry, prospect.location].filter(Boolean).join(" · ") || "Business details not yet enriched"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <p>{prospect.contactName || "No contact identified"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {prospect.contactEmail || prospect.contactPhone || "Contact details not yet enriched"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(prospect.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
