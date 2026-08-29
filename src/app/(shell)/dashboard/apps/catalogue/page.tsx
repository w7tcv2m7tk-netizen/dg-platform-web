import { Suspense } from "react";

import { AppsPlanCatalog } from "@/components/platform/AppsPlanCatalog";
import { PostPurchaseSyncBanner } from "@/components/platform/PostPurchaseSyncBanner";

/**
 * App Catalogue — discover / manage available capabilities for this organisation.
 * Same catalog as Installed Apps for now; distinct nav entry for Platform IA.
 */
export default function AppsCataloguePage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">App Catalogue</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Browse and enable DigitalGate capabilities for this organisation. Billing and subscribe
          live under Settings → Billing. Discover partner products in Marketplace.
        </p>
      </header>
      <main className="dg-page-main">
        <Suspense fallback={null}>
          <PostPurchaseSyncBanner />
        </Suspense>
        <AppsPlanCatalog />
      </main>
    </>
  );
}
