import Link from "next/link";
import { buildMarketplaceCatalog, listCompanies, MARKETPLACE_CATEGORIES } from "@dg/platform-core";
import type { MarketplaceCategory } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

function parseCategory(raw?: string): MarketplaceCategory | "all" {
  if (!raw) return "all";
  return (MARKETPLACE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as MarketplaceCategory)
    : "all";
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const { category: categoryRaw, q } = await searchParams;
  const category = parseCategory(categoryRaw);
  const query = q?.trim() ?? "";

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

  const companies = session
    ? (
        await listCompanies({
          organisationId: session.organisationId,
          limit: 50,
        })
      ).items
    : [];

  const catalog = buildMarketplaceCatalog({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      website: c.website,
    })),
    category,
    query,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <p className="text-sm text-slate-400">
          Discover Software · Services · Professionals · Partners · Integrations
          {session ? ` · ${session.organisationName}` : ""}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Discover what you can add — distinct from{" "}
          <Link href="/dashboard/apps" className="text-blue-400 hover:underline">
            Apps
          </Link>{" "}
          (installed capabilities) and{" "}
          <Link href="/dashboard/network/refer-earn" className="text-blue-400 hover:underline">
            Refer &amp; Earn
          </Link>{" "}
          (network growth).
        </p>
      </header>
      <main className="dg-page-main">
        <MarketplaceBrowser
          listings={catalog.listings}
          totals={catalog.totals}
          category={category}
          query={query}
        />
      </main>
    </>
  );
}
