import { AccommodationBookingsPanel } from "@/components/accommodation/AccommodationBookingsPanel";
import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function AccommodationBookingsPage() {
  const { session } = await getPlatformPageContext();
  const loaded = await loadStayBookingsForOps(session, 150);
  const error =
    loaded.syncError && loaded.bookings.length === 0 ? loaded.syncError : undefined;
  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Accommodation · StayBooking (Neon)
          {loaded.total != null ? ` · ${loaded.total} bookings` : ""}
        </p>
      </div>
      <AccommodationBookingsPanel
        bookings={loaded.bookings}
        total={loaded.total}
        error={error}
        siteLabel={siteLabel}
      />
    </main>
  );
}
