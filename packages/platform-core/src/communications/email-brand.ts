/**
 * Shared transactional email HTML shell — org wordmark/logo from business profile / brand presets.
 * Absolute HTTPS image URLs only (email clients block relative paths).
 * Header is logo-only (no icon lockup) — matches AU invoice letterhead.
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

const DG_FALLBACK_LOGO =
  ORG_BRAND_PRESETS.digitalgate.patch.logoUrl ??
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";

export type EmailBrandAssets = {
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
};

export type WrapTransactionalEmailInput = {
  businessName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bodyHtml: string;
  footerNote?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolve wordmark logo + colours for an org (profile → preset → DigitalGate fallback). */
export function resolveEmailBrandAssets(input: {
  organisationId?: string;
  organisationName?: string;
  organisationSlug?: string;
  industry?: string | null;
  profile?: OrganisationBusinessProfile | null;
  settings?: unknown;
}): EmailBrandAssets {
  const name = input.organisationName?.trim() || input.profile?.tradingName?.trim()
    || input.profile?.businessName?.trim() || "DigitalGate";
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

  const logoUrl =
    absoluteBrandAssetUrl(profile.logoUrl) ||
    absoluteBrandAssetUrl(preset?.patch.logoUrl) ||
    DG_FALLBACK_LOGO;

  return {
    businessName:
      profile.tradingName?.trim() || profile.businessName?.trim() || name,
    logoUrl: logoUrl!,
    primaryColor: colours[0] ?? "#3B82F6",
    accentColor: colours[1] ?? colours[0] ?? "#10B981",
  };
}

/** Sync HTML wrap — wordmark/logo in header only (no icon). */
export function wrapTransactionalEmail(input: WrapTransactionalEmailInput): string {
  const businessName = input.businessName.trim() || "DigitalGate";
  const logoUrl =
    absoluteBrandAssetUrl(input.logoUrl) || DG_FALLBACK_LOGO;
  const primary = input.primaryColor || "#3B82F6";
  const footer =
    input.footerNote?.trim() ||
    `You're receiving this email from ${businessName}.`;
  const alt = escapeHtml(businessName);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0F1A;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0A0F1A;padding:32px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#141B2B;border:1px solid rgba(59,130,246,0.12);border-radius:24px;overflow:hidden;">
<tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
<img src="${escapeHtml(logoUrl!)}" alt="${alt}" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto;border:0;">
</td></tr>
<tr><td style="padding:32px;color:#E2E8F0;font-size:16px;line-height:1.65;">${input.bodyHtml}</td></tr>
<tr><td style="padding:24px 32px 32px;background:#0A0F1A;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">© ${new Date().getFullYear()} ${alt}</p>
<p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#475569;">${escapeHtml(footer)}</p>
<p style="margin:0;font-size:0;line-height:0;color:${escapeHtml(primary)};">&nbsp;</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Escape plain text and wrap as paragraphs for email body. */
export function plainTextToEmailHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  if (!escaped) return "";
  return escaped
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;line-height:1.65;color:#E2E8F0;">${block.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
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
}): Promise<{ html: string; brand: EmailBrandAssets }> {
  let profile: OrganisationBusinessProfile | null = null;
  let orgMeta: { name: string; slug: string; industry: string | null; settings: unknown } | null =
    null;

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

  const brand = resolveEmailBrandAssets({
    organisationId: input.organisationId,
    organisationName: input.organisationName || orgMeta?.name,
    organisationSlug: input.organisationSlug || orgMeta?.slug,
    industry: input.industry ?? orgMeta?.industry,
    profile,
    settings: orgMeta?.settings,
  });

  const bodyHtml =
    input.bodyHtml?.trim() ||
    plainTextToEmailHtml(input.bodyText ?? "") ||
    "<p style=\"margin:0;color:#E2E8F0;\">&nbsp;</p>";

  const html = wrapTransactionalEmail({
    businessName: brand.businessName,
    logoUrl: brand.logoUrl,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    bodyHtml,
    footerNote: input.footerNote,
  });

  return { html, brand };
}
