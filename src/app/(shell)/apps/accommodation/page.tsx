import { AccommodationDashboard } from "@/components/accommodation/AccommodationDashboard";
import { buildAccommodationSummary, type AccommodationSummary } from "@/lib/accommodation-summary";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function AccommodationOverviewPage() {
  const { session } = await getPlatformPageContext();

  let summary: AccommodationSummary | undefined;
  let summaryError: string | undefined;
  if (session) {
    try {
      summary = await buildAccommodationSummary(session.organisationId);
    } catch (error) {
      console.error("[accommodation] native summary failed", error);
      summaryError = "Could not load Accommodation summary right now.";
    }
  }

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Platform Core / Neon · Ops
        </p>
      </div>
      <AccommodationDashboard
        summary={summary}
        error={session ? summaryError : "Platform session unavailable."}
        siteLabel={siteLabel}
      />
    </main>
  );
}
