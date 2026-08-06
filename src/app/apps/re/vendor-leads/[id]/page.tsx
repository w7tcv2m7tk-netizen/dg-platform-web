import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getContact,
  getLead,
  getPropertyForLead,
  listInvoicesForEntity,
  listLeadActivities,
  listQuotesForEntity,
  resolvePlatformSession,
} from "@dg/platform-core";

import { LeadCommercePanel } from "@/components/re/LeadCommercePanel";
import { RequestPaymentButton } from "@/components/re/RequestPaymentButton";
import { LeadStageSelect } from "@/components/re/LeadStageSelect";
import { StartAppraisalButton } from "@/components/re/StartAppraisalButton";
import { fetchPortalMe } from "@/lib/dg-api";

const STAGE_LABELS: Record<string, string> = {
  vendor_lead: "Vendor Lead",
  appraisal: "Appraisal",
  listing: "Listing",
  sale: "Sale",
  settlement: "Settlement",
  past_client: "Past Client",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  if (!session) notFound();

  const lead = await getLead(session.organisationId, id);
  if (!lead) notFound();

  const [activities, contact, property, quotes, invoices] = await Promise.all([
    listLeadActivities(session.organisationId, id),
    lead.contactId
      ? getContact(session.organisationId, lead.contactId)
      : Promise.resolve(null),
    getPropertyForLead(session.organisationId, id),
    listQuotesForEntity(session.organisationId, "Lead", id),
    listInvoicesForEntity(session.organisationId, "Lead", id),
  ]);

  const wpName = lead.metadata?.wp_name as string | undefined;
  const wpId = lead.externalRefs?.wp_vendor_lead_id as number | undefined;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/re/vendor-leads"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Vendor leads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {lead.title ?? "Vendor lead"}
        </h1>
        <p className="text-sm text-slate-400">
          {STAGE_LABELS[lead.stage] ?? lead.stage} · {lead.status} · {lead.source}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="dg-card">
              <h2 className="font-semibold text-white">Pipeline</h2>
              <div className="mt-4">
                <LeadStageSelect leadId={lead.id} currentStage={lead.stage} />
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Appraisal & property</h2>
              {property ? (
                <div className="mt-4">
                  <p className="text-white">{property.addressLine1}</p>
                  <p className="text-sm text-slate-400">
                    {property.suburb} {property.state} · {property.status}
                  </p>
                  <Link
                    href={`/apps/re/properties/${property.id}`}
                    className="mt-3 inline-block text-sm text-blue-400 hover:underline"
                  >
                    Open property →
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-slate-400">
                    Create a property record to start the appraisal workflow.
                  </p>
                  <div className="mt-3">
                    <StartAppraisalButton leadId={lead.id} />
                  </div>
                </div>
              )}
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Commerce workflow</h2>
              <p className="mt-2 text-sm text-slate-400">
                Quote → accept → send invoice → request payment.
              </p>
              <div className="mt-4">
                <LeadCommercePanel
                  leadId={lead.id}
                  contactId={lead.contactId ?? undefined}
                  quotes={quotes.map((q) => ({
                    id: q.id,
                    quoteNumber: q.quoteNumber ?? "—",
                    status: q.status,
                    totalCents: q.totalCents,
                  }))}
                  invoices={invoices.map((inv) => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber ?? "—",
                    status: inv.status,
                    totalCents: inv.totalCents,
                  }))}
                />
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Quick payment</h2>
              <p className="mt-2 text-sm text-slate-400">
                Send a Stripe checkout link for marketing contribution or other fees.
              </p>
              <div className="mt-4">
                <RequestPaymentButton
                  leadId={lead.id}
                  contactId={lead.contactId ?? undefined}
                />
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Property & lead</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {lead.propertyAddress ? (
                  <div>
                    <dt className="text-slate-500">Property</dt>
                    <dd className="text-white">{lead.propertyAddress}</dd>
                  </div>
                ) : null}
                {lead.description ? (
                  <div>
                    <dt className="text-slate-500">Description</dt>
                    <dd className="text-white">{lead.description}</dd>
                  </div>
                ) : null}
                {wpName ? (
                  <div>
                    <dt className="text-slate-500">Contact name (WP)</dt>
                    <dd className="text-white">{wpName}</dd>
                  </div>
                ) : null}
                {wpId ? (
                  <div>
                    <dt className="text-slate-500">WordPress lead ID</dt>
                    <dd className="text-white">#{wpId}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-white">
                    {new Date(lead.createdAt).toLocaleString("en-AU")}
                  </dd>
                </div>
              </dl>
            </div>

            {contact ? (
              <div className="dg-card">
                <h2 className="font-semibold text-white">Linked contact</h2>
                <p className="mt-2 text-white">
                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                </p>
                <p className="text-sm text-slate-400">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                </p>
                <Link
                  href={`/apps/crm/contacts/${contact.id}`}
                  className="mt-3 inline-block text-sm text-blue-400 hover:underline"
                >
                  Open contact →
                </Link>
              </div>
            ) : null}
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Timeline</h2>
            {!activities?.length ? (
              <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="border-l-2 border-emerald-600/50 pl-4"
                  >
                    <p className="font-medium text-white">{activity.title}</p>
                    {activity.body ? (
                      <p className="text-sm text-slate-400">{activity.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.activityType} ·{" "}
                      {new Date(activity.createdAt).toLocaleString("en-AU")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
