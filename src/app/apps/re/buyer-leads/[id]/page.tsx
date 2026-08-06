import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getContact,
  getLead,
  listLeadActivities,
  resolvePlatformSession,
} from "@dg/platform-core";

import { BuyerLeadStageSelect } from "@/components/re/BuyerLeadStageSelect";
import { fetchPortalMe } from "@/lib/dg-api";

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  qualified: "Qualified",
  viewing: "Viewing",
  offer: "Offer",
  purchased: "Purchased",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyerLeadDetailPage({ params }: PageProps) {
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
  if (!lead || lead.source !== "buyer_enquiry") notFound();

  const [activities, contact] = await Promise.all([
    listLeadActivities(session.organisationId, id),
    lead.contactId
      ? getContact(session.organisationId, lead.contactId)
      : Promise.resolve(null),
  ]);

  const propertyUrl = lead.metadata?.property_url as string | undefined;
  const wpId = lead.externalRefs?.wp_buyer_lead_id as number | undefined;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/re/buyer-leads"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Buyer leads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {lead.title ?? "Buyer lead"}
        </h1>
        <p className="text-sm text-slate-400">
          {STAGE_LABELS[lead.stage] ?? lead.stage} · {lead.status}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="dg-card">
              <h2 className="font-semibold text-white">Pipeline</h2>
              <div className="mt-4">
                <BuyerLeadStageSelect leadId={lead.id} currentStage={lead.stage} />
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Enquiry details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {lead.propertyAddress ? (
                  <div>
                    <dt className="text-slate-500">Property interest</dt>
                    <dd className="text-white">{lead.propertyAddress}</dd>
                  </div>
                ) : null}
                {lead.description ? (
                  <div>
                    <dt className="text-slate-500">Requirements</dt>
                    <dd className="text-white">{lead.description}</dd>
                  </div>
                ) : null}
                {propertyUrl ? (
                  <div>
                    <dt className="text-slate-500">Listing</dt>
                    <dd>
                      <a
                        href={propertyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        View on Roe ↗
                      </a>
                    </dd>
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
                    className="border-l-2 border-blue-600/50 pl-4"
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
