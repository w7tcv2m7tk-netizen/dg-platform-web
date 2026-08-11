import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  formatPropertyAddress,
  getContact,
  getLead,
  getProperty,
  getPropertyCotalityId,
  listLeads,
  listPropertyActivities,
  listPropertyOffers,
} from "@dg/platform-core";

import { CotalityMatchPanel } from "@/components/re/CotalityMatchPanel";
import { PropertyContractPanel } from "@/components/re/PropertyContractPanel";
import { PropertyOffersPanel } from "@/components/re/PropertyOffersPanel";
import { PropertyListingEditor } from "@/components/re/PropertyListingEditor";
import { PublishToWebsiteButton } from "@/components/re/PublishToWebsiteButton";
import { DomainSyndicationPanel } from "@/components/re/DomainSyndicationPanel";

import { PropertyStatusSelect } from "@/components/re/PropertyStatusSelect";
import { RefreshAddressButton } from "@/components/re/RefreshAddressButton";
import { fetchPortalMe } from "@/lib/dg-api";

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  appraisal: "Appraisal",
  listed: "Listed",
  under_offer: "Under offer",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  if (!session) notFound();

  const property = await getProperty(session.organisationId, id);
  if (!property) notFound();

  const [activities, lead, contact, offers, buyerLeadsResult] = await Promise.all([
    listPropertyActivities(session.organisationId, id),
    property.leadId
      ? getLead(session.organisationId, property.leadId)
      : Promise.resolve(null),
    property.ownerContactId
      ? getContact(session.organisationId, property.ownerContactId)
      : Promise.resolve(null),
    listPropertyOffers(session.organisationId, id),
    listLeads({
      organisationId: session.organisationId,
      leadType: "buyer",
      limit: 100,
    }),
  ]);

  const contract = property.metadata?.contract as
    | {
        signedAt?: string;
        settlementDate?: string;
        purchasePriceCents?: number;
        buyerName?: string;
        specialConditions?: string;
      }
    | undefined;

  const fullAddress = formatPropertyAddress(property);
  const formattedAddress = property.metadata?.formatted_address as string | undefined;
  const cotalityPropertyId = getPropertyCotalityId(property);
  const cotalityMatchType =
    typeof property.metadata?.corelogic_match_type === "string"
      ? property.metadata.corelogic_match_type
      : null;
  const cotalityMatchedAddress =
    typeof property.metadata?.corelogic_matched_address === "string"
      ? property.metadata.corelogic_matched_address
      : null;
  const wpPermalink = property.externalRefs?.wp_property_permalink as string | undefined;
  const wpPropertyId = property.externalRefs?.wp_property_id as number | string | undefined;
  const domainPlacement =
    property.externalRefs?.domain && typeof property.externalRefs.domain === "object"
      ? (property.externalRefs.domain as {
          channel?: string;
          status?: string;
          providerAdId?: string;
          domainAgencyId?: number;
          processId?: string | null;
          processStatus?: string | null;
          lastSyncedAt?: string | null;
          lastError?: string | null;
          path?: string | null;
        })
      : null;
  const marketing =
    (property.metadata?.marketing as Record<string, unknown> | undefined) ?? {};
  const images = Array.isArray(property.metadata?.images)
    ? (property.metadata.images as string[])
    : [];
  const carSpaces =
    typeof property.metadata?.car_spaces === "number"
      ? property.metadata.car_spaces
      : null;
  const landSize =
    typeof property.metadata?.land_size === "string" ? property.metadata.land_size : null;
  const buildingSize =
    typeof property.metadata?.building_size === "string"
      ? property.metadata.building_size
      : null;
  const inspectionTimes =
    typeof property.metadata?.inspection_times === "string"
      ? property.metadata.inspection_times
      : null;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/re/properties"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Properties
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{property.addressLine1}</h1>
        <p className="text-sm text-slate-400">
          {STATUS_LABELS[property.status] ?? property.status} · {fullAddress}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="dg-card">
              <h2 className="font-semibold text-white">Listing status</h2>
              <div className="mt-4">
                <PropertyStatusSelect
                  propertyId={property.id}
                  currentStatus={property.status}
                />
              </div>
              {property.listingPriceCents ? (
                <p className="mt-4 text-sm text-slate-300">
                  Guide price: $
                  {(property.listingPriceCents / 100).toLocaleString("en-AU")}
                </p>
              ) : null}
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Website listing</h2>
              <p className="mt-1 text-sm text-slate-400">
                Push this property to the connected WordPress site.
              </p>
              <div className="mt-4">
                <PublishToWebsiteButton
                  propertyId={property.id}
                  status={property.status}
                  permalink={wpPermalink}
                  wpPropertyId={wpPropertyId}
                />
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Domain syndication</h2>
              <p className="mt-1 text-sm text-slate-400">
                Publish to Domain.com.au via Listings Management (sandbox or production path).
              </p>
              <div className="mt-4">
                <DomainSyndicationPanel
                  propertyId={property.id}
                  placement={domainPlacement}
                />
              </div>
            </div>

            <PropertyListingEditor
              propertyId={property.id}
              listingPriceCents={property.listingPriceCents}
              propertyType={property.propertyType}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              carSpaces={carSpaces}
              landSize={landSize}
              buildingSize={buildingSize}
              headline={typeof marketing.headline === "string" ? marketing.headline : undefined}
              description={
                typeof marketing.description === "string" ? marketing.description : undefined
              }
              features={typeof marketing.features === "string" ? marketing.features : undefined}
              images={images}
              inspectionTimes={inspectionTimes}
            />

            <div className="dg-card">
              <h2 className="font-semibold text-white">Address</h2>
              <p className="mt-2 text-sm text-slate-300">{fullAddress}</p>
              {formattedAddress ? (
                <p className="mt-2 text-xs text-slate-500">{formattedAddress}</p>
              ) : null}
              <div className="mt-4">
                <RefreshAddressButton propertyId={property.id} />
              </div>
              <CotalityMatchPanel
                propertyId={property.id}
                cotalityPropertyId={cotalityPropertyId}
                matchType={cotalityMatchType}
                matchedAddress={cotalityMatchedAddress}
              />
            </div>

            {lead ? (
              <div className="dg-card">
                <h2 className="font-semibold text-white">Vendor lead</h2>
                <p className="mt-2 text-white">{lead.title ?? "Vendor lead"}</p>
                <Link
                  href={`/apps/re/vendor-leads/${lead.id}`}
                  className="mt-3 inline-block text-sm text-blue-400 hover:underline"
                >
                  Open lead →
                </Link>
              </div>
            ) : null}

            {contact ? (
              <div className="dg-card">
                <h2 className="font-semibold text-white">Owner contact</h2>
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

            <PropertyOffersPanel
              propertyId={property.id}
              offers={offers ?? []}
              buyerLeads={buyerLeadsResult.items.map((b) => ({
                id: b.id,
                title: b.title,
                stage: b.stage,
              }))}
            />
            <PropertyContractPanel propertyId={property.id} contract={contract} />
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
