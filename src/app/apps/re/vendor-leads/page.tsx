import { currentUser } from "@clerk/nextjs/server";
import { listLeads, resolvePlatformSession } from "@dg/platform-core";

import { VendorLeadPipeline } from "@/components/re/VendorLeadPipeline";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function VendorLeadsPage() {
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
        <header className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">Vendor Leads</h1>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const { items } = await listLeads({ organisationId: session.organisationId });

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Vendor Leads</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Roe Realty pipeline on Platform
        </p>
      </header>
      <main className="flex-1 p-8">
        <VendorLeadPipeline leads={items} />
      </main>
    </>
  );
}
