import { currentUser } from "@clerk/nextjs/server";
import { listProperties, resolvePlatformSession } from "@dg/platform-core";

import { PropertyList } from "@/components/re/PropertyList";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function PropertiesPage() {
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
          <h1 className="text-2xl font-bold text-white">Properties</h1>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const { items } = await listProperties({ organisationId: session.organisationId });

  const appraisalCount = items.filter((p) => p.status === "appraisal").length;
  const listedCount = items.filter((p) => p.status === "listed").length;

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Properties</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Appraisals & listings
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {appraisalCount} in appraisal · {listedCount} listed · {items.length} total
        </p>
      </header>
      <main className="flex-1 p-8">
        <PropertyList properties={items} />
      </main>
    </>
  );
}
