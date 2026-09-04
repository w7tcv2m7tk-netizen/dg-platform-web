import { listProperties } from "@dg/platform-core";

import { ListingList } from "@/components/re/ListingList";
import { SyncListingsButton } from "@/components/re/SyncListingsButton";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function ListingsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listProperties({ organisationId: session.organisationId, limit: 200 });
  const listings = items.filter(
    (p) =>
      p.status === "listed" ||
      p.status === "under_offer" ||
      p.status === "contract_signed" ||
      p.status === "unconditional" ||
      p.status === "sold" ||
      Boolean(p.externalRefs?.wp_property_id),
  );

  return (
    <main className="dg-page-main space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Platform Core / Neon listings
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {listings.filter((p) => p.status === "listed").length} listed ·{" "}
            {
              listings.filter(
                (p) =>
                  p.status === "under_offer" ||
                  p.status === "contract_signed" ||
                  p.status === "unconditional",
              ).length
            }{" "}
            under offer / contract
          </p>
        </div>
        <SyncListingsButton />
      </div>
      <ListingList properties={listings} />
    </main>
  );
}
