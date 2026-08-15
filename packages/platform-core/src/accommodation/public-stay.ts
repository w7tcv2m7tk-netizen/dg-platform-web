/**
 * Public stay unit pages (CVH Gen 2 cutover) — Neon unit + availability for bookable stays.
 */

import { bootPaymentConnectors, requirePaymentConnector } from "../commerce/connectors";
import { captureWebsiteFormSubmission } from "../websites/form-capture";
import { getWebsiteBySlug } from "../websites/crud";
import { createStayBookingGen2First } from "./bookings";
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

/** Restore CVH discount defaults when unit metadata has no rates set. */
export const CVH_UNIT_DISCOUNT_DEFAULTS: Record<
  CvhBookableUnitSlug,
  { lastMinute: number; earlyBird: number }
> = {
  "private-studio": { lastMinute: 10, earlyBird: 5 },
  "tiny-home": { lastMinute: 10, earlyBird: 5 },
};

export const CVH_PAYID_EMAIL = "payid@currumbinvalleyhideaway.com.au";

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

export type PublicStayQuote = {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  discountAmount: number;
  discountPercent: number;
  discountType: "" | "Last Minute" | "Early Bird";
  total: number;
};

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
  galleryImageUrls: string[];
  lastMinuteDiscount: number;
  earlyBirdDiscount: number;
  payidEmail: string;
  stripeEnabled: boolean;
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

function asUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim());
}

function discountFromMeta(
  slug: CvhBookableUnitSlug,
  metadata: Record<string, unknown> | null | undefined,
  key: "last_minute_discount" | "early_bird_discount",
  fallbackKey: "lastMinute" | "earlyBird",
): number {
  const raw = metadata?.[key];
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : NaN;
  if (Number.isFinite(n) && n >= 0) return Math.min(50, Math.round(n));
  return CVH_UNIT_DISCOUNT_DEFAULTS[slug][fallbackKey];
}

function parseLocalDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function eachNight(checkin: string, checkout: string) {
  const nights: string[] = [];
  const start = parseLocalDate(checkin);
  const end = parseLocalDate(checkout);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    nights.push(`${y}-${m}-${day}`);
  }
  return nights;
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Match WP `DG_Acc_Frontend::calculate_discount` (0–3 last minute, 3–14 early bird). */
export function calculateStayDiscount(input: {
  checkin: string;
  subtotal: number;
  lastMinuteDiscount: number;
  earlyBirdDiscount: number;
  today?: string;
}): { amount: number; percent: number; type: "" | "Last Minute" | "Early Bird" } {
  const today = input.today ?? todayYmd();
  const daysUntil = Math.floor(
    (parseLocalDate(input.checkin).getTime() - parseLocalDate(today).getTime()) /
      86_400_000,
  );
  let percent = 0;
  let type: "" | "Last Minute" | "Early Bird" = "";
  if (daysUntil >= 0 && daysUntil <= 3 && input.lastMinuteDiscount > 0) {
    percent = input.lastMinuteDiscount;
    type = "Last Minute";
  } else if (daysUntil > 3 && daysUntil <= 14 && input.earlyBirdDiscount > 0) {
    percent = input.earlyBirdDiscount;
    type = "Early Bird";
  }
  const amount =
    percent > 0 ? Math.round(input.subtotal * (percent / 100) * 100) / 100 : 0;
  return { amount, percent, type };
}

