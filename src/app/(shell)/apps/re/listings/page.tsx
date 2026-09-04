import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listProperties } from "@dg/platform-core";

import { ListingList } from "@/components/re/ListingList";
import { SyncListingsButton } from "@/components/re/SyncListingsButton";
import { fetchPortalMe } from "@/lib/dg-api";

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
