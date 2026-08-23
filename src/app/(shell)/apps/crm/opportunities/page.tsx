import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  canAccessCommandCentre,
  isWantOpportunityMetadata,
  listOpportunities,
} from "@dg/platform-core";

import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";

export default async function CrmOpportunitiesPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in to view opportunities.</p>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listOpportunities({
    organisationId: session.organisationId,
  });

  const isWantd =
    session.organisationSlug === "wantd" ||
    /wantd/i.test(session.organisationName ?? "");

  const isStaff = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {meta.total} opportunit
          {meta.total === 1 ? "y" : "ies"}
          {isWantd
            ? " · Wants from wantdproperty.com.au"
            : " · website and platform enquiries land here"}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="dg-card">
          {isWantd ? (
            <p className="text-sm text-slate-400">
              Property Wants land here as CRM Opportunities. Matching is manual for MVP — update
              stage as you contact, match, and progress. Public form:{" "}
              <Link href="/wantd/property" className="text-sky-400 hover:underline">
                /wantd/property
              </Link>
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Contact and other website enquiries appear here after capture. Platform
              Consultations also show under{" "}
              <Link href="/apps/crm/consultations" className="text-sky-400 hover:underline">
                Consultations
              </Link>
              .
              {isStaff ? (
                <>
                  {" "}
                  Staff Founding pipeline:{" "}
                  <Link href="/command/founding" className="text-sky-400 hover:underline">
                    Command → Founding 10
                  </Link>
                  .
                </>
              ) : null}
            </p>
          )}
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No opportunities yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {items.map((opp) => {
                const want = isWantOpportunityMetadata(opp.metadata);
                return (
                  <li key={opp.id} className="flex items-start justify-between gap-3 py-3">
                    <Link
                      href={`/apps/crm/opportunities/${opp.id}`}
                      className="min-w-0 flex-1 block hover:opacity-90"
                    >
                      <p className="font-medium text-white">
                        {want ? (
                          <span className="mr-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                            Want
                          </span>
                        ) : null}
                        {opp.title}
                      </p>
                      <p className="text-sm text-slate-400">
                        {want ? "Demand · " : ""}
                        {opp.pipelineId === "platform_consultation"
                          ? "Platform Consultation · "
                          : opp.pipelineId === "founding_10"
                            ? "Founding 10 · "
                            : opp.pipelineId === "platform_enquiry"
                              ? "Contact enquiry · "
                              : ""}
                        {opp.stage.replace(/_/g, " ")} · {opp.status}
                        {opp.leadId ? " · from lead" : ""}
                      </p>
                    </Link>
                    <CrmDeleteButton
                      resource="opportunities"
                      id={opp.id}
                      name={opp.title}
                      compact
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
