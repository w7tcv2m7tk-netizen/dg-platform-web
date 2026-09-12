import { AccommodationDashboard } from "@/components/accommodation/AccommodationDashboard";
import { buildAccommodationSummary, type AccommodationSummary } from "@/lib/accommodation-summary";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function safeTimeZone(value?: string | null): string {
  const fallback = "Australia/Brisbane";
  const candidate = value?.trim() || fallback;
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

export default async function AccommodationOverviewPage() {
  const { session } = await getPlatformPageContext();

  let summary: AccommodationSummary | undefined;
  let summaryError: string | undefined;
  if (session) {
    try {
      let timeZone = "Australia/Brisbane";
      if (process.env.DATABASE_URL) {
        const { prisma } = await import("@dg/database");
        const organisation = await prisma.organisation.findUnique({
          where: { id: session.organisationId },
          select: { timezone: true },
        });
        timeZone = safeTimeZone(organisation?.timezone);
      }
      summary = await buildAccommodationSummary(session.organisationId, { timeZone });
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
