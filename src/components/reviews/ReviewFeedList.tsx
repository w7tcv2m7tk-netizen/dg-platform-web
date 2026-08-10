import type { ReviewFeedItem } from "@dg/platform-core";

import { ReviewReplyDraftButton } from "@/components/reviews/ReviewReplyDraftButton";

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
      <p className="text-sm text-slate-400">
        No reviews in the connected feed yet. Import Acc reviews in WordPress or connect another
        source.
      </p>
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
