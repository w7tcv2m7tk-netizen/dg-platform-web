import Link from "next/link";

import { ReviewFeedList } from "@/components/reviews/ReviewFeedList";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsInboxPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const platformSummary = Object.entries(feedStatus.byPlatform)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review inbox</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · unified monitor (Acc feed first)
        </p>
        <ReviewsSubnav active="/apps/reviews/inbox" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view the review inbox.</p>
          </div>
        ) : !feedStatus.ok ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">Feed unavailable</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{feedStatus.message}</p>
            <p className="mt-4 text-sm text-slate-500">
              Configure WordPress Acc connector or open{" "}
              <Link href="/apps/accommodation/reviews" className="text-blue-400 hover:underline">
                Accommodation Reviews
              </Link>{" "}
              ops surface. GBP / Meta arrive with Connectors.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm text-slate-400">
                {feedStatus.total} published
                {platformSummary ? ` · ${platformSummary}` : ""}
                {feedStatus.siteLabel ? ` · ${feedStatus.siteLabel}` : ""}
              </p>
              <Link href="/apps/reviews/sources" className="text-xs text-blue-400 hover:underline">
                Sources →
              </Link>
            </div>
            <ReviewFeedList reviews={feed} />
          </>
        )}
      </main>
    </>
  );
}
