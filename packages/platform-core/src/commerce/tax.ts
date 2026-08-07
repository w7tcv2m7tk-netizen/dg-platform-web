/**
 * AU-first tax helpers for Commerce documents.
 * Country Pack–ready: rate and inclusive defaults come from Business Profile when set.
 */

import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { CommerceLineItem } from "./types";

/** Australian GST = 10% */
export const AU_GST_RATE_BPS = 1000;

export type OrgTaxDefaults = {
  country: string;
  gstRegistered: boolean;
  defaultTaxRateBps: number;
  pricesIncludeTax: boolean;
  taxCode: string;
};

export function resolveOrgTaxDefaults(
  profile: OrganisationBusinessProfile | null | undefined,
  orgCurrency = "AUD",
): OrgTaxDefaults {
  const tax = profile?.taxSettings;
  const country =
    tax?.country?.trim() ||
    profile?.address?.country?.trim() ||
    (orgCurrency === "AUD" ? "AU" : "AU");
  const gstRegistered = tax?.gstRegistered ?? Boolean(profile?.abn);
  const defaultTaxRateBps =
    tax?.defaultTaxRateBps ?? (country === "AU" && gstRegistered ? AU_GST_RATE_BPS : 0);

  return {
    country,
    gstRegistered,
    defaultTaxRateBps,
    pricesIncludeTax: tax?.pricesIncludeTax ?? false,
    taxCode: defaultTaxRateBps > 0 ? "GST" : "GST_FREE",
  };
}

export function withDefaultLineTax(
  items: CommerceLineItem[],
  defaults: OrgTaxDefaults,
): CommerceLineItem[] {
  return items.map((item) => {
    if (item.taxCode === "GST_FREE" || item.taxRateBps === 0) {
      return { ...item, taxCode: item.taxCode ?? "GST_FREE", taxRateBps: 0 };
    }
    return {
      ...item,
      taxCode: item.taxCode ?? defaults.taxCode,
      taxRateBps: item.taxRateBps ?? defaults.defaultTaxRateBps,
    };
  });
}

export function computeDocumentTotals(
  items: CommerceLineItem[],
  options?: { taxInclusive?: boolean },
) {
  const taxInclusive = options?.taxInclusive ?? false;
  let subtotalCents = 0;
  let taxCents = 0;
  let totalCents = 0;

  for (const item of items) {
    const lineGross = Math.round(item.quantity * item.unitAmountCents);
    const rateBps = item.taxRateBps ?? 0;

    if (!rateBps) {
      subtotalCents += lineGross;
      totalCents += lineGross;
      continue;
    }

    if (taxInclusive) {
      const lineTax = Math.round((lineGross * rateBps) / (10000 + rateBps));
      const lineNet = lineGross - lineTax;
      subtotalCents += lineNet;
      taxCents += lineTax;
      totalCents += lineGross;
    } else {
      const lineTax = Math.round((lineGross * rateBps) / 10000);
      subtotalCents += lineGross;
      taxCents += lineTax;
      totalCents += lineGross + lineTax;
    }
  }

  return { subtotalCents, taxCents, totalCents };
}

export function formatAbn(abn?: string | null) {
  if (!abn) return "";
  const digits = abn.replace(/\D/g, "");
  if (digits.length !== 11) return abn.trim();
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
