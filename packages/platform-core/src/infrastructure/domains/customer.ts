/**
 * Org ↔ Dreamscape customer / SOAP contact upsert from Business Profile.
 */

import type { OrganisationBusinessProfile } from "../../org/business-profile-types";
import { getOrganisationBusinessProfile } from "../../org/onboarding-profile";
import {
  DreamscapeApiError,
  dreamscapeFetch,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
} from "../providers/dreamscape/client";
import {
  dreamscapeSoapContactCreate,
  type SoapContactCreateParams,
} from "../providers/dreamscape/soap-ops";
import { DreamscapeSoapError } from "../providers/dreamscape/soap";
import type { DreamscapeCustomerLink } from "../core/types";

export type PersistedDreamscapeCustomerLink = DreamscapeCustomerLink & {
  contactIdentifier?: string;
  id?: string;
};

function splitName(full?: string): { firstName: string; lastName: string } {
  const parts = (full || "Business Owner").trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function businessProfileToSoapContact(
  profile: OrganisationBusinessProfile,
  orgName: string,
): SoapContactCreateParams {
  const { firstName, lastName } = splitName(
    profile.contactName || profile.tradingName || profile.businessName || orgName,
  );
  const address = profile.address;
  const hasAbn = Boolean(profile.abn?.trim());
  return {
    firstName,
    lastName,
    address: address?.street || "Address required",
    city: address?.city || "City",
    state: address?.state || "QLD",
    postCode: address?.postcode || "4000",
    country: address?.country || "Australia",
    countryCode: "AU",
    email:
      profile.businessEmail ||
      profile.contactEmail ||
      profile.supportEmail ||
      "noreply@digitalgate.com.au",
    phone: profile.businessPhone || profile.contactPhone || undefined,
    accountType: hasAbn ? "business" : "personal",
    businessName:
      profile.businessName || profile.tradingName || orgName || undefined,
    businessNumberType: hasAbn ? "ABN" : undefined,
    businessNumber: profile.abn?.replace(/\s+/g, "") || undefined,
  };
}

export function auEligibilityFromProfile(
  profile: OrganisationBusinessProfile,
  orgName: string,
): {
  policyReason: number;
  businessName: string;
  businessNumberType: string;
  businessNumber: string;
  tradingName?: string;
  businessType?: string;
} | null {
  const abn = profile.abn?.replace(/\s+/g, "");
  if (!abn) return null;
  return {
    policyReason: 1,
    businessName: profile.businessName || profile.tradingName || orgName,
    businessNumberType: "ABN",
    businessNumber: abn,
    tradingName: profile.tradingName || undefined,
    businessType: "Company",
  };
}

export async function getPersistedDreamscapeCustomerLink(
  organisationId: string,
): Promise<PersistedDreamscapeCustomerLink | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const row = await prisma.dreamscapeCustomerLink.findUnique({
    where: { organisationId },
  });
  if (!row) return null;
  return {
    id: row.id,
    organisationId: row.organisationId,
    dreamscapeCustomerId:
      row.dreamscapeCustomerId || row.contactIdentifier || "",
    contactIdentifier: row.contactIdentifier ?? undefined,
    customerName: row.customerName ?? undefined,
    linkedAt: row.linkedAt.toISOString(),
  };
}

async function saveLink(input: {
  organisationId: string;
  dreamscapeCustomerId?: string | null;
  contactIdentifier?: string | null;
  customerName?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<PersistedDreamscapeCustomerLink> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const metadata = input.metadata as InputJsonValue | undefined;
  const row = await prisma.dreamscapeCustomerLink.upsert({
    where: { organisationId: input.organisationId },
    create: {
      organisationId: input.organisationId,
      dreamscapeCustomerId: input.dreamscapeCustomerId ?? null,
      contactIdentifier: input.contactIdentifier ?? null,
      customerName: input.customerName ?? null,
      metadata,
    },
    update: {
      dreamscapeCustomerId: input.dreamscapeCustomerId ?? undefined,
      contactIdentifier: input.contactIdentifier ?? undefined,
      customerName: input.customerName ?? undefined,
      metadata,
      linkedAt: new Date(),
    },
  });
  return {
    id: row.id,
    organisationId: row.organisationId,
    dreamscapeCustomerId:
      row.dreamscapeCustomerId || row.contactIdentifier || "",
    contactIdentifier: row.contactIdentifier ?? undefined,
    customerName: row.customerName ?? undefined,
    linkedAt: row.linkedAt.toISOString(),
  };
}

/**
 * Ensure Org has a Dreamscape contact (SOAP) or customer (REST).
 * Idempotent — reuses persisted link when present.
 */
export async function upsertDreamscapeCustomerForOrg(input: {
  organisationId: string;
  force?: boolean;
}): Promise<PersistedDreamscapeCustomerLink> {
  if (!isDreamscapeConfigured()) {
    throw new Error("Domain provider is not configured");
  }

  const existing = await getPersistedDreamscapeCustomerLink(input.organisationId);
  if (
    existing &&
    !input.force &&
    (existing.contactIdentifier || existing.dreamscapeCustomerId)
  ) {
    return existing;
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { name: true },
  });
  if (!org) throw new Error("Organisation not found");

  const profile =
    (await getOrganisationBusinessProfile(input.organisationId)) ?? {};
  const { apiMode, apiKey, resellerId, soapEndpoint, isSandbox, baseUrl } =
    resolveDreamscapeConfig();

  if (apiMode === "soap") {
    if (!apiKey || !resellerId) {
      throw new Error("SOAP mode requires DREAMSCAPE_API_KEY and DREAMSCAPE_RESELLER_ID");
    }
    const contact = businessProfileToSoapContact(profile, org.name);
    try {
      const created = await dreamscapeSoapContactCreate({
        endpoint: soapEndpoint,
        resellerId,
        apiKey,
        isSandbox,
        contact,
      });
      return saveLink({
        organisationId: input.organisationId,
        contactIdentifier: created.contactIdentifier,
        dreamscapeCustomerId: created.contactIdentifier,
        customerName: contact.businessName || `${contact.firstName} ${contact.lastName}`,
        metadata: { apiMode: "soap", createdVia: "ContactCreate" },
      });
    } catch (err) {
      if (err instanceof DreamscapeSoapError) {
        throw new DreamscapeApiError(err.status, err.message, err.body, {
          code: err.code,
          hint: err.hint,
          providerBodySnippet: err.providerBodySnippet,
        });
      }
      throw err;
    }
  }

  // REST customer create
  const contact = businessProfileToSoapContact(profile, org.name);
  const payload = await dreamscapeFetch<{
    id?: number | string;
    data?: { id?: number | string };
  }>("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      post_code: contact.postCode,
      country: contact.country,
      country_code: contact.countryCode,
      account_type: contact.accountType,
      business_name: contact.businessName,
      business_number_type: contact.businessNumberType,
      business_number: contact.businessNumber,
    }),
  });

  const id =
    payload && typeof payload === "object"
      ? (payload as { id?: number | string }).id ??
        (payload as { data?: { id?: number | string } }).data?.id
      : undefined;
  if (id == null) {
    throw new Error(`Customer create failed against ${baseUrl}`);
  }

  return saveLink({
    organisationId: input.organisationId,
    dreamscapeCustomerId: String(id),
    customerName: contact.businessName || `${contact.firstName} ${contact.lastName}`,
    metadata: { apiMode: "rest", createdVia: "POST /customers" },
  });
}
