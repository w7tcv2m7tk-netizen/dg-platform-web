import { currentUser } from "@clerk/nextjs/server";
import { listSettlementProperties, resolvePlatformSession } from "@dg/platform-core";

import { SettlementList } from "@/components/re/SettlementList";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function SettlementsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;

  const session = user?.id
    ? await resolvePlatformSession({
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
          <h1 className="text-2xl font-bold text-white">Settlements</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const items = await listSettlementProperties(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Settlements</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Conveyancing checklist for under-offer and sold properties
        </p>
        <p className="mt-1 text-xs text-slate-500">{items.length} in settlement workflow</p>
      </header>
      <main className="dg-page-main">
        <SettlementList items={items} />
      </main>
    </>
  );
}
