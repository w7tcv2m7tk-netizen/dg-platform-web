import Link from "next/link";
import { REVIEW_SOURCE_CONCEPTS } from "@dg/platform-core";

import { GbpReviewSourceCard } from "@/components/reviews/GbpReviewSourceCard";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsSourcesPage() {
  const { session, feedStatus } = await loadReviewsSessionAndFeed();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review sources</h1>
        <p className="text-sm text-slate-400">
          Connector Framework slots — Acc + GBP when connected; other providers planned
        </p>
        <ReviewsSubnav active="/apps/reviews/sources" />
      </header>
      <main className="dg-page-main space-y-4">
        {REVIEW_SOURCE_CONCEPTS.map((source) => {
          if (source.id === "google_business") {
            return (
              <GbpReviewSourceCard
                key={source.id}
                description={source.description}
                connectorHint={source.connectorHint}
                initial={{
                  gbpConnected: Boolean(feedStatus.gbpConnected),
                  gbpLocations: feedStatus.gbpLocations ?? 0,
                  gbpReviewsCached: feedStatus.gbpReviewsCached ?? 0,
                  gbpReviewsAvailable: Boolean(feedStatus.gbpReviewsAvailable),
                  gbpReviewsBlockedReason: feedStatus.gbpReviewsBlockedReason ?? null,
                  gbpLastSyncAt: feedStatus.gbpLastSyncAt ?? null,
                }}
              />
            );
          }

          const live =
            source.id === "accommodation_wp" && feedStatus.accConnected
              ? ("connected" as const)
              : source.status;

          return (
            <div key={source.id} className="dg-card flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{source.label}</h2>
                  <span
                    className={
                      live === "connected"
                        ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
                        : live === "available"
                          ? "rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300"
                          : "rounded-full bg-slate-700/80 px-2 py-0.5 text-xs text-slate-400"
                    }
                  >
                    {live}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{source.description}</p>
                {source.connectorHint ? (
                  <p className="mt-2 text-xs text-slate-500">{source.connectorHint}</p>
                ) : null}
              </div>
              {source.id === "accommodation_wp" ? (
                <div className="flex flex-col gap-2 text-sm">
                  <Link
                    href="/dashboard/settings/connectors"
                    className="text-blue-400 hover:underline"
                  >
                    WordPress connector
                  </Link>
                  <Link
                    href="/apps/accommodation/reviews"
                    className="text-blue-400 hover:underline"
                  >
                    Acc ops reviews
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
        {!session ? (
          <p className="text-sm text-slate-500">Sign in to detect live Acc / GBP connection status.</p>
        ) : null}
      </main>
    </>
  );
}
