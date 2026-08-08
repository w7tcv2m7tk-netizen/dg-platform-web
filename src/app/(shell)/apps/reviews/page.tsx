import Link from "next/link";
import {
  computeReputationScore,
  extractReviewThemes,
  REVIEW_SOURCE_CONCEPTS,
} from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsOverviewPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);
  const connectedSources = REVIEW_SOURCE_CONCEPTS.filter((s) =>
    feedStatus.ok && s.id === "accommodation_wp" ? true : s.status === "connected",
  );

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reviews &amp; reputation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Growth App — monitor, request, score
          (separate from Platform Refer &amp; Earn)
        </p>
        <ReviewsSubnav active="/apps/reviews" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to load review feeds for your organisation.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Reputation Score™</p>
                <p className="mt-2 text-4xl font-bold text-white">{score.score}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {score.averageRating != null
                    ? `${score.averageRating}★ avg · ${score.reviewCount} reviews`
                    : "No rated reviews yet"}
                </p>
                <Link
                  href="/apps/reviews/reputation"
                  className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                >
                  Score breakdown →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Inbox</p>
                <p className="mt-2 text-4xl font-bold text-white">{feed.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {feedStatus.ok
                    ? `${feedStatus.siteLabel ?? "Acc"} feed loaded`
                    : feedStatus.message ?? "Feed unavailable"}
                </p>
                <Link
                  href="/apps/reviews/inbox"
                  className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                >
                  Open inbox →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Sources</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  {feedStatus.ok ? connectedSources.length || 1 : 0}
                  <span className="text-lg font-normal text-slate-500">
                    /{REVIEW_SOURCE_CONCEPTS.length}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Connect / monitor concepts</p>
                <Link
                  href="/apps/reviews/sources"
                  className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                >
                  Manage sources →
                </Link>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReviewThemesPanel reviews={feed} initial={themes} />
              <div className="dg-card">
                <h2 className="font-semibold text-white">What&apos;s real vs stub</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>
                    <span className="text-emerald-300">Live:</span> Acc{" "}
                    <code className="text-slate-300">dg_reviews</code> via WordPress connector when
                    available
                  </li>
                  <li>
                    <span className="text-amber-300">Stub:</span> Reputation Score™ formula; response
                    tracking; GBP/Meta connect
                  </li>
                  <li>
                    <span className="text-blue-300">AI:</span> Theme extraction uses LLM when API keys
                    exist, else keyword stub
                  </li>
                  <li>
                    <span className="text-amber-300">Queued:</span> Review requests after completed
                    stay/settlement (timeline; delivery later)
                  </li>
                </ul>
                <p className="mt-4 text-xs text-slate-500">
                  Not SaaS Refer &amp; Earn — that stays in{" "}
                  <Link href="/dashboard/settings/referrals" className="text-blue-400 hover:underline">
                    Settings → Refer &amp; Earn
                  </Link>
                  .
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
