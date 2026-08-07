import Link from "next/link";

/**
 * Honest stub — Network Reviews product is Phase 5+.
 * Do not build review collection / syndication here.
 */
export default function AccommodationReviewsPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-sm text-slate-400">
          Guest reputation across Direct, Airbnb, and Booking.com
        </p>
      </header>
      <main className="dg-page-main">
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
          <p className="text-lg font-medium text-white">Coming soon</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            Accommodation Reviews will live in the future Network Reviews app — collecting and
            surfacing guest feedback across channels. This Accommodation screen is a placeholder
            so navigation is ready; we are not building the Reviews product here.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            For now, use{" "}
            <Link href="/apps/accommodation/guests" className="text-blue-400 hover:underline">
              Guests
            </Link>{" "}
            and Contact timeline for guest notes.
          </p>
        </div>
      </main>
    </>
  );
}
