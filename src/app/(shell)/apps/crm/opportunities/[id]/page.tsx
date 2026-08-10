import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  formatWantBudget,
  getContact,
  getLead,
  getOpportunity,
  isWantOpportunityMetadata,
} from "@dg/platform-core";

import { CrmAiAssistPanel } from "@/components/crm/CrmAiAssistPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CrmOpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  if (!session) notFound();

  const opportunity = await getOpportunity(session.organisationId, id);
  if (!opportunity) notFound();

  const want = isWantOpportunityMetadata(opportunity.metadata)
    ? opportunity.metadata
    : null;

  const [contact, lead] = await Promise.all([
    opportunity.contactId
      ? getContact(session.organisationId, opportunity.contactId)
      : Promise.resolve(null),
    opportunity.leadId
      ? getLead(session.organisationId, opportunity.leadId)
      : Promise.resolve(null),
  ]);

  const leadHref =
    lead?.source === "buyer_enquiry"
      ? `/apps/re/buyer-leads/${lead.id}`
      : lead
        ? `/apps/re/vendor-leads/${lead.id}`
        : null;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/crm/opportunities"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Opportunities
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{opportunity.title}</h1>
        <p className="text-sm text-slate-400">
          {want ? "Want · " : ""}
          {opportunity.stage.replace(/_/g, " ")} · {opportunity.status}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Pipeline</dt>
                <dd className="text-white capitalize">
                  {opportunity.pipelineId?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              {opportunity.valueCents != null ? (
                <div>
                  <dt className="text-slate-500">Value</dt>
                  <dd className="text-white">
                    {new Intl.NumberFormat("en-AU", {
                      style: "currency",
                      currency: opportunity.currency || "AUD",
                    }).format(opportunity.valueCents / 100)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="text-white">
                  {new Date(opportunity.createdAt).toLocaleString("en-AU")}
                </dd>
              </div>
            </dl>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Links</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {contact ? (
                <li>
                  <Link
                    href={`/apps/crm/contacts/${contact.id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}{" "}
                    →
                  </Link>
                  <p className="text-slate-500">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ) : (
                <li className="text-slate-500">No linked contact</li>
              )}
              {leadHref && lead ? (
                <li>
                  <Link href={leadHref} className="text-blue-400 hover:underline">
                    Source lead →
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>

          {want ? (
            <div className="dg-card lg:col-span-2">
              <h2 className="font-semibold text-white">Property Want</h2>
              <p className="mt-1 text-xs text-slate-500">
                Demand capture · manual matching for MVP
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Transaction</dt>
                  <dd className="capitalize text-white">{want.transaction}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Timeline</dt>
                  <dd className="text-white">{want.timeline.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="text-white">{want.property.propertyType ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Budget</dt>
                  <dd className="text-white">{formatWantBudget(want.property) ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Suburbs</dt>
                  <dd className="text-white">
                    {want.property.preferredSuburbs?.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Regions</dt>
                  <dd className="text-white">
                    {want.property.preferredRegions?.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Beds / baths / land</dt>
                  <dd className="text-white">
                    {[
                      want.property.bedrooms != null ? `${want.property.bedrooms}+ bed` : null,
                      want.property.bathrooms != null ? `${want.property.bathrooms} bath` : null,
                      want.property.minLandSizeSqm != null
                        ? `${want.property.minLandSizeSqm} sqm+`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Must-haves</dt>
                  <dd className="text-white">{want.requirements.mustHaves ?? "—"}</dd>
                </div>
                {want.requirements.lifestyle ? (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Lifestyle</dt>
                    <dd className="text-white">{want.requirements.lifestyle}</dd>
                  </div>
                ) : null}
                {want.requirements.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Description</dt>
                    <dd className="whitespace-pre-wrap text-white">
                      {want.requirements.description}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className="lg:col-span-2">
            <CrmAiAssistPanel
              opportunityId={opportunity.id}
              leadId={opportunity.leadId ?? undefined}
              contactId={opportunity.contactId ?? undefined}
              variant="opportunity"
            />
          </div>
        </div>
      </main>
    </>
  );
}
