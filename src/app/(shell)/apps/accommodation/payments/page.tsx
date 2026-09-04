import { AccommodationPaymentsTable } from "@/components/accommodation/AccommodationPaymentsTable";
import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function AccommodationPaymentsPage() {
  const { session } = await getPlatformPageContext();
  const loaded = await loadStayBookingsForOps(session, 150);
  const bookings = loaded.bookings;
  const unpaid = bookings.filter((b) => (b.paid ?? "no") !== "yes");
  const paid = bookings.filter((b) => b.paid === "yes");
  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · StayBooking payments · Platform Core / Neon
        </p>
      </div>
      {loaded.syncError && bookings.length === 0 ? (
        <div className="dg-card border-amber-500/30">
          <p className="text-amber-300">{loaded.syncError}</p>
          <p className="mt-2 text-sm text-slate-500">
            Payments follow StayBooking rows in Platform Core.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unpaid / unknown</p>
              <p className="mt-1 text-2xl font-bold text-white">{unpaid.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
              <p className="mt-1 text-2xl font-bold text-white">{paid.length}</p>
            </div>
          </div>
          <AccommodationPaymentsTable bookings={bookings} />
        </>
      )}
    </main>
  );
}
