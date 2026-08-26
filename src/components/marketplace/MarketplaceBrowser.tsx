import Link from "next/link";
import type {
  MarketplaceCategory,
  MarketplaceListing,
  MarketplaceRecommendation,
} from "@dg/platform-core";
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CATEGORY_META } from "@dg/platform-core";

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <li className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {listing.layer ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {listing.layer}
            </p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold text-white">{listing.name}</h3>
        </div>
        {listing.badge ? (
          <span className="shrink-0 rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {listing.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 flex-1 text-sm text-slate-400">{listing.summary}</p>
      {listing.href && listing.ctaLabel ? (
        <Link
          href={listing.href}
          className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:underline"
        >
          {listing.ctaLabel} →
        </Link>
      ) : (
        <p className="mt-4 text-xs text-slate-600">Coming soon</p>
      )}
    </li>
  );
}

function Section({
  title,
  description,
  listings,
}: {
  title: string;
  description?: string;
  listings: MarketplaceListing[];
}) {
  if (!listings.length) return null;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </ul>
    </section>
  );
}

export function MarketplaceBrowser({
  listings,
  category,
  query,
  recommended,
  sections,
}: {
  listings: MarketplaceListing[];
  totals: Record<MarketplaceCategory | "all", number>;
  category: MarketplaceCategory | "all";
  query: string;
  recommended: MarketplaceRecommendation[];
  sections: {
    growth: MarketplaceListing[];
    industry: MarketplaceListing[];
    integrations: MarketplaceListing[];
    services: MarketplaceListing[];
    partners: MarketplaceListing[];
    comingSoon: MarketplaceListing[];
  };
}) {
  const filteredMode = category !== "all" || Boolean(query.trim());

  return (
    <div className="space-y-10">
      <form className="flex flex-wrap gap-3" action="/dashboard/marketplace" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search Marketplace…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
        />
        {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={
            query ? `/dashboard/marketplace?q=${encodeURIComponent(query)}` : "/dashboard/marketplace"
          }
          className={
            category === "all"
              ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
              : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
          }
        >
          All
        </Link>
        {MARKETPLACE_CATEGORIES.map((cat) => {
          const href = `/dashboard/marketplace?category=${cat}${
            query ? `&q=${encodeURIComponent(query)}` : ""
          }`;
          return (
            <Link
              key={cat}
              href={href}
              className={
                category === cat
                  ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
                  : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
              }
            >
              {MARKETPLACE_CATEGORY_META[cat].label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-3 text-sm text-slate-400">
        Core capabilities (CRM, Communications, Documents, Commerce, Design Studio, Infrastructure)
        are already included —{" "}
        <Link href="/dashboard/apps" className="text-sky-400 hover:underline">
          view in Apps
        </Link>
        . Marketplace is for what you can add next.
      </div>

      {!filteredMode && recommended.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Recommended for your business
          </h2>
          {recommended.map((rec) => (
            <div
              key={rec.listing.id}
              className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
                {rec.title}
              </p>
              <p className="mt-2 text-sm text-slate-400">{rec.reason}</p>
              <h3 className="mt-4 text-xl font-semibold text-white">{rec.listing.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{rec.listing.summary}</p>
              {rec.listing.href ? (
                <Link
                  href={rec.listing.href}
                  className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:underline"
                >
                  {rec.listing.ctaLabel ?? "Explore"} →
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {filteredMode ? (
        !listings.length ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No listings match this filter.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        )
      ) : (
        <>
          <Section
            title="Industry"
            description="Specialise DigitalGate for how your industry operates."
            listings={sections.industry}
          />
          <Section
            title="Growth"
            description="Acquire customers and grow through DigitalGate Growth Apps."
            listings={sections.growth}
          />
          <Section
            title="Integrations"
            description="Connect systems you already use."
            listings={sections.integrations}
          />
          <Section title="Services" listings={sections.services} />
          <Section
            title="Partners"
            description="Official partners for implementation and growth support."
            listings={sections.partners}
          />
          <Section
            title="Coming soon"
            description="Honest roadmap — not listed as live until ready."
            listings={sections.comingSoon}
          />
        </>
      )}
    </div>
  );
}
