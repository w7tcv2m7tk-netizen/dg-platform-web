import Link from "next/link";
import {
  computeReputationScore,
  extractReviewThemes,
  REVIEW_SOURCE_CONCEPTS,
} from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReputationOverviewPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);
  const connectedSources = REVIEW_SOURCE_CONCEPTS.filter((s) =>
    feedStatus.ok && s.id === "accommodation_wp" ? true : s.status === "connected",
  );

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Growth App — monitor connected reviews,
          queue requests, score only from real data
        </p>
        <ReviewsSubnav active="/apps/reviews" />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Closed beta: Acc WordPress feed when connected. Google, Meta, ProductReview, Trustpilot,
          TripAdvisor, and Yelp arrive through the{" "}
          <Link href="/dashboard/settings/connectors" className="text-sky-400 hover:underline">
            Connector Framework
          </Link>
          . Core owns Universal Review plumbing; this App is the customer surface. Campaigns,
          competitor analysis, and advanced AI respond UX remain Reputation Pro roadmap.
        </div>

        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to load review feeds for your organisation.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Reputation Score™</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  {score.score == null ? "—" : score.score}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {score.averageRating != null
                    ? `${score.averageRating}★ avg · ${score.reviewCount} reviews`
                    : "No rated reviews yet"}
                </p>
                <Link
                  href="/apps/reviews/reputation"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  Score detail →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Inbox</p>
                <p className="mt-2 text-4xl font-bold text-white">{feed.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {feedStatus.ok
                    ? `${feedStatus.siteLabel ?? "Connected"} feed loaded`
                    : feedStatus.message ?? "No connector feed yet"}
                </p>
                <Link
                  href="/apps/reviews/inbox"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
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
                <p className="mt-1 text-xs text-slate-500">Connector-ready slots</p>
                <Link
                  href="/apps/reviews/sources"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  Manage sources →
                </Link>
              </div>
            </div>

            {!feedStatus.ok && feed.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
                <p className="text-lg font-medium text-white">No review feed connected yet</p>
                <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
                  Connect a review source to centralise ratings on Contact timelines. Acc WordPress
                  is available today; other platforms use Connectors.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                  <Link href="/apps/reviews/sources" className="text-sky-400 hover:underline">
                    View sources →
                  </Link>
                  <Link href="/dashboard/settings/connectors" className="text-sky-400 hover:underline">
                    Connectors →
                  </Link>
                  <Link href="/apps/reviews/requests" className="text-sky-400 hover:underline">
                    Queue a request →
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <ReviewThemesPanel reviews={feed} initial={themes} />
              <div className="dg-card">
                <h2 className="font-semibold text-white">Beta floor (honest)</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>
                    <span className="text-emerald-300">Live:</span> Acc{" "}
                    <code className="text-slate-300">dg_reviews</code> via WordPress connector when
                    available; request queue writes Activity on Contact/Organisation timeline
                  </li>
                  <li>
                    <span className="text-amber-300">Stub hooks:</span> JobCompleted / stay /
                    settlement → request candidates (email/SMS delivery later via Communications)
                  </li>
                  <li>
                    <span className="text-blue-300">AI:</span> Theme extraction / reply draft when
                    API keys exist; otherwise keyword stubs
                  </li>
                  <li>
                    <span className="text-slate-500">Roadmap:</span> Reputation Pro — campaigns,
                    competitor analysis, sentiment product UX
                  </li>
                </ul>
                <p className="mt-4 text-xs text-slate-500">
                  Not SaaS Refer &amp; Earn — that stays in{" "}
                  <Link href="/dashboard/settings/referrals" className="text-sky-400 hover:underline">
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
