/**
 * Gen 2 canonical customer onboarding journey.
 * Writes to Business Profile, Goals, Commerce Subscription, entitlements —
 * not a disposable form blob.
 */

export const GEN2_ONBOARDING_STEPS = [
  "welcome",
  "business_identity",
  "business_profile",
  "goals",
  "plan",
  "apps",
  "billing_cadence",
  "order_summary",
  "stripe",
  "connect",
  "checklist",
  "implementation",
] as const;

export type Gen2OnboardingStep = (typeof GEN2_ONBOARDING_STEPS)[number];

export const GEN2_ONBOARDING_STEP_LABELS: Record<Gen2OnboardingStep, string> = {
  welcome: "Welcome",
  business_identity: "Business identity",
  business_profile: "Business Profile",
  goals: "Goals & priorities",
  plan: "Platform plan",
  apps: "Apps",
  billing_cadence: "Monthly or annual",
  order_summary: "Order summary",
  stripe: "Activate subscription",
  connect: "Connect your business",
  checklist: "Getting started",
  implementation: "Implementation",
};

export type BillingCadence = "monthly" | "annual";

export type Gen2PlatformTier = "starter" | "professional" | "business";

export type Gen2OnboardingProgress = {
  version: 1;
  currentStep: Gen2OnboardingStep;
  completedSteps: Gen2OnboardingStep[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  /** Selected platform plan */
  platformTier?: Gen2PlatformTier;
  industryApps?: string[];
  premiumApps?: string[];
  billingCadence?: BillingCadence;
  /** Stripe Checkout session id once started */
  stripeCheckoutSessionId?: string | null;
  subscriptionActivatedAt?: string | null;
  /** Checklist items completed beyond wizard steps */
  checklist?: Record<string, boolean>;
  /** Founding cohort path */
  founding?: boolean;
};

export const GEN2_CHECKLIST_ITEMS = [
  { id: "business_identity", label: "Business identity", step: "business_identity" as const },
  { id: "business_profile", label: "Business Profile", step: "business_profile" as const },
  { id: "goals", label: "Goals", step: "goals" as const },
  { id: "plan", label: "Plan selected", step: "plan" as const },
  { id: "apps", label: "Apps selected", step: "apps" as const },
  { id: "subscription", label: "Subscription activated", step: "stripe" as const },
  { id: "connect_website", label: "Connect website", optional: true },
  { id: "connect_google", label: "Connect Google", optional: true },
  { id: "import_contacts", label: "Import contacts", optional: true },
  { id: "configure_apps", label: "Configure Apps", optional: true },
  { id: "review_brain", label: "Review Business Brain", optional: true },
  { id: "implementation", label: "Implementation complete", step: "implementation" as const },
] as const;

export const GEN2_PLATFORM_PLANS: Array<{
  id: Gen2PlatformTier;
  name: string;
  monthlyCents: number;
  blurb: string;
}> = [
  {
    id: "starter",
    name: "Starter",
    monthlyCents: 9900,
    blurb: "Core CRM, communications, documents and website foundation.",
  },
  {
    id: "professional",
    name: "Growth",
    monthlyCents: 24900,
    blurb: "Full Business Operating Platform for growing teams.",
  },
  {
    id: "business",
    name: "Scale",
    monthlyCents: 49900,
    blurb: "Scale operations with higher capacity and priority support.",
  },
];

export const GEN2_GOAL_OPTIONS = [
  { id: "more_leads", label: "Generate more leads" },
  { id: "website_performance", label: "Improve website performance" },
  { id: "seo", label: "Improve SEO" },
  { id: "ai_visibility", label: "Improve AI visibility" },
  { id: "manage_customers", label: "Manage customers" },
  { id: "automate_followup", label: "Automate follow-up" },
  { id: "manage_jobs", label: "Manage jobs" },
  { id: "manage_property", label: "Manage property" },
  { id: "manage_bookings", label: "Manage bookings" },
  { id: "reputation", label: "Improve reputation" },
  { id: "operational_efficiency", label: "Improve operational efficiency" },
] as const;

export function isGen2OnboardingStep(value: unknown): value is Gen2OnboardingStep {
  return (
    typeof value === "string" &&
    (GEN2_ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

export function nextGen2Step(step: Gen2OnboardingStep): Gen2OnboardingStep | null {
  const i = GEN2_ONBOARDING_STEPS.indexOf(step);
  if (i < 0 || i >= GEN2_ONBOARDING_STEPS.length - 1) return null;
  return GEN2_ONBOARDING_STEPS[i + 1]!;
}

export function gen2ChecklistStats(progress: Gen2OnboardingProgress | null) {
  const completed = new Set(progress?.completedSteps ?? []);
  const extra = progress?.checklist ?? {};
  let done = 0;
  for (const item of GEN2_CHECKLIST_ITEMS) {
    if ("step" in item && item.step && completed.has(item.step)) {
      done += 1;
      continue;
    }
    if (extra[item.id]) done += 1;
  }
  return { done, total: GEN2_CHECKLIST_ITEMS.length };
}

export function emptyGen2Progress(founding = false): Gen2OnboardingProgress {
  const now = new Date().toISOString();
  return {
    version: 1,
    currentStep: "welcome",
    completedSteps: [],
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    platformTier: "professional",
    industryApps: [],
    premiumApps: [],
    billingCadence: "monthly",
    founding,
    checklist: {},
  };
}
