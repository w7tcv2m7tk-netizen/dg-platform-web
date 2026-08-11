import {
  computeReputationScore,
  extractReviewThemes,
} from "@dg/platform-core";
import Link from "next/link";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReputationScorePage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation Score™</h1>
        <p className="text-sm text-slate-400">
          Core score from connected review feeds only — empty until rated reviews exist
        </p>
        <ReviewsSubnav active="/apps/reviews/reputation" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to compute reputation.</p>
          </div>
        ) : score.score == null ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">No Reputation Score™ yet</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{score.note}</p>
            {!feedStatus.ok ? (
              <p className="mt-2 text-sm text-slate-500">{feedStatus.message}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/apps/reviews/sources" className="text-sky-400 hover:underline">
                Connect a source →
              </Link>
              <Link href="/apps/reviews/inbox" className="text-sky-400 hover:underline">
                Open inbox →
              </Link>
            </div>
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
              </p>
            </div>
            <ReviewThemesPanel reviews={feed} initial={themes} />
          </>
        )}
      </main>
    </>
  );
}
