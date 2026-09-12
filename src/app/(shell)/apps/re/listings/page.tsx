import { listProperties } from "@dg/platform-core";

import { ListingList } from "@/components/re/ListingList";
import { getOrganisationMoneySettings } from "@/lib/organisation-money";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { canManageRealEstate } from "@/lib/real-estate-page-access";

export default async function ListingsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const [{ items }, money] = await Promise.all([
    listProperties({ organisationId: session.organisationId, limit: 200 }),
    getOrganisationMoneySettings(session.organisationId),
  ]);
  const canManage = canManageRealEstate(session);
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
            {session.organisationName} · Platform listings
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
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only listings. Organisation-wide Real Estate edit access is required to update status or guide price.
            </p>
          ) : null}
        </div>
      </div>
      <ListingList
        properties={listings}
        canManage={canManage}
        currency={money.currency}
        locale={money.locale}
      />
    </main>
  );
}
