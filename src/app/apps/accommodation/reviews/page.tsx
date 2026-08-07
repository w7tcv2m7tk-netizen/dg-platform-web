import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationReviews,
  getWpAccommodationSite,
  listWpAccommodationSites,
  type WpAccReviewRow,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function ReviewCard({ review }: { review: WpAccReviewRow }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{review.author_name ?? "Guest"}</p>
          <p className="text-xs text-slate-500">
            {[review.platform_label ?? review.platform, review.review_date]
              .filter(Boolean)
              .join(" · ")}
            {review.listing_id ? ` · listing ${review.listing_id}` : ""}
          </p>
        </div>
        <p className="text-amber-300/90" aria-label={`${review.rating} stars`}>
          {stars(review.rating ?? 0)}
        </p>
      </div>
      {review.title ? <p className="mt-2 text-sm font-medium text-slate-200">{review.title}</p> : null}
      {review.content ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{review.content}</p>
      ) : null}
      {review.source_url ? (
        <a
          href={review.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-blue-400 hover:underline"
        >
          View source →
        </a>
      ) : null}
    </li>
  );
}

/**
 * Thin ops surface over WP dg_reviews — not Network Reviews (Phase 5+).
 */
export default async function AccommodationReviewsPage({ searchParams }: PageProps) {
  const { siteId } = await searchParams;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const connector = await accommodationConnectorForSession(session?.organisationId);
  const siteLabel = connector?.label ?? site.label;

  const result = await fetchWpAccommodationReviews(site.id, 40, connector);

  const byPlatform = result.ok ? result.byPlatform : {};
  const platformSummary = Object.entries(byPlatform)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · guest feedback from
          WordPress (Airbnb / Booking.com / imported)
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main space-y-6">
        {!result.ok ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">Reviews API unavailable</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{result.message}</p>
            <p className="mt-4 text-sm text-slate-500">
              Deploy plugin <span className="text-slate-300">v10.65.1+</span> on the accommodation
              site for{" "}
              <code className="text-slate-300">GET /accommodation/reviews</code>. Full Network
              Reviews (request / respond / score) stays Phase 5+ — see{" "}
              <Link href="/apps/reviews" className="text-blue-400 hover:underline">
                Reviews app roadmap
              </Link>
              .
            </p>
          </div>
        ) : !result.reviews.length ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">No published reviews yet</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
              Import Airbnb reviews (or TrustIndex) in WordPress admin, then they appear here for
              ops. Collection, response workflows, and Reputation Score ship later in Network
              Reviews.
            </p>
            <p className="mt-6 text-sm text-slate-500">
              <Link href="/apps/accommodation/guests" className="text-blue-400 hover:underline">
                Guests
              </Link>
              {" · "}
              <Link href="/apps/reviews" className="text-blue-400 hover:underline">
                Reviews roadmap
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm text-slate-400">
                {result.total} published
                {platformSummary ? ` · ${platformSummary}` : ""}
              </p>
              <p className="text-xs text-slate-500">
                Ops read-only ·{" "}
                <Link href="/apps/reviews" className="text-blue-400 hover:underline">
                  Network Reviews roadmap
                </Link>
              </p>
            </div>
            <ul className="space-y-3">
              {result.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
