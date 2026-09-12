import Link from "next/link";
import { getPmOverviewCounts } from "@dg/platform-core";

import { canManagePropertyManagement } from "@/lib/property-management-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PropertyManagementOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const canManage = canManagePropertyManagement(session);
  const counts = await getPmOverviewCounts(session.organisationId);

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Long-term rental portfolio
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only access. Organisation-wide Property Management edit access is required to change portfolio records.
          </p>
        ) : null}
      </div>
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
        Owners and tenants are Core CRM Contacts linked from leases rather than a separate people database.{" "}
        <Link
          href="/apps/property-management/properties"
          className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
        >
          Open properties →
        </Link>
      </p>
    </main>
  );
}
