/**
 * Shared transactional email HTML shell — org wordmark/logo from business profile / brand presets.
 * Absolute HTTPS image URLs only (email clients block relative paths).
 *
 * Layout contract (all themes):
 * - Header: logo / wordmark only (no icon lockup)
 * - Footer: icon mark only (+ copyright / note)
 * - Mobile: viewport meta, fluid max-width images, 16px outer padding
 */

import {
  ORG_BRAND_PRESETS,
  applyBrandPresetToProfile,
  resolveOrgBrandPresetKey,
  type OrgBrandPresetKey,
} from "../org/brand-presets";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { absoluteBrandAssetUrl, parseBrandColours } from "../org/brand-theme";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import {
  escapeHtml,
  plainTextToEmailHtml,
} from "./email-html";

export {
  composeEmailBody,
  emailButton,
  emailDivider,
  emailHeading,
  emailHighlight,
  emailKeyValueRows,
  emailKicker,
  emailList,
  emailParagraph,
  emailScoreCard,
  emailSignoff,
  escapeHtml,
  markdownToEmailHtml,
  plainTextToEmailHtml,
  type EmailBodyBlock,
} from "./email-html";

const DG_FALLBACK_LOGO =
  ORG_BRAND_PRESETS.digitalgate.patch.logoUrl ??
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";
const DG_FALLBACK_ICON =
  ORG_BRAND_PRESETS.digitalgate.patch.iconUrl ??
  "https://app.digitalgate.com.au/brand/icon-light.png";

export type EmailBrandAssets = {
  businessName: string;
  logoUrl: string;
  iconUrl: string;
  primaryColor: string;
  accentColor: string;
  /** Resend `from` — display name + mailbox for this brand. */
  fromAddress: string;
  /** Human inbox for replies (apex hello@, not the Resend send subdomain). */
  replyTo: string;
};

/** Verified Resend sending mailboxes (must match a verified Resend domain). */
const BRAND_FROM_MAILBOX: Record<OrgBrandPresetKey, string> = {
  // Only mail.digitalgate.com.au is verified on the current Resend plan.
  digitalgate: "hello@mail.digitalgate.com.au",
  "roe-realty": "hello@mail.digitalgate.com.au",
  cvh: "hello@mail.digitalgate.com.au",
  aetherra: "hello@mail.digitalgate.com.au",
  wantd: "hello@mail.digitalgate.com.au",
};

/** Human inboxes for Reply-To (MX on normal mailbox host — not Resend). */
const BRAND_REPLY_TO_MAILBOX: Record<OrgBrandPresetKey, string> = {
  digitalgate: "hello@digitalgate.com.au",
  "roe-realty": "hello@roerealty.com.au",
  cvh: "hello@currumbinvalleyhideaway.com.au",
  aetherra: "hello@aetherra.com.au",
  wantd: "hello@wantdproperty.com.au",
};

const PLATFORM_FROM = "DigitalGate <hello@mail.digitalgate.com.au>";
const PLATFORM_REPLY_TO = "hello@digitalgate.com.au";

function formatFromAddress(businessName: string, mailbox: string): string {
  const name = businessName.replace(/[<>\n\r]/g, "").trim() || "DigitalGate";
  const email = mailbox.trim().toLowerCase();
  return `${name} <${email}>`;
}

export function resolveBrandFromAddress(
  presetKey: OrgBrandPresetKey | null | undefined,
  businessName?: string,
): string {
  if (!presetKey) return PLATFORM_FROM;
  const mailbox = BRAND_FROM_MAILBOX[presetKey];
  const label = businessName?.trim() || ORG_BRAND_PRESETS[presetKey].label;
  return formatFromAddress(label, mailbox);
}

/** Extract bare mailbox from `Name <a@b>` or `a@b`. */
export function parseMailbox(fromAddress: string): string | null {
  const raw = fromAddress.trim();
  if (!raw) return null;
  const angled = raw.match(/<([^>\s]+@[^>\s]+)>/);
  const candidate = (angled?.[1] || raw).trim().toLowerCase();
  return candidate.includes("@") ? candidate : null;
}

/** Reply-To for branded sends — brand inbox even when From is mail.digitalgate.com.au. */
export function brandReplyTo(
  fromAddress: string,
  presetKey?: OrgBrandPresetKey | null,
): string | null {
  if (presetKey && BRAND_REPLY_TO_MAILBOX[presetKey]) {
    return BRAND_REPLY_TO_MAILBOX[presetKey];
  }
  const mailbox = parseMailbox(fromAddress);
  if (!mailbox) return PLATFORM_REPLY_TO;
  if (mailbox.endsWith("@mail.digitalgate.com.au")) {
    return PLATFORM_REPLY_TO;
  }
  return mailbox;
}


