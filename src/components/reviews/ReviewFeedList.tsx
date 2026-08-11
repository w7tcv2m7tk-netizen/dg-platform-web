import type { ReviewFeedItem } from "@dg/platform-core";

import { ReviewReplyDraftButton } from "@/components/reviews/ReviewReplyDraftButton";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function ReviewFeedList({
  reviews,
  businessName,
}: {
  reviews: ReviewFeedItem[];
  businessName?: string;
}) {
  if (!reviews.length) {
    return (
      <ReviewsEmptyState
        title="No reviews in this feed"
        description="Import Acc reviews in WordPress or sync Google Business Profile, then refresh. Reputation never shows invented ratings."
        actions={[
          { href: "/apps/reviews/sources", label: "Sources →" },
          { href: "/apps/reviews/requests", label: "Queue a request →" },
        ]}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white">{review.authorName ?? "Guest"}</p>
              <p className="text-xs text-slate-500">
                {[review.source, review.reviewDate].filter(Boolean).join(" · ")}
                {review.listingId ? ` · listing ${review.listingId}` : ""}
              </p>
            </div>
            {review.rating != null ? (
              <p className="text-amber-300/90" aria-label={`${review.rating} stars`}>
                {stars(review.rating)}
              </p>
            ) : null}
          </div>
          {review.title ? (
            <p className="mt-2 text-sm font-medium text-slate-200">{review.title}</p>
          ) : null}
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
          <ReviewReplyDraftButton review={review} businessName={businessName} />
        </li>
      ))}
    </ul>
  );
}
