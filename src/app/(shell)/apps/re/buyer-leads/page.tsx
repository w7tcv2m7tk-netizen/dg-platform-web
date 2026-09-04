import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listLeads } from "@dg/platform-core";

import { BuyerLeadPipeline } from "@/components/re/BuyerLeadPipeline";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function BuyerLeadsPage() {
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

  const { items } = await listLeads({
    organisationId: session.organisationId,
    leadType: "buyer",
  });

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Property enquiry pipeline · Platform Core / Neon
        </p>
      </div>
      <BuyerLeadPipeline leads={items} />
    </main>
  );
}
