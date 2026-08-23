import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getPmOverviewCounts } from "@dg/platform-core";

import { PmNav } from "@/components/property-management/PmNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function PropertyManagementOverviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const session = user?.id
    ? await resolveActivePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Property Management</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const counts = await getPmOverviewCounts(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Property Management</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Long-term rentals floor (not sales or Acc)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <PmNav active="overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Properties</p>
            <p className="mt-1 text-2xl font-semibold text-white">{counts.properties}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Leases</p>
            <p className="mt-1 text-2xl font-semibold text-white">{counts.leases}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active leases</p>
            <p className="mt-1 text-2xl font-semibold text-white">{counts.activeLeases}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Open maintenance</p>
            <p className="mt-1 text-2xl font-semibold text-white">{counts.openMaintenance}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Owners and tenants are Core CRM Contacts linked from leases — not a separate people
          database.{" "}
          <Link href="/apps/property-management/properties" className="text-sky-400 hover:underline">
            Add a property →
          </Link>
        </p>
      </main>
    </>
  );
}
