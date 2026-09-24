import {
  GEN2_CHECKLIST_ITEMS,
  GEN2_ONBOARDING_STEP_LABELS,
  GEN2_PLATFORM_PLANS,
  GEN2_SUPPORT_PLANS,
  getGen2OnboardingProgress,
} from "../onboarding";
import { getOrganisationBillingStatus, billingStatusHeadline } from "../billing/org-billing-status";
import { getOrganisationCommercialOffer } from "../billing/commercial-offer";
import { normalisePaidAppKeys, PAID_APP_LABELS } from "../billing/paid-apps";
import { getTemplate, industryIdForAppOrTemplate, INDUSTRY_PLATFORMS } from "../industry";

type ChecklistItem = (typeof GEN2_CHECKLIST_ITEMS)[number];

function isOptional(item: ChecklistItem) {
  return "optional" in item && item.optional === true;
}

function itemStep(item: ChecklistItem) {
  return "step" in item ? item.step : null;
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function industryLabel(id: string) {
  const parentId = industryIdForAppOrTemplate(id);
  return INDUSTRY_PLATFORMS.find((platform) => platform.id === parentId)?.label ?? titleCase(id);
}

function templateLabel(id: string) {
  return getTemplate(id)?.name ?? titleCase(id);
}

function premiumLabel(id: string) {
  const key = normalisePaidAppKeys([id])[0];
  return key ? PAID_APP_LABELS[key] : titleCase(id);
}

function supportLabel(id: string | undefined) {
  return GEN2_SUPPORT_PLANS.find((plan) => plan.id === id)?.name ?? (id ? titleCase(id) : "Not selected");
}

function planLabel(id: string | undefined | null) {
  return GEN2_PLATFORM_PLANS.find((plan) => plan.id === id)?.name ?? (id ? titleCase(id) : "Not selected");
}

export type OperatorCustomerControlSnapshot = {
  lifecycle: "not_started" | "onboarding" | "checkout_ready" | "trial" | "active" | "attention";
  lifecycleLabel: string;
  onboarding: {
    percentComplete: number;
    currentStep: string;
    currentStepLabel: string;
    updatedAt: string | null;
    incompleteRequired: string[];
  };
  commercial: {
    platformTier: string | null;
    platformLabel: string;
    supportPlan: string | null;
    supportLabel: string;
    industryApps: Array<{ id: string; label: string }>;
    industryTemplates: Array<{ id: string; label: string }>;
    premiumApps: Array<{ id: string; label: string }>;
    customOffer: null | {
      id: string;
      label: string;
      amountCents: number;
      cadence: "monthly" | "annual";
      trialDays: number;
      crmOpportunityHref: string | null;
    };
  };
  billing: null | {
    kind: string;
    headline: string;
    commercialStatus: string | null;
    subscriptionStatus: string | null;
    hasStripeCustomer: boolean;
    trialEnd: string | null;
    currentPeriodEnd: string | null;
    entitlementLevel: string | null;
  };
  alerts: string[];
};

export async function getOperatorCustomerControlSnapshot(
  organisationId: string,
): Promise<OperatorCustomerControlSnapshot> {
  const [progress, billing, offer] = await Promise.all([
    getGen2OnboardingProgress(organisationId),
    getOrganisationBillingStatus(organisationId),
    getOrganisationCommercialOffer(organisationId),
  ]);

  const completed = new Set(progress.completedSteps);
  const requiredChecklist = GEN2_CHECKLIST_ITEMS.filter((item) => !isOptional(item));
  const incompleteRequired = requiredChecklist
    .filter((item) => {
      const step = itemStep(item);
      if (step && completed.has(step)) return false;
      return !Boolean(progress.checklist?.[item.id]);
    })
    .map((item) => item.label);

  const percentComplete = Math.round(
    ((requiredChecklist.length - incompleteRequired.length) / requiredChecklist.length) * 100,
  );

  const platformTier = offer?.platformTier ?? progress.platformTier ?? billing?.platformTier ?? null;
  const supportPlan = offer?.supportPlan ?? progress.supportPlan ?? null;
  const industryApps = offer?.industryApps ?? progress.industryApps ?? [];
  const industryTemplates = offer?.industryTemplates ?? progress.industryTemplates ?? [];
  const premiumApps = offer?.premiumApps ?? progress.premiumApps ?? [];

  const alerts: string[] = [];
  if (
    billing?.expectsPlatformBilling &&
    completed.has("stripe") &&
    !billing.hasStripeCustomer
  ) {
    alerts.push("Onboarding shows subscription activation, but no Stripe customer is linked.");
  }
  if (
    progress.subscriptionActivatedAt &&
    !billing?.commercialStatus &&
    billing?.expectsPlatformBilling
  ) {
    alerts.push("Onboarding records an activated subscription, but no authoritative PlatformSubscription is present.");
  }
  if (
    billing &&
    ["payment_failed", "past_due", "restricted", "suspended", "cancelled"].includes(billing.kind)
  ) {
    alerts.push(billingStatusHeadline(billing));
  }
  if (billing?.entitlementsSuspended) {
    alerts.push("Customer entitlements are currently suspended or read-only.");
  }
  if (progress.completedAt && incompleteRequired.length > 0) {
    alerts.push("Onboarding is marked complete while required activation items remain incomplete.");
  }

  let lifecycle: OperatorCustomerControlSnapshot["lifecycle"] = "not_started";
  let lifecycleLabel = "Not started";
  if (alerts.length > 0) {
    lifecycle = "attention";
    lifecycleLabel = "Needs attention";
  } else if (billing?.kind === "trial" || billing?.kind === "founding_trial") {
    lifecycle = "trial";
    lifecycleLabel = "Trial";
  } else if (billing && ["subscribed", "active"].includes(billing.kind)) {
    lifecycle = "active";
    lifecycleLabel = "Active";
  } else if (progress.currentStep === "stripe" || progress.currentStep === "order_summary") {
    lifecycle = "checkout_ready";
    lifecycleLabel = "Ready for checkout";
  } else if (progress.completedSteps.length > 0) {
    lifecycle = "onboarding";
    lifecycleLabel = "Onboarding";
  }

  const opportunityId =
    offer?.id.startsWith("custom-") && offer.id.length > "custom-".length
      ? offer.id.slice("custom-".length)
      : null;

  return {
    lifecycle,
    lifecycleLabel,
    onboarding: {
      percentComplete,
      currentStep: progress.currentStep,
      currentStepLabel: GEN2_ONBOARDING_STEP_LABELS[progress.currentStep],
      updatedAt: progress.updatedAt ?? null,
      incompleteRequired,
    },
    commercial: {
      platformTier,
      platformLabel: planLabel(platformTier),
      supportPlan,
      supportLabel: supportLabel(supportPlan ?? undefined),
      industryApps: [...new Set(industryApps)].map((id) => ({ id, label: industryLabel(id) })),
      industryTemplates: [...new Set(industryTemplates)].map((id) => ({ id, label: templateLabel(id) })),
      premiumApps: [...new Set(premiumApps)].map((id) => ({ id, label: premiumLabel(id) })),
      customOffer: offer
        ? {
            id: offer.id,
            label: offer.label,
            amountCents: offer.amountCents,
            cadence: offer.cadence,
            trialDays: offer.trialDays,
            crmOpportunityHref: opportunityId ? `/apps/crm/opportunities/${opportunityId}` : null,
          }
        : null,
    },
    billing: billing
      ? {
          kind: billing.kind,
          headline: billingStatusHeadline(billing),
          commercialStatus: billing.commercialStatus,
          subscriptionStatus: billing.subscriptionStatus,
          hasStripeCustomer: billing.hasStripeCustomer,
          trialEnd: billing.trialEnd,
          currentPeriodEnd: billing.currentPeriodEnd,
          entitlementLevel: billing.entitlementLevel,
        }
      : null,
    alerts,
  };
}
