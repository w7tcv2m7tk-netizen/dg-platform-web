/**
 * Whether a stay has enough identity to create a CRM Guest.
 *
 * Airbnb / Booking.com iCal only gives blocked dates and placeholder titles
 * ("Reserved", "Airbnb guest"). Do not create Contacts from that until an OTA
 * API supplies a real name + email or phone.
 */

export function hasStayGuestIdentity(
  email?: string | null,
  phone?: string | null,
): boolean {
  return Boolean(email?.trim() || phone?.trim());
}

export function isOtaPlaceholderGuestName(name?: string | null): boolean {
  const s = (name || "").trim();
  if (!s) return true;
  if (/airbnb|booking\.com|bookingcom/i.test(s)) return true;
  if (/not available/i.test(s)) return true;
  return /^(reserved|blocked|unavailable|closed)\b/i.test(s);
}

function looksLikeOtaChannel(hay: string): boolean {
  return /airbnb|booking\.com|bookingcom|ical|ota|expedia/i.test(hay);
}

export function shouldCreateGuestContactFromStay(input: {
  email?: string | null;
  phone?: string | null;
  guestName?: string | null;
  status?: string | null;
  source?: string | null;
  ref?: string | null;
}): boolean {
  if (hasStayGuestIdentity(input.email, input.phone)) return true;
  if (isOtaPlaceholderGuestName(input.guestName)) return false;
  const hay = [input.status, input.source, input.ref].filter(Boolean).join(" ");
  if (looksLikeOtaChannel(hay)) return false;
  return Boolean(input.guestName?.trim());
}
