import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listProperties } from "@dg/platform-core";

import { ListingList } from "@/components/re/ListingList";
import { SyncListingsButton } from "@/components/re/SyncListingsButton";
import { fetchPortalMe } from "@/lib/dg-api";
import { autoSyncWordPressPropertiesIfNeeded } from "@/lib/wordpress-sync";

export default async function ListingsPage() {
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

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Listings</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const autoSync = await autoSyncWordPressPropertiesIfNeeded(session);

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
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Listings</h1>
            <p className="text-sm text-slate-400">
              {session.organisationName} · Synced from website + platform listings
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
              {autoSync.ran
                ? ` · Synced ${autoSync.result?.created ?? 0} new / ${autoSync.result?.updated ?? 0} updated`
                : ""}
            </p>
          </div>
          <SyncListingsButton />
        </div>
      </header>
      <main className="dg-page-main">
        <ListingList properties={listings} />
      </main>
    </>
  );
}
