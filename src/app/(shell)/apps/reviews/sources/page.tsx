import Link from "next/link";
import { GbpReviewSourceCard } from "@/components/reviews/GbpReviewSourceCard";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsSourcesPage() {
  const { session, feedStatus } = await loadReviewsSessionAndFeed();
  const knownReviewBlock = Boolean(feedStatus.gbpConnected && !feedStatus.gbpReviewsAvailable && feedStatus.gbpReviewsBlockedReason);
  return <>
    <header className="dg-page-header"><h1 className="text-2xl font-bold text-white">Review source</h1><p className="text-sm text-slate-400">Connect Google Business Profile to bring published reviews into DigitalGate.</p></header>
    <main className="dg-page-main space-y-4">
      {!session ? <div className="dg-card"><p className="text-sm text-slate-400">Sign in to manage your review source.</p></div> : <>
        {!feedStatus.gbpConnected ? <ReviewsEmptyState title="Google Business Profile is not connected" description="Connect Google Business Profile to monitor published reviews, calculate Reputation Score™ and identify recurring customer themes." actions={[{ href: "/dashboard/settings/connected-services", label: "Open Connected Services →" },{ href: "/apps/reviews/inbox", label: "Review inbox →" }]} /> : null}
        {knownReviewBlock ? <div className="rounded-xl border border-amber-800/50 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/90"><p className="font-medium text-amber-50">Google reviews are unavailable for this connection</p><p className="mt-1 text-xs text-amber-200/80">Your Business Profile connection and location sync are healthy. Google is not granting review access for this login, so DigitalGate will keep location data connected without inventing review data or a Reputation Score™.</p><p className="mt-2 text-xs text-amber-200/70">{feedStatus.gbpReviewsBlockedReason}</p>{feedStatus.gbpLastSyncAt ? <p className="mt-1 text-xs text-amber-200/60">Last checked {new Date(feedStatus.gbpLastSyncAt).toLocaleString("en-AU")}</p> : null}</div> : null}
        {!knownReviewBlock && feedStatus.gbpConnected && feedStatus.emptyKind === "sync_blocked" ? <div className="rounded-xl border border-amber-800/50 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/90"><p className="font-medium text-amber-50">Review data is not available yet</p><p className="mt-1 text-xs text-amber-200/80">Google Business Profile is connected. Try syncing again later; your Reputation Score™ remains empty until rated reviews are available.</p></div> : null}
        {!knownReviewBlock && feedStatus.gbpConnected && feedStatus.emptyKind === "sync_failed" ? <div className="rounded-xl border border-rose-800/50 bg-rose-950/15 px-4 py-3 text-sm text-rose-100/90"><p className="font-medium text-rose-50">Review sync needs attention</p><p className="mt-1 text-xs text-rose-200/80">We could not refresh Google Business Profile reviews. Try again shortly or review the connection in Connected Services.</p></div> : null}
        <GbpReviewSourceCard description="Bring published Google reviews into DigitalGate for monitoring, reputation scoring and customer-theme analysis." initial={{ gbpConnected: Boolean(feedStatus.gbpConnected), gbpLocations: feedStatus.gbpLocations ?? 0, gbpReviewsCached: feedStatus.gbpReviewsCached ?? 0, gbpReviewsAvailable: Boolean(feedStatus.gbpReviewsAvailable), gbpReviewsBlockedReason: feedStatus.gbpReviewsBlockedReason ?? null, gbpLastSyncAt: feedStatus.gbpLastSyncAt ?? null, gbpLastError: feedStatus.gbpLastError ?? null }} />
        <div className="dg-card"><p className="text-sm text-slate-400">Connection management is available in Connected Services. Review data shown here remains read-only source data from Google Business Profile.</p><Link href="/dashboard/settings/connected-services" className="mt-3 inline-block text-sm text-blue-400 hover:underline">Open Connected Services →</Link></div>
      </>}
    </main>
  </>;
}
