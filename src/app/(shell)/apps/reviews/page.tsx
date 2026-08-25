import Link from "next/link";
import {
  computeReputationScore,
  extractReviewThemes,
  REVIEW_SOURCE_CONCEPTS,
} from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReputationOverviewPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);
  const connectedSources = REVIEW_SOURCE_CONCEPTS.filter((s) => {
    if (s.id === "accommodation_wp") return Boolean(feedStatus.accConnected);
    if (s.id === "google_business") return Boolean(feedStatus.gbpConnected);
    return false;
  });
  const liveSourceCount = connectedSources.length;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Growth App — monitor connected reviews,
          queue requests, score only from real data
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Founding Customer Early Access: Acc WordPress and Google Business Profile (locations + reviews when the API
          allows) when connected. Meta, ProductReview, Trustpilot, TripAdvisor, and Yelp arrive
          through the{" "}
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
                  {feed.length > 0
                    ? `${feedStatus.siteLabel ?? "Connected"} feed loaded`
                    : feedStatus.message ?? "No reviews in feed yet"}
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
                  {liveSourceCount}
                  <span className="text-lg font-normal text-slate-500">
                    /{REVIEW_SOURCE_CONCEPTS.length}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {liveSourceCount
                    ? `${liveSourceCount} live · rest planned`
                    : "None live yet"}
                </p>
                <Link
                  href="/apps/reviews/sources"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  Manage sources →
                </Link>
              </div>
            </div>

            {feedStatus.emptyKind === "no_sources" ? (
              <ReviewsEmptyState
                title="No review sources connected"
                description="Connect Acc WordPress or Google Business Profile to centralise ratings. Score stays empty until rated reviews exist."
                actions={[
                  { href: "/apps/reviews/sources", label: "View sources →" },
                  { href: "/dashboard/settings/connectors", label: "Connectors →" },
                  { href: "/apps/reviews/requests", label: "Queue a request →" },
                ]}
              />
            ) : feedStatus.emptyKind === "sync_failed" ? (
              <ReviewsEmptyState
                title="GBP sync failed"
                description="Google is connected but sync did not return a usable review feed."
                detail={feedStatus.message}
                tone="danger"
                actions={[
                  { href: "/apps/reviews/sources", label: "Retry sync →" },
                  { href: "/dashboard/settings/connectors", label: "Connector settings →" },
                ]}
              />
            ) : feedStatus.emptyKind === "sync_blocked" ? (
              <ReviewsEmptyState
                title="GBP connected — reviews blocked"
                description="Location metadata may still be available. Reputation Score™ stays empty until Google returns rated reviews."
                detail={feedStatus.gbpReviewsBlockedReason ?? feedStatus.message}
                tone="amber"
                actions={[
                  { href: "/apps/reviews/sources", label: "Source health →" },
                  { href: "/apps/reviews/inbox", label: "Inbox →" },
                ]}
              />
            ) : feed.length === 0 ? (
              <ReviewsEmptyState
                title="Sources connected — feed empty"
                description="Sync GBP or import Acc reviews to populate the Universal Review feed. No placeholder scores."
                detail={
                  feedStatus.gbpLastSyncAt
                    ? `Last GBP sync ${new Date(feedStatus.gbpLastSyncAt).toLocaleString("en-AU")}`
                    : feedStatus.message
                }
                actions={[
                  { href: "/apps/reviews/sources", label: "Sync sources →" },
                  { href: "/apps/reviews/inbox", label: "Open inbox →" },
                ]}
              />
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
