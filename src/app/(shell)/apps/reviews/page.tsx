import Link from "next/link";
import { computeReputationScore, extractReviewThemes } from "@dg/platform-core";

import { ReviewThemesPanel } from "@/components/reviews/ReviewThemesPanel";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReputationOverviewPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const score = computeReputationScore(feed);
  const themes = await extractReviewThemes(feed);
  const liveSourceCount = feedStatus.gbpConnected ? 1 : 0;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reputation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · monitor customer reviews, understand recurring themes and track reputation from connected sources
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to load review data for your organisation.</p>
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
                    ? `${feed.length} published review${feed.length === 1 ? "" : "s"}`
                    : "No reviews in the feed yet"}
                </p>
                <Link
                  href="/apps/reviews/inbox"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  Open inbox →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Review source</p>
                <p className="mt-2 text-4xl font-bold text-white">{liveSourceCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {feedStatus.gbpConnected
                    ? "Google Business Profile connected"
                    : "Connect Google Business Profile"}
                </p>
                <Link
                  href="/apps/reviews/sources"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  Manage source →
                </Link>
              </div>
            </div>

            {feedStatus.emptyKind === "no_sources" ? (
              <ReviewsEmptyState
                title="No review source connected"
                description="Connect Google Business Profile to bring published reviews into DigitalGate. Reputation Score™ stays empty until rated reviews exist."
                actions={[
                  { href: "/apps/reviews/sources", label: "Connect review source →" },
                  { href: "/dashboard/settings/connected-services", label: "Connected Services →" },
                ]}
              />
            ) : feedStatus.emptyKind === "sync_failed" ? (
              <ReviewsEmptyState
                title="Review sync needs attention"
                description="Google Business Profile is connected, but the latest sync did not return a usable review feed."
                tone="danger"
                actions={[
                  { href: "/apps/reviews/sources", label: "Review source status →" },
                  { href: "/dashboard/settings/connected-services", label: "Connected Services →" },
                ]}
              />
            ) : feedStatus.emptyKind === "sync_blocked" ? (
              <ReviewsEmptyState
                title="Reviews are not available yet"
                description="Google Business Profile is connected, but review data is not currently available. Reputation Score™ remains empty until rated reviews can be retrieved."
                tone="amber"
                actions={[
                  { href: "/apps/reviews/sources", label: "Review source status →" },
                  { href: "/apps/reviews/inbox", label: "Inbox →" },
                ]}
              />
            ) : feed.length === 0 ? (
              <ReviewsEmptyState
                title="Source connected — no reviews yet"
                description="Sync Google Business Profile to populate the review inbox. DigitalGate does not create placeholder review scores."
                detail={
                  feedStatus.gbpLastSyncAt
                    ? `Last sync ${new Date(feedStatus.gbpLastSyncAt).toLocaleString("en-AU")}`
                    : undefined
                }
                actions={[
                  { href: "/apps/reviews/sources", label: "Sync review source →" },
                  { href: "/apps/reviews/inbox", label: "Open inbox →" },
                ]}
              />
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <ReviewThemesPanel reviews={feed} initial={themes} />
              <div className="dg-card">
                <h2 className="font-semibold text-white">What you can do here</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>Monitor published reviews from your connected Google Business Profile.</li>
                  <li>Track Reputation Score™ using real ratings, volume and response data.</li>
                  <li>Identify recurring customer themes to inform service and growth decisions.</li>
                  <li>Use the review inbox to keep customer feedback visible alongside the rest of your business data.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
