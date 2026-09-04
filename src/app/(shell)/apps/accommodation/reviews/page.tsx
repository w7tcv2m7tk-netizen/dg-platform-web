import Link from "next/link";
import type { ReviewFeedItem } from "@dg/platform-core";

import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function ReviewCard({ review }: { review: ReviewFeedItem }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{review.authorName ?? "Guest"}</p>
          <p className="text-xs text-slate-500">
            {[review.source, review.reviewDate].filter(Boolean).join(" · ")}
            {review.listingId ? ` · ${review.listingId}` : ""}
          </p>
        </div>
        {review.rating != null ? (
          <p className="text-amber-300/90" aria-label={`${review.rating} stars`}>
            {stars(review.rating)}
          </p>
        ) : null}
      </div>
      {review.title ? <p className="mt-2 text-sm font-medium text-slate-200">{review.title}</p> : null}
      {review.content ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{review.content}</p>
      ) : null}
      {review.sourceUrl ? (
        <a
          href={review.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-blue-400 hover:underline"
        >
          View source →
        </a>
      ) : null}
    </li>
  );
}

export default async function AccommodationReviewsPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const platformSummary = Object.entries(feedStatus.byPlatform)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");
  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Universal Reviews · native connected sources
        </p>
      </div>
      {!feed.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
          <p className="text-lg font-medium text-white">No published reviews available</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            {feedStatus.message ??
              "Connect a supported review source to populate the Universal Review feed."}
          </p>
          <p className="mt-6 text-sm text-slate-500">
            <Link href="/apps/reviews" className="text-blue-400 hover:underline">
              Open Reviews
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm text-slate-400">
              {feedStatus.total} published{platformSummary ? ` · ${platformSummary}` : ""}
            </p>
            <Link href="/apps/reviews" className="text-xs text-blue-400 hover:underline">
              Open Reviews →
            </Link>
          </div>
          <ul className="space-y-3">
            {feed.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
