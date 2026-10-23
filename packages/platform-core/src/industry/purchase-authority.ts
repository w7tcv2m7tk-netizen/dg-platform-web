import { industryIdForAppOrTemplate, INDUSTRY_PLATFORMS } from "./platform";
import { normalisePaidAppKeys, paidAppKeyForAppId, PAID_APP_TO_APP_IDS } from "../billing/paid-apps";

/** Minimal canonical subscription projection required by paid app gates. */
export type IndustryPurchaseAuthority = {
  organisationId: string;
  industryApps: string[];
  premiumApps: string[];
  status: string;
  entitlement: string;
  stripeStatus: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt?: Date | null;
  cancelAtPeriodEnd: boolean;
};

const COMMERCIAL_STATUSES = new Set([
  "ACTIVE",
  "TRIALING",
  "CANCEL_AT_PERIOD_END",
  "PAYMENT_FAILED",
  "PAST_DUE",
]);

const ACCESSIBLE_ENTITLEMENTS = new Set(["FULL", "FULL_WITH_WARNING", "MOSTLY_FULL"]);

/**
 * Only a live canonical subscription can authorize paid application access.
 * User-editable profile/settings, checkout redirects and metadata copied by the
 * browser are intentionally not inputs to this decision.
 */
export function isIndustryPurchaseAuthorityActive(
  authority: IndustryPurchaseAuthority | null | undefined,
  organisationId: string,
  now = new Date(),
): authority is IndustryPurchaseAuthority {
  if (!authority || authority.organisationId !== organisationId || !authority.stripeSubscriptionId || !authority.stripeCustomerId) return false;
  if (!authority.industryApps?.length && !authority.premiumApps?.length) return false;
  const status = authority.status?.toUpperCase();
  if (!status || !COMMERCIAL_STATUSES.has(status) || !ACCESSIBLE_ENTITLEMENTS.has(authority.entitlement)) return false;
  if (authority.stripeStatus === "trialing") {
    return ["TRIALING", "CANCEL_AT_PERIOD_END"].includes(status) && Boolean(authority.trialEnd && authority.trialEnd > now);
  }
  if (authority.stripeStatus === "active") {
    return ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(status) && Boolean(authority.currentPeriodEnd && authority.currentPeriodEnd > now);
  }
  if (authority.stripeStatus === "past_due") {
    return ["PAYMENT_FAILED", "PAST_DUE"].includes(status) && Boolean(authority.gracePeriodEndsAt && authority.gracePeriodEndsAt > now);
  }
  return false;
}

/** Exact purchased child app, not merely another app in the same industry. */
export function isIndustryAppPurchased(
  authority: IndustryPurchaseAuthority | null | undefined,
  organisationId: string,
  appId: string,
  now = new Date(),
): boolean {
  if (!isIndustryPurchaseAuthorityActive(authority, organisationId, now)) return false;
  const aliases = new Set([appId]);
  for (const platform of INDUSTRY_PLATFORMS) {
    for (const specialisation of platform.specialisations) {
      if ([specialisation.id, specialisation.appId, specialisation.templateId].filter(Boolean).includes(appId)) {
        aliases.add(specialisation.id);
        if (specialisation.appId) aliases.add(specialisation.appId);
        aliases.add(specialisation.templateId);
      }
    }
  }
  return authority.industryApps.some((id) => aliases.has(id));
}

export function industryAppAccessDecision(input: {
  authority: IndustryPurchaseAuthority | null | undefined;
  organisationId: string;
  appId: string;
  betaEnrolled: boolean;
  selectedForOrganisation: boolean;
  now?: Date;
}): "allowed" | "industry_app_purchase_required" | "beta_required" | "industry_app_not_selected" {
  if (!isIndustryAppPurchased(input.authority, input.organisationId, input.appId, input.now)) return "industry_app_purchase_required";
  if (!input.betaEnrolled) return "beta_required";
  if (!input.selectedForOrganisation) return "industry_app_not_selected";
  return "allowed";
}

export function hasAuthorisedPremiumApp(
  purchaseKeys: readonly string[] | null | undefined,
  appId: string,
): boolean {
  const purchased = new Set(normalisePaidAppKeys(purchaseKeys));
  const direct = paidAppKeyForAppId(appId);
  if (direct && purchased.has(direct)) return true;
  if (purchased.has("growth_suite") && PAID_APP_TO_APP_IDS.growth_suite.includes(appId)) return true;
  if (appId === "ai-communications" && purchased.has("voice_ai")) return true;
  return false;
}

/* Historical utility retained for access consumers that intentionally check an
 * entire commercial parent. Page and API guards should use
 * isIndustryAppPurchased for a specific child app. */
export function authorisedIndustryPurchaseIds(
  authority: IndustryPurchaseAuthority | null | undefined,
  organisationId: string,
  now = new Date(),
): string[] {
  if (!isIndustryPurchaseAuthorityActive(authority, organisationId, now)) return [];
  return [...new Set(authority.industryApps.filter((id) => Boolean(industryIdForAppOrTemplate(id))))];
}

export function authorisedPremiumPurchaseKeys(
  authority: IndustryPurchaseAuthority | null | undefined,
  organisationId: string,
  now = new Date(),
): string[] {
  if (!isIndustryPurchaseAuthorityActive(authority, organisationId, now)) return [];
  return normalisePaidAppKeys(authority.premiumApps);
}
