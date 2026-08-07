import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getContact, getLead, getOpportunity } from "@dg/platform-core";

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
                  {opportunity.pipelineId ?? "—"}
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
        </div>
      </main>
    </>
  );
}
