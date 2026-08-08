import {
  computeReputationScore,
  extractReviewThemes,
} from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsReputationPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation Score™</h1>
        <p className="text-sm text-slate-400">
          Stub formula on live Acc feed where available — Scoring Engine owns the™ formula later
        </p>
        <ReviewsSubnav active="/apps/reviews/reputation" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to compute reputation.</p>
          </div>
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
                {!feedStatus.ok ? ` · feed: ${feedStatus.message}` : ""}
              </p>
            </div>
            <ReviewThemesPanel reviews={feed} initial={themes} />
          </>
        )}
      </main>
    </>
  );
}
