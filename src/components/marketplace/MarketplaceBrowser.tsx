import Link from "next/link";
import type { MarketplaceCategory, MarketplaceListing } from "@dg/platform-core";
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CATEGORY_META } from "@dg/platform-core";

export function MarketplaceBrowser({
  listings,
  totals,
  category,
  query,
}: {
  listings: MarketplaceListing[];
  totals: Record<MarketplaceCategory | "all", number>;
  category: MarketplaceCategory | "all";
  query: string;
}) {
  return (
    <div className="space-y-6">
      <form className="flex flex-wrap gap-3" action="/dashboard/marketplace" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search listings…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
        />
        {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={query ? `/dashboard/marketplace?q=${encodeURIComponent(query)}` : "/dashboard/marketplace"}
          className={
            category === "all"
              ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
              : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
          }
        >
          All ({totals.all})
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
              {MARKETPLACE_CATEGORY_META[cat].label} ({totals[cat]})
            </Link>
          );
        })}
      </div>

      {category !== "all" ? (
        <p className="text-sm text-slate-400">{MARKETPLACE_CATEGORY_META[category].description}</p>
      ) : (
        <p className="text-sm text-slate-400">
          Browse Software, Services, Professionals, Partners, and Integrations — discovery UI over
          platform Apps, connectors, and your CRM companies.
        </p>
      )}

      {!listings.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
          No listings match this filter.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {MARKETPLACE_CATEGORY_META[listing.category].label}
                  </p>
                  <h2 className="mt-1 font-semibold text-white">{listing.name}</h2>
                </div>
                {listing.badge ? (
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {listing.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-400">{listing.summary}</p>
              {listing.tags?.length ? (
                <p className="mt-2 text-xs text-slate-600">{listing.tags.join(" · ")}</p>
              ) : null}
              {listing.href ? (
                <Link
                  href={listing.href}
                  className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                >
                  Open →
                </Link>
              ) : (
                <p className="mt-3 text-xs text-slate-600">Listing only — install/commerce later</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
