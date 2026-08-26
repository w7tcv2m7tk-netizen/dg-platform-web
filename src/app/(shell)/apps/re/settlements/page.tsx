import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listSettlementProperties,} from "@dg/platform-core";

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

  const items = await listSettlementProperties(session.organisationId);

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Conveyancing checklist for under-offer and sold properties
        </p>
        <p className="mt-1 text-xs text-slate-500">{items.length} in settlement workflow</p>
      </div>
      <SettlementList items={items} />
    </main>
  );
}