export type WrapTransactionalEmailInput = {
  businessName: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bodyHtml: string;
  footerNote?: string;
};

/** DigitalGate product brand — used for platform-owned emails (e.g. Refer & Earn). */
export function resolvePlatformEmailBrandAssets(): EmailBrandAssets {
  const preset = ORG_BRAND_PRESETS.digitalgate;
  const colours = parseBrandColours(preset.patch.brandColours);
  return {
    businessName: preset.label,
    logoUrl:
      absoluteBrandAssetUrl(preset.patch.logoUrl) || DG_FALLBACK_LOGO,
    iconUrl:
      absoluteBrandAssetUrl(preset.patch.iconUrl) || DG_FALLBACK_ICON,
    primaryColor: colours[0] ?? "#3B82F6",
    accentColor: colours[1] ?? colours[0] ?? "#10B981",
    fromAddress: PLATFORM_FROM,
    replyTo: PLATFORM_REPLY_TO,
  };
}

/** Resolve wordmark logo + icon + colours for an org (profile → preset → DigitalGate fallback). */
export function resolveEmailBrandAssets(input: {
  organisationId?: string;
  organisationName?: string;
  organisationSlug?: string;
  industry?: string | null;
  profile?: OrganisationBusinessProfile | null;
  settings?: unknown;
}): EmailBrandAssets {
  const name =
    input.organisationName?.trim() ||
    input.profile?.tradingName?.trim() ||
    input.profile?.businessName?.trim() ||
    "DigitalGate";
  const orgLike = {
    id: input.organisationId ?? "unknown",
    name,
    slug: input.organisationSlug ?? "",
    industry: input.industry,
    settings: input.settings,
  };

  let profile = input.profile ?? {};
  profile = applyBrandPresetToProfile(orgLike, profile);

  const colours = parseBrandColours(profile.brandColours);
  const presetKey: OrgBrandPresetKey | null = resolveOrgBrandPresetKey(orgLike);
  const preset = presetKey ? ORG_BRAND_PRESETS[presetKey] : null;

  let logoUrl =
    absoluteBrandAssetUrl(profile.logoUrl) ||
    absoluteBrandAssetUrl(preset?.patch.logoUrl) ||
    DG_FALLBACK_LOGO;

  let iconUrl =
    absoluteBrandAssetUrl(profile.iconUrl) ||
    absoluteBrandAssetUrl(preset?.patch.iconUrl) ||
    absoluteBrandAssetUrl(logoUrl) ||
    DG_FALLBACK_ICON;

  // CVH WP uploads often ship a combined logo+icon lockup — emails need separate marks.
  if (presetKey === "cvh") {
    if (/logo-and-icon|Logo-and-Icon/i.test(logoUrl || "")) {
      logoUrl = absoluteBrandAssetUrl("/brand/cvh-logo.png") || logoUrl;
    }
    iconUrl = absoluteBrandAssetUrl("/brand/cvh-icon.png") || iconUrl;
  }

  // Roe profiles historically stored the R mark as both logo and icon — emails need the wordmark in the header.
  if (presetKey === "roe-realty") {
    const wordmark =
      absoluteBrandAssetUrl("/brand/roe-logo.png") ||
      "https://roerealty.com.au/wp-content/uploads/2026/05/ROE-Realty-Web-Main.png";
    const mark =
      absoluteBrandAssetUrl("/brand/roe-icon.png") ||
      "https://roerealty.com.au/wp-content/uploads/2026/05/R-Main.png";
    if (/R-Main/i.test(logoUrl || "") || logoUrl === iconUrl) {
      logoUrl = wordmark;
    }
    iconUrl = mark;
  }

  return {
    businessName:
      profile.tradingName?.trim() || profile.businessName?.trim() || name,
    logoUrl: logoUrl!,
    iconUrl: iconUrl!,
    primaryColor: colours[0] ?? "#3B82F6",
    accentColor: colours[1] ?? colours[0] ?? "#10B981",
    fromAddress: resolveBrandFromAddress(
      presetKey,
      profile.tradingName?.trim() || profile.businessName?.trim() || name,
    ),
    replyTo:
      brandReplyTo(
        resolveBrandFromAddress(
          presetKey,
          profile.tradingName?.trim() || profile.businessName?.trim() || name,
        ),
        presetKey,
      ) || PLATFORM_REPLY_TO,
  };
}