export function quotePublicStay(input: {
  weekdayRate: number | null;
  weekendRate: number | null;
  cleaningFee: number | null;
  lastMinuteDiscount: number;
  earlyBirdDiscount: number;
  checkin: string;
  checkout: string;
  today?: string;
}): PublicStayQuote {
  const nights = eachNight(input.checkin, input.checkout);
  let subtotal = 0;
  for (const night of nights) {
    const dow = parseLocalDate(night).getDay();
    const weekend = dow === 5 || dow === 6 || dow === 0;
    const rate = weekend
      ? (input.weekendRate ?? input.weekdayRate ?? 0)
      : (input.weekdayRate ?? 0);
    subtotal += rate;
  }
  const cleaning = input.cleaningFee ?? 0;
  const discount = calculateStayDiscount({
    checkin: input.checkin,
    subtotal,
    lastMinuteDiscount: input.lastMinuteDiscount,
    earlyBirdDiscount: input.earlyBirdDiscount,
    today: input.today,
  });
  return {
    nights: nights.length,
    subtotal,
    cleaningFee: cleaning,
    discountAmount: discount.amount,
    discountPercent: discount.percent,
    discountType: discount.type,
    total: Math.max(0, subtotal - discount.amount + cleaning),
  };
}

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function galleryFor(
  slug: CvhBookableUnitSlug,
  galleryUrls: unknown,
  featuredImageUrl: string | null | undefined,
): string[] {
  const fromDb = asUrlList(galleryUrls).filter(
    (u) => !/currumbinvalleyhideaway\.com\.au\/wp-content/i.test(u),
  );
  const hero = heroFor(slug, featuredImageUrl);
  const out: string[] = [];
  for (const url of [...fromDb, hero].filter(Boolean) as string[]) {
    if (!out.includes(url)) out.push(url);
  }
  return out;
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

  const meta = (unit.metadata ?? null) as Record<string, unknown> | null;

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
    galleryImageUrls: galleryFor(resolved, unit.galleryUrls, unit.featuredImageUrl),
    lastMinuteDiscount: discountFromMeta(
      resolved,
      meta,
      "last_minute_discount",
      "lastMinute",
    ),
    earlyBirdDiscount: discountFromMeta(
      resolved,
      meta,
      "early_bird_discount",
      "earlyBird",
    ),
    payidEmail: CVH_PAYID_EMAIL,
    stripeEnabled: stripeConfigured(),
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

function safeReturnBase(url: string | undefined | null): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function bookingRef(prefix: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${stamp}-${rand}`;
}

export async function createPublicStayCheckout(input: {
  siteSlug: string;
  unitSlug: string;
  method: "stripe" | "payid";
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkin: string;
  checkout: string;
  guests?: number;
  message?: string;
  returnBaseUrl?: string;
}): Promise<
  | {
      ok: true;
      method: "payid";
      bookingId: string;
      ref: string;
      payidEmail: string;
      total: number;
      quote: PublicStayQuote;
    }
  | {
      ok: true;
      method: "stripe";
      bookingId: string;
      ref: string;
      checkoutUrl: string;
      total: number;
      quote: PublicStayQuote;
    }
  | { ok: false; code: string; message: string }
> {
  const site =
    (await getWebsiteBySlug(input.siteSlug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(input.siteSlug));
  if (!site) {
    return { ok: false, code: "not_found", message: "Site not found" };
  }

  const unit = await getPublicStayUnit(site.organisationId, input.unitSlug);
  if (!unit) {
    return { ok: false, code: "not_found", message: "Stay not found" };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  if (!firstName || !lastName || !email) {
    return {
      ok: false,
      code: "validation_error",
      message: "Name and email are required",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(input.checkout)) {
    return {
      ok: false,
      code: "validation_error",
      message: "Select check-in and check-out dates",
    };
  }
  if (input.checkout <= input.checkin) {
    return {
      ok: false,
      code: "validation_error",
      message: "Check-out must be after check-in",
    };
  }

  const quote = quotePublicStay({
    weekdayRate: unit.weekdayRate,
    weekendRate: unit.weekendRate,
    cleaningFee: unit.cleaningFee,
    lastMinuteDiscount: unit.lastMinuteDiscount,
    earlyBirdDiscount: unit.earlyBirdDiscount,
    checkin: input.checkin,
    checkout: input.checkout,
  });

  if (quote.nights < 1) {
    return { ok: false, code: "validation_error", message: "Invalid stay length" };
  }
  if (unit.minNights && quote.nights < unit.minNights) {
    return {
      ok: false,
      code: "validation_error",
      message: `Minimum stay is ${unit.minNights} night${unit.minNights > 1 ? "s" : ""}`,
    };
  }

  const guestName = `${firstName} ${lastName}`.trim();
  const ref = bookingRef(input.method === "payid" ? "PAYID" : "STAY");

  const created = await createStayBookingGen2First(site.organisationId, {
    guestName,
    email,
    phone: input.phone,
    accommodationUnitId: unit.id,
    accommodationWpId: undefined,
    checkin: input.checkin,
    checkout: input.checkout,
    guests: input.guests,
    nights: quote.nights,
    total: quote.total,
    status: "pending",
    source: "website",
    message: input.message,
    ref,
    paid: "no",
    paymentMethod: input.method,
  });

  if (!created.ok) {
    return {
      ok: false,
      code: created.code,
      message: created.message,
    };
  }

  // Keep CRM enquiry trail alongside paid bookings.
  await captureWebsiteFormSubmission({
    siteSlug: input.siteSlug,
    name: guestName,
    email,
    phone: input.phone,
    message: [
      `Stay booking (${input.method}) — ${unit.title}`,
      `Ref: ${ref}`,
      `Dates: ${input.checkin} → ${input.checkout}`,
      `Guests: ${input.guests ?? 1}`,
      quote.discountType
        ? `Discount: ${quote.discountType} ${quote.discountPercent}% (−$${quote.discountAmount.toFixed(2)})`
        : null,
      `Total: $${quote.total.toFixed(2)}`,
      input.message?.trim() || null,
    ]
      .filter(Boolean)
      .join("\n"),
    pageSlug: unit.slug,
  }).catch(() => null);

  if (input.method === "payid") {
    return {
      ok: true,
      method: "payid",
      bookingId: created.booking.id,
      ref,
      payidEmail: unit.payidEmail,
      total: quote.total,
      quote,
    };
  }

  if (!stripeConfigured()) {
    return {
      ok: false,
      code: "stripe_not_configured",
      message: "Card payments are temporarily unavailable — try PayID",
    };
  }

  const returnBase =
    safeReturnBase(input.returnBaseUrl) ||
    `https://currumbinvalleyhideaway.com.au/${unit.slug}`;

  bootPaymentConnectors();
  const connector = requirePaymentConnector("stripe");
  const amountCents = Math.max(50, Math.round(quote.total * 100));

  try {
    const session = await connector.createCheckoutSession({
      organisationId: site.organisationId,
      paymentRequestId: created.booking.id,
      currency: "AUD",
      allowedMethods: ["card"],
      customerEmail: email,
      customerName: guestName,
      successUrl: `${returnBase}?booking=success&ref=${encodeURIComponent(ref)}`,
      cancelUrl: `${returnBase}?booking=cancelled&ref=${encodeURIComponent(ref)}`,
      lineItems: [
        {
          description: `${unit.title} · ${input.checkin} → ${input.checkout} (${quote.nights} night${quote.nights === 1 ? "" : "s"})`,
          quantity: 1,
          unitAmountCents: amountCents,
        },
      ],
      metadata: {
        dg_kind: "stay_booking",
        stayBookingId: created.booking.id,
        organisationId: site.organisationId,
        unitSlug: unit.slug,
        ref,
      },
    });

    return {
      ok: true,
      method: "stripe",
      bookingId: created.booking.id,
      ref,
      checkoutUrl: session.checkoutUrl,
      total: quote.total,
      quote,
    };
  } catch (err) {
    return {
      ok: false,
      code: "stripe_error",
      message: err instanceof Error ? err.message : "Could not start card checkout",
    };
  }
}

/** Mark a Gen 2 stay paid after Stripe Checkout completes. */
export async function markPublicStayPaidFromStripe(input: {
  organisationId: string;
  stayBookingId: string;
  providerPaymentId?: string;
  amountCents?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "database_not_configured" };
  }
  const { prisma } = await import("@dg/database");
  const booking = await prisma.stayBooking.findFirst({
    where: {
      id: input.stayBookingId,
      organisationId: input.organisationId,
    },
  });
  if (!booking) return { ok: false, reason: "booking_not_found" };

  const meta = (booking.metadata as Record<string, unknown> | null) ?? {};
  await prisma.stayBooking.update({
    where: { id: booking.id },
    data: {
      status: booking.status === "cancelled" ? booking.status : "confirmed",
      totalCents:
        input.amountCents != null && input.amountCents > 0
          ? input.amountCents
          : booking.totalCents,
      metadata: {
        ...meta,
        paid: "yes",
        payment_method: "stripe",
        stripe_payment_id: input.providerPaymentId ?? meta.stripe_payment_id ?? null,
        paid_at: new Date().toISOString(),
      },
    },
  });
  return { ok: true };
}
