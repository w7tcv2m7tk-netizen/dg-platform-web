import { Suspense } from "react";

import { AppsPlanCatalog } from "@/components/platform/AppsPlanCatalog";
import { IndustryBusinessTypeManager } from "@/components/platform/IndustryBusinessTypeManager";
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
          Add or remove the exact business types and specialist capabilities this organisation needs. Only active business types appear in the sidebar. Billing and subscribe live under Settings → Billing.
        </p>
      </header>
      <main className="dg-page-main space-y-12">
        <Suspense fallback={null}>
          <PostPurchaseSyncBanner />
        </Suspense>
        <IndustryBusinessTypeManager />
        <MarketingCatalogCard />
        <AppsPlanCatalog />
      </main>
    </>
  );
}