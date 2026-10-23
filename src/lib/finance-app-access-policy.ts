import { industryIdForAppOrTemplate } from "@dg/platform-core/industry/platform";
import { authorisedIndustryPurchaseIds, type IndustryPurchaseAuthority } from "@dg/platform-core/industry/purchase-authority";
import { organisationHasSelectedIndustryApp } from "@/lib/industry-app-selection";

export type FinanceAppAccessState = {
  industryEntitled: boolean;
  betaEnrolled: boolean;
  selectedForOrganisation: boolean;
};

export type FinanceEntitlementAuthority = {
  organisationId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripeStatus: string | null;
  entitlement: string;
  industryApps: string[];
  premiumApps: string[];
  status: string;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

/** A failed authority read is never interpreted as access. */
export async function financeAppAccessStateOrDenied(
  load: () => Promise<FinanceAppAccessState>,
): Promise<FinanceAppAccessState> {
  try {
    return await load();
  } catch {
    return { industryEntitled: false, betaEnrolled: false, selectedForOrganisation: false };
  }
}

/** Resolve Finance entitlement only from matching canonical and Stripe records. */
export function resolveFinanceAppAccessState(input: {
  organisationId: string;
  featureFlags?: Record<string, boolean>;
  canonicalSubscription: FinanceEntitlementAuthority | null;
  organisationSettings?: Parameters<typeof organisationHasSelectedIndustryApp>[0] | null;
}): FinanceAppAccessState {
  const canonical = input.canonicalSubscription;
  const industrySelections = authorisedIndustryPurchaseIds(canonical as IndustryPurchaseAuthority | null, input.organisationId);

  return {
    industryEntitled: Boolean(canonical) && industrySelections.some((key) => industryIdForAppOrTemplate(key) === "finance"),
    betaEnrolled: input.featureFlags?.["finance.beta"] === true,
    selectedForOrganisation: organisationHasSelectedIndustryApp(input.organisationSettings, "finance"),
  };
}

/** Fail closed unless both commercial Industry entitlement and pilot enrolment exist. */
export function financeAppAccessDenial(
  state: FinanceAppAccessState,
): "beta_required" | "industry_app_purchase_required" | "industry_app_not_selected" | null {
  if (!state.betaEnrolled) return "beta_required";
  if (!state.industryEntitled) return "industry_app_purchase_required";
  if (!state.selectedForOrganisation) return "industry_app_not_selected";
  return null;
}