/** Sync HTML wrap — logo in header, icon in footer. Mobile-first table layout. */
export function wrapTransactionalEmail(input: WrapTransactionalEmailInput): string {
  const businessName = input.businessName.trim() || "DigitalGate";
  const logoUrl = absoluteBrandAssetUrl(input.logoUrl) || DG_FALLBACK_LOGO;
  const iconUrl =
    absoluteBrandAssetUrl(input.iconUrl) ||
    absoluteBrandAssetUrl(logoUrl) ||
    DG_FALLBACK_ICON;
  const primary = input.primaryColor || "#3B82F6";
  const footer =
    input.footerNote?.trim() || `You're receiving this email from ${businessName}.`;
  const alt = escapeHtml(businessName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${alt}</title>
<style type="text/css">
@media only screen and (max-width:620px){
  .dg-email-outer{padding:16px 12px !important;}
  .dg-email-card{border-radius:16px !important;}
  .dg-email-pad{padding:24px 18px !important;}
  .dg-email-logo{max-width:160px !important;width:160px !important;}
  .dg-email-icon{max-width:40px !important;width:40px !important;}
}
a{color:#93C5FD;}
</style>
</head>
<body style="margin:0;padding:0;background:#070B14;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="dg-email-outer" style="background:#070B14;padding:32px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="dg-email-card" style="max-width:600px;width:100%;background:#121826;border:1px solid rgba(148,163,184,0.14);border-radius:24px;overflow:hidden;">
<tr><td style="height:4px;line-height:4px;font-size:0;background:${escapeHtml(primary)};">&nbsp;</td></tr>
<tr><td class="dg-email-pad" style="padding:28px 32px 22px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
<img class="dg-email-logo" src="${escapeHtml(logoUrl!)}" alt="${alt}" width="180" style="max-width:180px;width:180px;height:auto;display:inline-block;margin:0 auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td class="dg-email-pad" style="padding:32px;color:#E2E8F0;font-size:16px;line-height:1.65;">${input.bodyHtml}</td></tr>
<tr><td class="dg-email-pad" style="padding:24px 32px 32px;background:#0A0F1A;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px;border-collapse:collapse;"><tr><td align="center" style="text-align:center;">
<img class="dg-email-icon" src="${escapeHtml(iconUrl!)}" alt="" width="40" height="40" style="display:inline-block;width:40px;max-width:40px;height:auto;border:0;outline:none;opacity:0.9;margin:0;">
</td></tr></table>
<p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">© ${new Date().getFullYear()} ${alt}</p>
<p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#475569;">${escapeHtml(footer)}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Load org profile and render a branded transactional email. */
export async function renderOrgTransactionalEmail(input: {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  industry?: string | null;
  bodyHtml?: string;
  bodyText?: string;
  footerNote?: string;
  /**
   * `platform` forces DigitalGate product branding (ignores tenant Business Profile).
   * Use for platform-owned mail such as Refer & Earn invites.
   */
  brandMode?: "org" | "platform";
}): Promise<{ html: string; brand: EmailBrandAssets }> {
  let brand: EmailBrandAssets;

  if (input.brandMode === "platform") {
    brand = resolvePlatformEmailBrandAssets();
  } else {
    let profile: OrganisationBusinessProfile | null = null;
    let orgMeta: {
      name: string;
      slug: string;
      industry: string | null;
      settings: unknown;
    } | null = null;

    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@dg/database");
        const org = await prisma.organisation.findUnique({
          where: { id: input.organisationId },
          select: { name: true, slug: true, industry: true, settings: true },
        });
        if (org) {
          orgMeta = {
            name: org.name,
            slug: org.slug,
            industry: org.industry,
            settings: org.settings,
          };
          profile =
            ((org.settings as { profile?: OrganisationBusinessProfile } | null)?.profile ??
              null) ||
            (await getOrganisationBusinessProfile(input.organisationId));
        }
      } catch {
        profile = await getOrganisationBusinessProfile(input.organisationId);
      }
    }

    brand = resolveEmailBrandAssets({
      organisationId: input.organisationId,
      organisationName: input.organisationName || orgMeta?.name,
      organisationSlug: input.organisationSlug || orgMeta?.slug,
      industry: input.industry ?? orgMeta?.industry,
      profile,
      settings: orgMeta?.settings,
    });
  }

  const bodyHtml =
    input.bodyHtml?.trim() ||
    plainTextToEmailHtml(input.bodyText ?? "", {
      accentColor: brand.accentColor || brand.primaryColor,
      ctaLabel: "Open link",
    }) ||
    '<p style="margin:0;color:#E2E8F0;">&nbsp;</p>';

  const html = wrapTransactionalEmail({
    businessName: brand.businessName,
    logoUrl: brand.logoUrl,
    iconUrl: brand.iconUrl,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    bodyHtml,
    footerNote: input.footerNote,
  });

  return { html, brand };
}
