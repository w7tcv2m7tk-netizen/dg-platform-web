import type { Gen2OnboardingProgress, Gen2OnboardingStep } from "./gen2-journey";
import { emptyGen2Progress, GEN2_ONBOARDING_STEPS, isGen2OnboardingStep, nextGen2Step } from "./gen2-journey";
import { appIdsFromPlanSelection } from "../apps/org-apps";
import { getTemplate } from "../industry/catalogue";
import { buildTemplateActivationPatch, readOrgIndustrySettings, type OrgIndustrySettings } from "../industry/entitlements";

type OrgSettings = { gen2Onboarding?: Gen2OnboardingProgress; foundingOnboarding?: unknown; apps?: { enabled?: string[]; planPreview?: { platformTier?: string; industryApps?: string[]; industryTemplates?: string[]; premiumApps?: string[]; appliedAt?: string; source?: string } }; industry?: OrgIndustrySettings; services?: { templateKey?: string; activeTemplateKeys?: string[]; primaryTemplateKey?: string; appliedAt?: string; [key: string]: unknown }; [key: string]: unknown };
const SERVICE_SUBINDUSTRY_TO_TEMPLATE: Record<string, string> = { electrical: "electrician", plumbing: "plumber", cleaning: "cleaner", maintenance: "maintenance", "building-construction": "builder", landscaping: "landscaper", hvac: "hvac", "pest-control": "pest_control", painting: "painter", handyman: "handyman", solar: "solar", "pool-service": "pool_service", "general-services": "general" };

function parseProgress(raw: unknown, founding: boolean): Gen2OnboardingProgress {
  if (!raw || typeof raw !== "object") return emptyGen2Progress(founding);
  const p = raw as Partial<Gen2OnboardingProgress>;
  const current = isGen2OnboardingStep(p.currentStep) ? p.currentStep : "welcome";
  const completed = Array.isArray(p.completedSteps) ? p.completedSteps.filter(isGen2OnboardingStep) : [];
  return { ...emptyGen2Progress(founding), ...p, version: 1, currentStep: current, completedSteps: completed, founding: p.founding ?? founding, operatingProfile: { ...emptyGen2Progress(founding).operatingProfile, ...(p.operatingProfile ?? {}) }, journeyPosition: { stage: current, ...p.journeyPosition } };
}

function definedProgressPatch(patch: Partial<Gen2OnboardingProgress>): Partial<Gen2OnboardingProgress> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Gen2OnboardingProgress>;
}

function canonicalIndustryId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return id === "accommodation-hospitality" ? "hospitality-accommodation" : id;
}

function normaliseOperatingProfile(profile: Gen2OnboardingProgress["operatingProfile"]): Gen2OnboardingProgress["operatingProfile"] {
  if (!profile) return profile;
  const primaryIndustry = profile.primaryIndustry?.trim() || undefined;
  const secondaryIndustries = Array.from(new Set((profile.secondaryIndustries ?? []).map((id) => id.trim()).filter((id) => id && id !== primaryIndustry)));
  const selectedIndustries = new Set(
    [primaryIndustry, ...secondaryIndustries]
      .map(canonicalIndustryId)
      .filter((id): id is string => Boolean(id)),
  );
  const canonicalPrimaryIndustry = canonicalIndustryId(primaryIndustry);
  const templates = Array.from(new Set((profile.templates ?? []).map((id) => id.trim()).filter(Boolean))).filter((id) => {
    const template = getTemplate(id);
    return Boolean(template && selectedIndustries.has(template.industryId));
  });
  const requestedPrimaryTemplate = profile.primaryTemplate?.trim();
  const primaryTemplate = requestedPrimaryTemplate && getTemplate(requestedPrimaryTemplate)?.industryId === canonicalPrimaryIndustry && templates.includes(requestedPrimaryTemplate)
    ? requestedPrimaryTemplate
    : templates.find((id) => getTemplate(id)?.industryId === canonicalPrimaryIndustry);
  return { ...profile, primaryIndustry, secondaryIndustries, templates, primaryTemplate };
}

