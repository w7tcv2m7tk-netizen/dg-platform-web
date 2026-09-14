import { Suspense } from "react";

import { AppsPlanCatalog } from "@/components/platform/AppsPlanCatalog";
import { MarketingCatalogCard } from "@/components/platform/MarketingCatalogCard";
import { PostPurchaseSyncBanner } from "@/components/platform/PostPurchaseSyncBanner";

/**
 * App Catalogue — explicit discovery / management surface.
 * The normal Apps workspace stays personalised to the active organisation;
 * customers come here only when they want to extend their setup.
 */
export default function AppsCataloguePage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Explore Apps</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Add another industry, Template or specialist capability when this business needs it. Your normal Apps workspace remains focused on what is already relevant to the organisation. Billing and subscribe live under Settings → Billing.
        </p>
      </header>
      <main className="dg-page-main">
        <Suspense fallback={null}>
          <PostPurchaseSyncBanner />
        </Suspense>
        <MarketingCatalogCard />
        <AppsPlanCatalog />
      </main>
    </>
  );
}
