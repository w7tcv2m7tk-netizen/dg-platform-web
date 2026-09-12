import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatPropertyAddress,
  formatTimelineDateTime,
  getContact,
  getLead,
  getProperty,
  getPropertyCotalityId,
  isPropertyHiddenFromWebsite,
  listLeads,
  listPropertyActivities,
  listPropertyOffers,
  normalizePropertyAgencyAgreement,
  normalizePropertyDisclosureStatement,
} from "@dg/platform-core";
import { PROPERTY_STATUS_LABELS } from "@dg/platform-core/properties/statuses";

import { CotalityMatchPanel } from "@/components/re/CotalityMatchPanel";
import { DomainSyndicationPanel } from "@/components/re/DomainSyndicationPanel";
import { HideFromWebsiteToggle } from "@/components/re/HideFromWebsiteToggle";
import { PropertyAgencyAgreementPanel } from "@/components/re/PropertyAgencyAgreementPanel";
import { PropertyContractPanel } from "@/components/re/PropertyContractPanel";
import { PropertyDisclosureStatementPanel } from "@/components/re/PropertyDisclosureStatementPanel";
import { PropertyListingEditor } from "@/components/re/PropertyListingEditor";
import { PropertyOffersPanel } from "@/components/re/PropertyOffersPanel";
import { PropertyStatusSelect } from "@/components/re/PropertyStatusSelect";
import { ReaSyndicationPanel } from "@/components/re/ReaSyndicationPanel";
import { RefreshAddressButton } from "@/components/re/RefreshAddressButton";
import { formatMoneyFromCents, getOrganisationMoneySettings } from "@/lib/organisation-money";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { canManageRealEstate } from "@/lib/real-estate-page-access";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await getPlatformPageContext();
  if (!session) notFound();

  const property = await getProperty(session.organisationId, id);
  if (!property) notFound();

  const canManage = canManageRealEstate(session);
  const [activities, lead, contact, offers, buyerLeadsResult, money] = await Promise.all([
    listPropertyActivities(session.organisationId, id),
    property.leadId ? getLead(session.organisationId, property.leadId) : Promise.resolve(null),
    property.ownerContactId
      ? getContact(session.organisationId, property.ownerContactId)
      : Promise.resolve(null),
    canManage ? listPropertyOffers(session.organisationId, id) : Promise.resolve([]),
    canManage
      ? listLeads({ organisationId: session.organisationId, leadType: "buyer", limit: 100 })
      : Promise.resolve({ items: [], meta: { total: 0, limit: 0, offset: 0 } }),
    getOrganisationMoneySettings(session.organisationId),
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
  const agencyAgreement = normalizePropertyAgencyAgreement(
    property.metadata?.agencyAgreement as Record<string, unknown> | undefined,
  );
  const disclosureStatement = normalizePropertyDisclosureStatement(
    property.metadata?.disclosureStatement as Record<string, unknown> | undefined,
  );

  const fullAddress = formatPropertyAddress(property);
  const formattedAddress = property.metadata?.formatted_address as string | undefined;
  const hiddenFromWebsite = isPropertyHiddenFromWebsite(property.metadata);
  const cotalityPropertyId = getPropertyCotalityId(property);
  const cotalityMatchType =
    typeof property.metadata?.corelogic_match_type === "string"
      ? property.metadata.corelogic_match_type
      : null;
  const cotalityMatchedAddress =
    typeof property.metadata?.corelogic_matched_address === "string"
      ? property.metadata.corelogic_matched_address
      : null;
  const cotalityDetailsRaw =
    property.metadata?.corelogic_details &&
    typeof property.metadata.corelogic_details === "object" &&
    !Array.isArray(property.metadata.corelogic_details)
      ? (property.metadata.corelogic_details as {
          fetchedAt?: string;
          core?: {
            propertyType?: string;
            propertySubType?: string;
            beds?: number;
            baths?: number;
            carSpaces?: number;
            landArea?: number;
          };
          additional?: { floorArea?: number; yearBuilt?: string | number };
          lastSale?: {
            price?: number;
            contractDate?: string;
            settlementDate?: string;
            type?: string;
            isPriceWithheld?: boolean;
          };
          salesHistory?: Array<{
            price?: number;
            contractDate?: string;
            settlementDate?: string;
            type?: string;
            isPriceWithheld?: boolean;
          }>;
          features?: string[];
          images?: {
            defaultImage?: { largePhotoUrl?: string } | null;
            secondaryImageList?: Array<{ largePhotoUrl?: string }>;
          };
          avm?: { available?: boolean; message?: string };
          sections?: Record<string, string>;
        })
      : null;
  const cotalityPrefillRaw =
    property.metadata?.corelogic_prefill &&
    typeof property.metadata.corelogic_prefill === "object" &&
    !Array.isArray(property.metadata.corelogic_prefill)
      ? (property.metadata.corelogic_prefill as {
          at?: string;
          mode?: string;
          fields?: string[];
        })
      : null;
  const cotalityDetails = cotalityDetailsRaw
    ? {
        fetchedAt: cotalityDetailsRaw.fetchedAt ?? null,
        propertyType:
          cotalityDetailsRaw.core?.propertySubType || cotalityDetailsRaw.core?.propertyType || null,
        beds: cotalityDetailsRaw.core?.beds ?? null,
        baths: cotalityDetailsRaw.core?.baths ?? null,
        carSpaces: cotalityDetailsRaw.core?.carSpaces ?? null,
        landArea: cotalityDetailsRaw.core?.landArea ?? null,
        floorArea: cotalityDetailsRaw.additional?.floorArea ?? null,
        yearBuilt: cotalityDetailsRaw.additional?.yearBuilt ?? null,
        lastSalePrice: cotalityDetailsRaw.lastSale?.price ?? null,
        lastSaleDate:
          cotalityDetailsRaw.lastSale?.contractDate ||
          cotalityDetailsRaw.lastSale?.settlementDate ||
          null,
        salesHistory: Array.isArray(cotalityDetailsRaw.salesHistory)
          ? cotalityDetailsRaw.salesHistory
          : cotalityDetailsRaw.lastSale
            ? [cotalityDetailsRaw.lastSale]
            : [],
        salesHistoryStatus: cotalityDetailsRaw.sections?.salesHistory ?? null,
        features: Array.isArray(cotalityDetailsRaw.features) ? cotalityDetailsRaw.features : null,
        imageCount: (() => {
          const imgs = cotalityDetailsRaw.images;
          if (!imgs) return 0;
          const secondary = Array.isArray(imgs.secondaryImageList)
            ? imgs.secondaryImageList.length
            : 0;
          return (imgs.defaultImage ? 1 : 0) + secondary;
        })(),
        imagesStatus: cotalityDetailsRaw.sections?.images ?? null,
        avmAvailable: Boolean(cotalityDetailsRaw.avm?.available),
        avmMessage:
          typeof cotalityDetailsRaw.avm?.message === "string"
            ? cotalityDetailsRaw.avm.message
            : null,
        sections: cotalityDetailsRaw.sections ?? null,
        prefilledFields: Array.isArray(cotalityPrefillRaw?.fields)
          ? cotalityPrefillRaw.fields
          : null,
        prefillMode: cotalityPrefillRaw?.mode ?? null,
      }
    : null;

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
  const reaPlacement =
    property.externalRefs?.rea && typeof property.externalRefs.rea === "object"
      ? (property.externalRefs.rea as {
          channel?: string;
          status?: string;
          providerAdId?: string;
          reaAgencyId?: string | null;
          uploadId?: string | null;
          listingId?: string | null;
          progress?: string | null;
          result?: string | null;
          lastSyncedAt?: string | null;
          lastError?: string | null;
          path?: string | null;
        })
      : null;
  const marketing = (property.metadata?.marketing as Record<string, unknown> | undefined) ?? {};
  const images = Array.isArray(property.metadata?.images) ? (property.metadata.images as string[]) : [];
  const carSpaces = typeof property.metadata?.car_spaces === "number" ? property.metadata.car_spaces : null;
  const landSize = typeof property.metadata?.land_size === "string" ? property.metadata.land_size : null;
  const buildingSize =
    typeof property.metadata?.building_size === "string" ? property.metadata.building_size : null;
  const yearBuilt =
    typeof property.metadata?.year_built === "string" || typeof property.metadata?.year_built === "number"
      ? property.metadata.year_built
      : null;
  const inspectionTimes =
    typeof property.metadata?.inspection_times === "string" ? property.metadata.inspection_times : null;
  const displayAsContactAgent = property.metadata?.display_as_contact_agent === true;
  const cotalityPrefillNote =
    cotalityDetails?.prefilledFields?.length && cotalityDetails.fetchedAt
      ? `Prefill from Cotality · ${new Date(cotalityDetails.fetchedAt).toLocaleString(money.locale)} — review before export`
      : null;
  const guidePrice = formatMoneyFromCents(property.listingPriceCents, money);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/re/properties"
          className="inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
        >
          ← Properties
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{property.addressLine1}</h1>
        <p className="text-sm text-slate-400">
          {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
          {" · "}{fullAddress}
          {hiddenFromWebsite ? " · Hidden from website" : ""}
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only property. Organisation-wide Real Estate edit access is required to change listing, contract or syndication data.
          </p>
        ) : null}
      </header>

      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="dg-card">
              <h2 className="font-semibold text-white">Listing status</h2>
              <div className="mt-4">
                {canManage ? (
                  <PropertyStatusSelect propertyId={property.id} currentStatus={property.status} />
                ) : (
                  <p className="text-sm text-slate-300">
                    {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
                  </p>
                )}
              </div>
              {displayAsContactAgent ? (
                <p className="mt-4 text-sm text-slate-300">
                  Public price: <span className="font-medium text-white">Contact Agent</span>
                  {guidePrice ? <span className="text-slate-500"> · Internal guide {guidePrice}</span> : null}
                </p>
              ) : guidePrice ? (
                <p className="mt-4 text-sm text-slate-300">Guide price: {guidePrice}</p>
              ) : null}
            </div>

            {canManage ? (
              <>
                <PropertyAgencyAgreementPanel propertyId={property.id} agreement={agencyAgreement} />
                <PropertyDisclosureStatementPanel
                  propertyId={property.id}
                  disclosureStatement={disclosureStatement}
                />

                <div className="dg-card">
                  <h2 className="font-semibold text-white">Website visibility</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Control whether this listing is shown on the native DigitalGate website.
                  </p>
                  <div className="mt-4">
                    <HideFromWebsiteToggle propertyId={property.id} hidden={hiddenFromWebsite} />
                  </div>
                </div>
              </>
            ) : null}

            <div className="dg-card">
              <h2 className="font-semibold text-white">Address</h2>
              <p className="mt-2 text-sm text-slate-300">{fullAddress}</p>
              {formattedAddress ? <p className="mt-2 text-xs text-slate-500">{formattedAddress}</p> : null}
              {canManage ? (
                <>
                  <div className="mt-4">
                    <RefreshAddressButton propertyId={property.id} />
                  </div>
                  <CotalityMatchPanel
                    propertyId={property.id}
                    cotalityPropertyId={cotalityPropertyId}
                    matchType={cotalityMatchType}
                    matchedAddress={cotalityMatchedAddress}
                    details={cotalityDetails}
                    defaultReportEmail={contact?.email ?? null}
                  />
                </>
              ) : null}
            </div>

            {canManage ? (
              <>
                <PropertyListingEditor
                  key={cotalityPrefillRaw?.at ?? `listing-${property.id}`}
                  propertyId={property.id}
                  listingPriceCents={property.listingPriceCents}
                  displayAsContactAgent={displayAsContactAgent}
                  propertyType={property.propertyType}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  carSpaces={carSpaces}
                  landSize={landSize}
                  buildingSize={buildingSize}
                  yearBuilt={yearBuilt}
                  headline={typeof marketing.headline === "string" ? marketing.headline : undefined}
                  description={typeof marketing.description === "string" ? marketing.description : undefined}
                  features={typeof marketing.features === "string" ? marketing.features : undefined}
                  images={images}
                  inspectionTimes={inspectionTimes}
                  cotalityPrefillNote={cotalityPrefillNote}
                />

                <div className="dg-card">
                  <h2 className="font-semibold text-white">REA syndication</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Publish to realestate.com.au via Listing Hub when partner access is configured.
                  </p>
                  <div className="mt-4">
                    <ReaSyndicationPanel propertyId={property.id} placement={reaPlacement} />
                  </div>
                </div>

                <div className="dg-card">
                  <h2 className="font-semibold text-white">Domain syndication</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Publish to Domain.com.au via Listings Management when configured.
                  </p>
                  <div className="mt-4">
                    <DomainSyndicationPanel propertyId={property.id} placement={domainPlacement} />
                  </div>
                </div>
              </>
            ) : null}

            {lead ? (
              <div className="dg-card">
                <h2 className="font-semibold text-white">Vendor lead</h2>
                <p className="mt-2 text-white">{lead.title ?? "Vendor lead"}</p>
                <Link
                  href={`/apps/re/vendor-leads/${lead.id}`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
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
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
                >
                  Open contact →
                </Link>
              </div>
            ) : null}

            {canManage ? (
              <>
                <PropertyOffersPanel
                  propertyId={property.id}
                  offers={offers ?? []}
                  buyerLeads={buyerLeadsResult.items.map((b) => ({ id: b.id, title: b.title, stage: b.stage }))}
                />
                <PropertyContractPanel propertyId={property.id} contract={contract} />
              </>
            ) : contract ? (
              <div className="dg-card">
                <h2 className="font-semibold text-white">Contract</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {contract.buyerName ? `Buyer: ${contract.buyerName}` : "Contract recorded"}
                  {contract.settlementDate ? ` · Settlement ${contract.settlementDate}` : ""}
                </p>
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
                  <li key={activity.id} className="border-l-2 border-emerald-600/50 pl-4">
                    <p className="font-medium text-white">{activity.title}</p>
                    {activity.body ? <p className="text-sm text-slate-400">{activity.body}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.activityType} · {formatTimelineDateTime(activity.createdAt)}
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
