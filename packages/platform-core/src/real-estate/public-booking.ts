import { createReBooking } from "./bookings";

export type PublicReBookingKind = "appraisal" | "buyer_consultation";

export type PublicReBookingResult =
  | {
      ok: true;
      bookingId: string;
      message: string;
    }
  | {
      ok: false;
      code: "not_found" | "validation_error" | "error";
      message: string;
    };

function isHoneypotFilled(website?: string | null) {
  return Boolean(website && website.trim());
}

async function resolveOrgId(siteSlug: string, hostname?: string | null) {
  const { getWebsiteBySlug } = await import("../websites/crud");
  const { findDomainByHostname } = await import("../infrastructure/domains/inventory");
  const slug = siteSlug.trim() || "roe-realty";
  let site = await getWebsiteBySlug(slug);
  if (!site && hostname) {
    const match = await findDomainByHostname(hostname);
    if (match?.website?.slug) {
      site = await getWebsiteBySlug(match.website.slug);
    }
  }
  if (!site) return null;
  return { organisationId: site.organisationId, siteSlug: site.slug };
}

export async function submitPublicReBooking(input: {
  siteSlug: string;
  hostname?: string | null;
  kind: PublicReBookingKind;
  fullName: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  notes?: string;
  website?: string | null;
}): Promise<PublicReBookingResult> {
  if (isHoneypotFilled(input.website)) {
    return {
      ok: true,
      bookingId: "honeypot",
      message: "Thanks — your booking request was received.",
    };
  }

  const name = input.fullName?.trim() || "";
  const email = input.email?.trim() || "";
  const date = input.date?.trim() || "";
  const time = input.time?.trim() || "";

  if (!name || name.length < 2) {
    return { ok: false, code: "validation_error", message: "Please enter your name." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "validation_error", message: "Please enter a valid email." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, code: "validation_error", message: "Please choose a date." };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, code: "validation_error", message: "Please choose a time." };
  }

  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 60_000) {
    return {
      ok: false,
      code: "validation_error",
      message: "Please choose a future date and time.",
    };
  }

  const resolved = await resolveOrgId(input.siteSlug, input.hostname);
  if (!resolved) {
    return { ok: false, code: "not_found", message: "Website not found." };
  }

  const kind = input.kind === "buyer_consultation" ? "buyer_consultation" : "appraisal";
  const service =
    kind === "buyer_consultation" ? "Buyer Consultation" : "Property Appraisal";

  try {
    const booking = await createReBooking({
      organisationId: resolved.organisationId,
      contactName: name,
      email,
      phone: input.phone?.trim() || undefined,
      service,
      bookingType: kind,
      scheduledAt: scheduledAt.toISOString(),
      notes: input.notes?.trim() || undefined,
    });

    return {
      ok: true,
      bookingId: booking.id,
      message:
        kind === "buyer_consultation"
          ? "Thanks — your buyer consultation is booked. We’ll send a confirmation shortly."
          : "Thanks — your property appraisal is booked. We’ll send a confirmation shortly.",
    };
  } catch (err) {
    console.error("[public-booking] create failed", err);
    return {
      ok: false,
      code: "error",
      message: "Could not complete booking. Please try again or call us.",
    };
  }
}
