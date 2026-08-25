import Link from "next/link";

import { ReviewFeedList } from "@/components/reviews/ReviewFeedList";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsInboxPage() {
  const { session, feed, feedStatus } = await loadReviewsSessionAndFeed();
  const platformSummary = Object.entries(feedStatus.byPlatform)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");
  const healthBits = [
    feedStatus.accConnected ? "Acc connected" : null,
    feedStatus.gbpConnected
      ? feedStatus.gbpReviewsBlockedReason
        ? "GBP connected · reviews blocked"
        : feedStatus.gbpLastSyncAt
          ? "GBP connected"
          : "GBP connected · not synced"
      : null,
  ].filter(Boolean);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review inbox</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Reputation — unified monitor
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view the review inbox.</p>
          </div>
        ) : feedStatus.emptyKind === "no_sources" ? (
          <ReviewsEmptyState
            title="No review sources connected"
            description="Connect Google Business Profile or the Acc WordPress connector to populate the Universal Review feed. Score stays empty until rated reviews exist — no placeholders."
            detail={feedStatus.message}
            actions={[
              { href: "/apps/reviews/sources", label: "Open sources →" },
              { href: "/dashboard/settings/connectors", label: "Connectors →" },
            ]}
          />
        ) : feedStatus.emptyKind === "sync_failed" ? (
          <ReviewsEmptyState
            title="GBP sync failed"
            description="Google is connected but the last sync did not return a usable feed. Retry from Sources, or check connector settings."
            detail={feedStatus.message}
            tone="danger"
            actions={[
              { href: "/apps/reviews/sources", label: "Retry on sources →" },
              { href: "/dashboard/settings/connectors", label: "Connector settings →" },
            ]}
          />
        ) : feedStatus.emptyKind === "sync_blocked" ? (
          <ReviewsEmptyState
            title="Reviews blocked by Google"
            description="Location metadata may still sync. Reputation Score™ stays empty until the Reviews API returns rated reviews — we never invent scores."
            detail={feedStatus.gbpReviewsBlockedReason ?? feedStatus.message}
            tone="amber"
            actions={[
              { href: "/apps/reviews/sources", label: "Source health →" },
              { href: "/dashboard/settings/connectors", label: "Google connector →" },
            ]}
          />
        ) : feed.length === 0 ? (
          <ReviewsEmptyState
            title="No reviews in the feed yet"
            description="A source is connected, but the Universal Review feed has no published items. Sync GBP or import Acc reviews, then refresh this inbox."
            detail={
              [
                healthBits.join(" · ") || null,
                feedStatus.gbpLastSyncAt
                  ? `Last GBP sync ${new Date(feedStatus.gbpLastSyncAt).toLocaleString("en-AU")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || feedStatus.message
            }
            actions={[
              { href: "/apps/reviews/sources", label: "Sync sources →" },
              { href: "/apps/reviews/requests", label: "Queue a request →" },
            ]}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm text-slate-400">
                {feedStatus.total} published
                {platformSummary ? ` · ${platformSummary}` : ""}
                {feedStatus.siteLabel ? ` · ${feedStatus.siteLabel}` : ""}
                {healthBits.length ? ` · ${healthBits.join(" · ")}` : ""}
              </p>
              <Link href="/apps/reviews/sources" className="text-xs text-blue-400 hover:underline">
                Sources →
              </Link>
            </div>
            {feedStatus.gbpReviewsBlockedReason && feedStatus.gbpConnected ? (
              <p className="rounded-lg border border-amber-800/50 bg-amber-950/15 px-3 py-2 text-xs text-amber-200/90">
                GBP reviews still blocked: {feedStatus.gbpReviewsBlockedReason}
              </p>
            ) : null}
            <ReviewFeedList reviews={feed} businessName={session?.organisationName} />
          </>
        )}
      </main>
    </>
  );
}
