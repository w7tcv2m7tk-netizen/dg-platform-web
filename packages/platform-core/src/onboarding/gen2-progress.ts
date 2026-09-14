import type { Gen2OnboardingProgress, Gen2OnboardingStep } from "./gen2-journey";
import { emptyGen2Progress, GEN2_ONBOARDING_STEPS, isGen2OnboardingStep, nextGen2Step } from "./gen2-journey";

type OrgSettings = {
  gen2Onboarding?: Gen2OnboardingProgress;
  foundingOnboarding?: unknown;
  apps?: {
    enabled?: string[];
    planPreview?: {
      platformTier?: string;
      industryApps?: string[];
      industryTemplates?: string[];
      premiumApps?: string[];
      appliedAt?: string;
      source?: string;
    };
  };
  services?: {
    templateKey?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const SERVICE_SUBINDUSTRY_TO_TEMPLATE: Record<string, string> = {
  electrical: "electrician",
  plumbing: "plumber",
  cleaning: "cleaner",
  maintenance: "maintenance",
  "building-construction": "builder",
  landscaping: "landscaper",
  hvac: "hvac",
  "pest-control": "pest_control",
  painting: "painter",
  handyman: "handyman",
  solar: "solar",
  "pool-service": "pool_service",
  "general-services": "general",
};

function parseProgress(raw: unknown, founding: boolean): Gen2OnboardingProgress {
  if (!raw || typeof raw !== "object") return emptyGen2Progress(founding);
  const p = raw as Partial<Gen2OnboardingProgress>;
  const current = isGen2OnboardingStep(p.currentStep) ? p.currentStep : "welcome";
  const completed = Array.isArray(p.completedSteps) ? p.completedSteps.filter(isGen2OnboardingStep) : [];
  return { ...emptyGen2Progress(founding), ...p, version: 1, currentStep: current, completedSteps: completed, founding: p.founding ?? founding };
}

export async function getGen2OnboardingProgress(organisationId: string): Promise<Gen2OnboardingProgress> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { settings: true } });
  const settings = (org?.settings as OrgSettings | null) ?? {};
  const founding = Boolean(settings.foundingOnboarding || (settings as { billing?: { foundingCustomer?: boolean } }).billing?.foundingCustomer);
  return parseProgress(settings.gen2Onboarding, founding);
}

export async function saveGen2OnboardingProgress(
  organisationId: string,
  patch: Partial<Gen2OnboardingProgress> & { markStepComplete?: Gen2OnboardingStep },
): Promise<Gen2OnboardingProgress> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { settings: true } });
  const settings = ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings;
  const founding = Boolean(settings.foundingOnboarding || (settings as { billing?: { foundingCustomer?: boolean } }).billing?.foundingCustomer);
  const current = parseProgress(settings.gen2Onboarding, founding);
  const now = new Date().toISOString();

  let completedSteps = [...current.completedSteps];
  let currentStep = patch.currentStep ?? current.currentStep;
  if (patch.markStepComplete) {
    if (!completedSteps.includes(patch.markStepComplete)) completedSteps.push(patch.markStepComplete);
    const next = nextGen2Step(patch.markStepComplete);
    if (next && !patch.currentStep) currentStep = next;
  }
  if (Array.isArray(patch.completedSteps)) completedSteps = patch.completedSteps.filter(isGen2OnboardingStep);

  const nextProgress: Gen2OnboardingProgress = {
    ...current,
    ...patch,
    version: 1,
    currentStep,
    completedSteps,
    updatedAt: now,
    startedAt: current.startedAt || now,
    checklist: { ...(current.checklist ?? {}), ...(patch.checklist ?? {}) },
    vipSetup: patch.vipSetup
      ? { ...(current.vipSetup ?? emptyGen2Progress(founding).vipSetup), ...patch.vipSetup }
      : current.vipSetup,
  };
  delete (nextProgress as { markStepComplete?: unknown }).markStepComplete;

  if (completedSteps.includes("implementation") || completedSteps.length >= GEN2_ONBOARDING_STEPS.length) {
    nextProgress.completedAt = nextProgress.completedAt ?? now;
  }

  const hasAppSelectionPatch =
    Array.isArray(patch.industryApps) ||
    Array.isArray(patch.industryTemplates) ||
    Array.isArray(patch.premiumApps) ||
    Boolean(patch.platformTier);

  const nextApps = hasAppSelectionPatch
    ? {
        ...(settings.apps ?? {}),
        planPreview: {
          ...(settings.apps?.planPreview ?? {}),
          platformTier: nextProgress.platformTier,
          industryApps: nextProgress.industryApps ?? [],
          industryTemplates: nextProgress.industryTemplates ?? [],
          premiumApps: nextProgress.premiumApps ?? [],
          appliedAt: now,
          source: "onboarding",
        },
      }
    : settings.apps;

  const selectedServiceTemplate = (nextProgress.industryTemplates ?? [])
    .map((id) => SERVICE_SUBINDUSTRY_TO_TEMPLATE[id])
    .find((key): key is string => Boolean(key));
  const nextServices = selectedServiceTemplate
    ? { ...(settings.services ?? {}), templateKey: selectedServiceTemplate }
    : settings.services;

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        ...(nextApps ? { apps: nextApps } : {}),
        ...(nextServices ? { services: nextServices } : {}),
        gen2Onboarding: nextProgress,
      } as never,
    },
  });

  return nextProgress;
}

export async function markGen2SubscriptionActivated(
  organisationId: string,
  checkoutSessionId?: string | null,
): Promise<Gen2OnboardingProgress> {
  return saveGen2OnboardingProgress(organisationId, {
    markStepComplete: "stripe",
    subscriptionActivatedAt: new Date().toISOString(),
    stripeCheckoutSessionId: checkoutSessionId ?? undefined,
    checklist: { subscription: true },
  });
}
