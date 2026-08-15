/**
 * Public stay unit pages (CVH Gen 2 cutover) — Neon unit + availability for bookable stays.
 */

import { captureWebsiteFormSubmission } from "../websites/form-capture";
import { getWebsiteBySlug } from "../websites/crud";
import { buildAvailabilityFromNeon, listAccommodationUnits } from "./units";

export const CVH_BOOKABLE_UNIT_SLUGS = ["private-studio", "tiny-home"] as const;

export type CvhBookableUnitSlug = (typeof CVH_BOOKABLE_UNIT_SLUGS)[number];

/** Blob heroes when WP media URLs are offline after apex cutover. */
export const CVH_UNIT_HERO_FALLBACK: Record<CvhBookableUnitSlug, string> = {
  "private-studio":
    "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi1mggj0000ib04kvavtx4p/wp-migrate/11c7bd22c7360673.avif",
  "tiny-home":
    "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi1mggj0000ib04kvavtx4p/wp-migrate/981600a136c4da1f.avif",
};

export const CVH_FEATURE_LABELS: Record<string, string> = {
  fire_pit: "🔥 Fire Pit",
  mountain_views: "⛰️ Mountain Views",
  sauna: "🧖 Sauna",
  outdoor_shower: "🚿 Outdoor Shower",
  air_conditioning: "❄️ Air Conditioning",
  pet_friendly: "🐾 Pet Friendly",
  wifi: "📶 WiFi",
  kitchenette: "🍳 Kitchenette",
  bbq: "🥩 BBQ",
  parking: "🚗 Parking",
  private_deck: "🏠 Private Deck",
  spa: "💆 Spa",
};

export function resolveStayUnitSlug(
  pageSlug: string | undefined | null,
): CvhBookableUnitSlug | null {
  if (!pageSlug) return null;
  const leaf = pageSlug.split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
  if ((CVH_BOOKABLE_UNIT_SLUGS as readonly string[]).includes(leaf)) {
    return leaf as CvhBookableUnitSlug;
  }
  return null;
}

export type PublicStayUnitPayload = {
  id: string;
  slug: CvhBookableUnitSlug;
  title: string;
  description: string | null;
  listingStatus: string;
  weekdayRate: number | null;
  weekendRate: number | null;
  cleaningFee: number | null;
  sleeps: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  minNights: number | null;
  checkinTime: string | null;
  checkoutTime: string | null;
  features: Array<{ key: string; label: string }>;
  heroImageUrl: string | null;
  blockedDates: string[];
  bookableSiblingSlugs: CvhBookableUnitSlug[];
};

function featureList(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return [];
  const out: Array<{ key: string; label: string }> = [];
  for (const [key, value] of Object.entries(raw)) {
    const on = value === true || value === 1 || value === "1";
    if (!on) continue;
    const label = CVH_FEATURE_LABELS[key] ?? key.replace(/_/g, " ");
    out.push({ key, label });
  }
  return out;
}

function heroFor(
  slug: CvhBookableUnitSlug,
  featuredImageUrl: string | null | undefined,
): string | null {
  const raw = featuredImageUrl?.trim() || "";
  if (raw && !/currumbinvalleyhideaway\.com\.au\/wp-content/i.test(raw)) {
    return raw;
  }
  return CVH_UNIT_HERO_FALLBACK[slug] ?? (raw || null);
}

export async function getPublicStayUnit(
  organisationId: string,
  unitSlug: string,
): Promise<PublicStayUnitPayload | null> {
  const resolved = resolveStayUnitSlug(unitSlug);
  if (!resolved) return null;

  const units = await listAccommodationUnits(organisationId);
  const unit = units.find((u) => (u.slug || "").toLowerCase() === resolved);
  if (!unit) return null;

  const from = new Date().toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setUTCMonth(toDate.getUTCMonth() + 12);
  const to = toDate.toISOString().slice(0, 10);

  const availability = await buildAvailabilityFromNeon(organisationId, {
    from,
    to,
    propertyId: unit.externalWpId ?? undefined,
  });
  const row =
    availability.units.find((u) => u.platform_id === unit.id) ||
    availability.units.find(
      (u) => unit.externalWpId != null && u.id === unit.externalWpId,
    );

  const bookableSiblingSlugs = CVH_BOOKABLE_UNIT_SLUGS.filter((slug) =>
    units.some(
      (u) =>
        (u.slug || "").toLowerCase() === slug &&
        (u.listingStatus === "bookable" || !u.listingStatus),
    ),
  );

  return {
    id: unit.id,
    slug: resolved,
    title: unit.title,
    description: unit.description ?? null,
    listingStatus: unit.listingStatus,
    weekdayRate: unit.weekdayRate ?? null,
    weekendRate: unit.weekendRate ?? null,
    cleaningFee: unit.cleaningFee ?? null,
    sleeps: unit.sleeps ?? null,
    bedrooms: unit.bedrooms ?? null,
    bathrooms: unit.bathrooms ?? null,
    maxGuests: unit.maxGuests ?? null,
    minNights: unit.minNights ?? null,
    checkinTime: unit.checkinTime ?? null,
    checkoutTime: unit.checkoutTime ?? null,
    features: featureList(unit.features ?? undefined),
    heroImageUrl: heroFor(resolved, unit.featuredImageUrl),
    blockedDates: row?.blocked_dates ?? [],
    bookableSiblingSlugs,
  };
}

export async function getPublicStayUnitForSite(
  siteSlug: string,
  unitSlug: string,
): Promise<PublicStayUnitPayload | null> {
  const site =
    (await getWebsiteBySlug(siteSlug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(siteSlug));
  if (!site) return null;
  return getPublicStayUnit(site.organisationId, unitSlug);
}

export async function submitPublicStayEnquiry(input: {
  siteSlug: string;
  unitSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  message?: string;
}): Promise<
  | { ok: true; contactId: string; leadId: string }
  | { ok: false; code: string; message: string }
> {
  const unit = await getPublicStayUnitForSite(input.siteSlug, input.unitSlug);
  if (!unit) {
    return { ok: false, code: "not_found", message: "Stay not found" };
  }

  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const lines = [
    `Stay enquiry — ${unit.title}`,
    input.checkin && input.checkout
      ? `Dates: ${input.checkin} → ${input.checkout}`
      : null,
    input.guests ? `Guests: ${input.guests}` : null,
    input.message?.trim() || null,
  ].filter(Boolean);

  return captureWebsiteFormSubmission({
    siteSlug: input.siteSlug,
    name,
    email: input.email,
    phone: input.phone,
    message: lines.join("\n"),
    pageSlug: unit.slug,
  });
}