export async function getGen2OnboardingProgress(organisationId: string): Promise<Gen2OnboardingProgress> { const { prisma } = await import("@dg/database"); const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { settings: true } }); const settings = (org?.settings as OrgSettings | null) ?? {}; const founding = Boolean(settings.foundingOnboarding || (settings as { billing?: { foundingCustomer?: boolean } }).billing?.foundingCustomer); return parseProgress(settings.gen2Onboarding, founding); }

export async function saveGen2OnboardingProgress(organisationId: string, patch: Partial<Gen2OnboardingProgress> & { markStepComplete?: Gen2OnboardingStep }): Promise<Gen2OnboardingProgress> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { settings: true } });
  const settings = ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings;
  const founding = Boolean(settings.foundingOnboarding || (settings as { billing?: { foundingCustomer?: boolean } }).billing?.foundingCustomer);
  const current = parseProgress(settings.gen2Onboarding, founding); const now = new Date().toISOString();
  const cleanPatch = definedProgressPatch(patch);
  let completedSteps = [...current.completedSteps]; let currentStep = cleanPatch.currentStep ?? current.currentStep;
  if (patch.markStepComplete) { if (!completedSteps.includes(patch.markStepComplete)) completedSteps.push(patch.markStepComplete); const next = nextGen2Step(patch.markStepComplete); if (next && !cleanPatch.currentStep) currentStep = next; }
  if (Array.isArray(cleanPatch.completedSteps)) completedSteps = cleanPatch.completedSteps.filter(isGen2OnboardingStep);
  const nextProgress: Gen2OnboardingProgress = { ...current, ...cleanPatch, version: 1, currentStep, completedSteps, updatedAt: now, startedAt: current.startedAt || now, checklist: { ...(current.checklist ?? {}), ...(cleanPatch.checklist ?? {}) }, vipSetup: cleanPatch.vipSetup ? { ...(current.vipSetup ?? emptyGen2Progress(founding).vipSetup), ...cleanPatch.vipSetup } : current.vipSetup, operatingProfile: normaliseOperatingProfile(cleanPatch.operatingProfile ? { ...(current.operatingProfile ?? {}), ...cleanPatch.operatingProfile } : current.operatingProfile), journeyPosition: { ...(current.journeyPosition ?? {}), ...(cleanPatch.journeyPosition ?? {}), stage: cleanPatch.journeyPosition?.stage ?? currentStep, updatedAt: now } };
  delete (nextProgress as { markStepComplete?: unknown }).markStepComplete;
  if (completedSteps.includes("implementation") || completedSteps.length >= GEN2_ONBOARDING_STEPS.length) nextProgress.completedAt = nextProgress.completedAt ?? now;

  const operatingApps = nextProgress.operatingProfile?.recommendedIndustryApps ?? [];
  const operatingTemplates = nextProgress.operatingProfile?.templates ?? [];
  const industryApps = Array.isArray(cleanPatch.industryApps) ? cleanPatch.industryApps : operatingApps.length ? operatingApps : nextProgress.industryApps ?? [];
  const industryTemplates = Array.isArray(cleanPatch.industryTemplates) ? cleanPatch.industryTemplates : operatingTemplates.length ? operatingTemplates : nextProgress.industryTemplates ?? [];
  nextProgress.industryApps = industryApps; nextProgress.industryTemplates = industryTemplates;

  const hasAppSelectionPatch = Array.isArray(cleanPatch.industryApps) || Array.isArray(cleanPatch.industryTemplates) || Array.isArray(cleanPatch.premiumApps) || Boolean(cleanPatch.platformTier) || Boolean(cleanPatch.operatingProfile);
  const selectedAppIds = hasAppSelectionPatch ? appIdsFromPlanSelection({ platformTier: nextProgress.platformTier ?? "professional", industryApps, premiumApps: nextProgress.premiumApps ?? [] }) : undefined;
  const nextApps = hasAppSelectionPatch ? { ...(settings.apps ?? {}), enabled: selectedAppIds, planPreview: { ...(settings.apps?.planPreview ?? {}), platformTier: nextProgress.platformTier, industryApps, industryTemplates, premiumApps: nextProgress.premiumApps ?? [], appliedAt: now, source: "onboarding-operating-profile" } } : settings.apps;

  const shouldSyncCanonicalIndustry = Boolean(cleanPatch.operatingProfile) || Array.isArray(cleanPatch.industryTemplates);
  let nextIndustry = settings.industry;
  if (shouldSyncCanonicalIndustry) {
    let canonical = readOrgIndustrySettings({ industry: settings.industry }) ?? { templates: {}, primaryTemplateByIndustry: {} };
    const selectedTemplateIds = Array.from(
      new Set(
        industryTemplates
          .map((id) => getTemplate(id)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const selectedSet = new Set(selectedTemplateIds);

    for (const [id, entry] of Object.entries(canonical.templates ?? {})) {
      if (entry?.active === true && !selectedSet.has(id)) {
        canonical = buildTemplateActivationPatch(canonical, id, false, now);
      }
    }
    for (const id of selectedTemplateIds) {
      canonical = buildTemplateActivationPatch(canonical, id, true, now);
    }

    const touchedIndustries = new Set(
      [
        ...Object.keys(canonical.primaryTemplateByIndustry ?? {}),
        ...selectedTemplateIds.map((id) => getTemplate(id)?.industryId),
      ].filter((id): id is string => Boolean(id)),
    );
    const preferredPrimary = nextProgress.operatingProfile?.primaryTemplate;
    const primaryTemplateByIndustry = { ...(canonical.primaryTemplateByIndustry ?? {}) };
    for (const industryId of touchedIndustries) {
      const selectedForIndustry = selectedTemplateIds.filter((id) => getTemplate(id)?.industryId === industryId);
      if (!selectedForIndustry.length) {
        delete primaryTemplateByIndustry[industryId];
        continue;
      }
      const preferred =
        preferredPrimary && selectedForIndustry.includes(preferredPrimary)
          ? preferredPrimary
          : primaryTemplateByIndustry[industryId] && selectedForIndustry.includes(primaryTemplateByIndustry[industryId]!)
            ? primaryTemplateByIndustry[industryId]
            : selectedForIndustry[0];
      if (preferred) primaryTemplateByIndustry[industryId] = preferred;
    }
    nextIndustry = { ...canonical, primaryTemplateByIndustry };
  }

  const selectedServiceTemplateKeys = Array.from(
    new Set(
      industryTemplates
        .map((id) => SERVICE_SUBINDUSTRY_TO_TEMPLATE[id])
        .filter((key): key is string => Boolean(key)),
    ),
  );
  const preferredServiceSubindustry = nextProgress.operatingProfile?.primaryTemplate;
  const preferredServiceTemplateKey = preferredServiceSubindustry
    ? SERVICE_SUBINDUSTRY_TO_TEMPLATE[preferredServiceSubindustry]
    : undefined;
  const primaryServiceTemplateKey =
    preferredServiceTemplateKey && selectedServiceTemplateKeys.includes(preferredServiceTemplateKey)
      ? preferredServiceTemplateKey
      : selectedServiceTemplateKeys[0];
  const nextServices = shouldSyncCanonicalIndustry && selectedServiceTemplateKeys.length
    ? {
        ...(settings.services ?? {}),
        activeTemplateKeys: selectedServiceTemplateKeys,
        primaryTemplateKey: primaryServiceTemplateKey,
        templateKey: primaryServiceTemplateKey,
        appliedAt: now,
      }
    : settings.services;

  await prisma.organisation.update({ where: { id: organisationId }, data: { settings: { ...settings, ...(nextApps ? { apps: nextApps } : {}), ...(nextIndustry ? { industry: nextIndustry } : {}), ...(nextServices ? { services: nextServices } : {}), gen2Onboarding: nextProgress } as never } });
  return nextProgress;
}

export async function markGen2SubscriptionActivated(organisationId: string, checkoutSessionId?: string | null): Promise<Gen2OnboardingProgress> { return saveGen2OnboardingProgress(organisationId, { markStepComplete: "stripe", subscriptionActivatedAt: new Date().toISOString(), stripeCheckoutSessionId: checkoutSessionId ?? undefined, checklist: { subscription: true } }); }
