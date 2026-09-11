import Link from "next/link";

import { ReviewFeedList } from "@/components/reviews/ReviewFeedList";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsInboxPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const platformSummary = Object.entries(feedStatus.byPlatform)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");
  const sourceStatus = feedStatus.gbpConnected
    ? feedStatus.gbpLastSyncAt
      ? "Google Business Profile connected"
      : "Google Business Profile connected · not synced yet"
    : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review inbox</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · published customer reviews in one place
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view the review inbox.</p>
          </div>
        ) : feedStatus.emptyKind === "no_sources" ? (
          <ReviewsEmptyState
            title="No review source connected"
            description="Connect Google Business Profile to bring published reviews into DigitalGate. Reputation Score™ remains empty until rated reviews exist."
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
              { href: "/dashboard/settings/connected-services", label: "Connected Services →" },
            ]}
          />
        ) : feed.length === 0 ? (
          <ReviewsEmptyState
            title="No reviews in the inbox yet"
            description="Google Business Profile is connected, but no published reviews are currently available in DigitalGate. Sync the source and refresh this inbox."
            detail={
              feedStatus.gbpLastSyncAt
                ? `Last sync ${new Date(feedStatus.gbpLastSyncAt).toLocaleString("en-AU")}`
                : sourceStatus ?? undefined
            }
            actions={[{ href: "/apps/reviews/sources", label: "Sync review source →" }]}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm text-slate-400">
                {feedStatus.total} published review{feedStatus.total === 1 ? "" : "s"}
                {platformSummary ? ` · ${platformSummary}` : ""}
                {sourceStatus ? ` · ${sourceStatus}` : ""}
              </p>
              <Link href="/apps/reviews/sources" className="text-xs text-blue-400 hover:underline">
                Review source →
              </Link>
            </div>
            <ReviewFeedList reviews={feed} businessName={session.organisationName} />
          </>
        )}
      </main>
    </>
  );
}
