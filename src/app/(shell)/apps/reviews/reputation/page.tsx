import {
  computeReputationScore,
  extractReviewThemes,
} from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReputationScorePage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);

  const emptyDetail =
    feedStatus.emptyKind === "sync_failed"
      ? "We could not refresh review data right now. Try again from Review source."
      : feedStatus.emptyKind === "sync_blocked"
        ? "Google Business Profile is connected, but review data is not currently available."
        : feedStatus.hasSource
          ? "A source is connected. Reputation Score™ will appear when rated reviews are available."
          : "Connect Google Business Profile first. Reputation Score™ remains empty until rated reviews exist.";

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation Score™</h1>
        <p className="text-sm text-slate-400">
          Score calculated from connected, rated customer reviews only.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view your Reputation Score™.</p>
          </div>
        ) : score.score == null ? (
          <ReviewsEmptyState
            title="No Reputation Score™ yet"
            description={score.note}
            detail={emptyDetail}
            tone={
              feedStatus.emptyKind === "sync_failed"
                ? "danger"
                : feedStatus.emptyKind === "sync_blocked"
                  ? "amber"
                  : "neutral"
            }
            actions={[
              { href: "/apps/reviews/sources", label: "Review source →" },
              { href: "/apps/reviews/inbox", label: "Open inbox →" },
            ]}
          />
        ) : (
          <>
            <div className="dg-card max-w-xl">
              <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
              <p className="mt-2 text-5xl font-bold text-white">{score.score}</p>
              <p className="mt-2 text-sm text-slate-400">{score.note}</p>
              <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Rating</dt>
                  <dd className="text-white">{score.ratingScore}/55</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Volume</dt>
                  <dd className="text-white">{score.volumeScore}/25</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Response</dt>
                  <dd className="text-white">{score.responseScore}/20</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                {score.reviewCount} reviews
                {score.averageRating != null ? ` · ${score.averageRating}★ avg` : ""}
                {` · ${score.responseRate}% response rate`}
              </p>
            </div>
            <ReviewThemesPanel reviews={feed} initial={themes} />
          </>
        )}
      </main>
    </>
  );
}
