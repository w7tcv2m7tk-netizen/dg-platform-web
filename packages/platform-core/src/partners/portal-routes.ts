/**
 * Partner portal entry URLs — canonical paths on app.digitalgate.com.au
 *
 * Acquisition (Resellers / Channel Managers): /acquisition
 * Delivery (Delivery Partners): /delivery
 *
 * Legacy /partner/* routes redirect here. Internal app files may still live under
 * src/app/(shell)/partner until a full route move — next.config rewrites map public URLs.
 */

export const ACQUISITION_PORTAL_HREF = "/acquisition";
export const DELIVERY_PARTNER_PORTAL_HREF = "/delivery";

export const ACQUISITION_PORTAL_ROUTES = {
  home: ACQUISITION_PORTAL_HREF,
  referrals: `${ACQUISITION_PORTAL_HREF}/referrals`,
  commissions: `${ACQUISITION_PORTAL_HREF}/commissions`,
  playbook: `${ACQUISITION_PORTAL_HREF}/playbook`,
  demo: `${ACQUISITION_PORTAL_HREF}/demo`,
  resources: `${ACQUISITION_PORTAL_HREF}/resources`,
  terms: `${ACQUISITION_PORTAL_HREF}/terms`,
  profile: `${ACQUISITION_PORTAL_HREF}/profile`,
} as const;

export const DELIVERY_PARTNER_PORTAL_ROUTES = {
  home: DELIVERY_PARTNER_PORTAL_HREF,
  projects: `${DELIVERY_PARTNER_PORTAL_HREF}/projects`,
  tasks: `${DELIVERY_PARTNER_PORTAL_HREF}/tasks`,
  customers: `${DELIVERY_PARTNER_PORTAL_HREF}/customers`,
  plans: `${DELIVERY_PARTNER_PORTAL_HREF}/plans`,
  training: `${DELIVERY_PARTNER_PORTAL_HREF}/training`,
  qa: `${DELIVERY_PARTNER_PORTAL_HREF}/qa`,
  activity: `${DELIVERY_PARTNER_PORTAL_HREF}/activity`,
  documents: `${DELIVERY_PARTNER_PORTAL_HREF}/documents`,
  reports: `${DELIVERY_PARTNER_PORTAL_HREF}/reports`,
  profile: `${ACQUISITION_PORTAL_ROUTES.profile}`,
} as const;

/** Full URL for emails and external copy */
export function acquisitionPortalUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.digitalgate.com.au";
  return `${base.replace(/\/$/, "")}${path || ACQUISITION_PORTAL_HREF}`;
}

export function deliveryPartnerPortalUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.digitalgate.com.au";
  return `${base.replace(/\/$/, "")}${path || DELIVERY_PARTNER_PORTAL_HREF}`;
}
