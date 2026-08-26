import Link from "next/link";
import { buildMarketplaceCatalog, MARKETPLACE_CATEGORIES } from "@dg/platform-core";
import type { MarketplaceCategory } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIds } from "@/lib/org-apps";

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

function parseCategory(raw?: string): MarketplaceCategory | "all" {
  if (!raw) return "all";
  // Legacy bookmark: software → apps
  if (raw === "software") return "apps";
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

  const enabledAppIds = session ? await getOrgEnabledAppIds() : [];

  const catalog = buildMarketplaceCatalog({
    category,
    query,
    enabledAppIds,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Extend your business platform. Discover DigitalGate apps, industry capabilities, services,
          professionals, partners and integrations.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Distinct from{" "}
          <Link href="/dashboard/apps" className="text-sky-400 hover:underline">
            Apps
          </Link>{" "}
          (what you have installed) and{" "}
          <Link href="/dashboard/network" className="text-sky-400 hover:underline">
            Network
          </Link>{" "}
          (who you connect with).
        </p>
      </header>
      <main className="dg-page-main">
        <MarketplaceBrowser
          listings={catalog.listings}
          totals={catalog.totals}
          category={category}
          query={query}
          recommended={catalog.recommended}
          sections={catalog.sections}
        />
      </main>
    </>
  );
}
