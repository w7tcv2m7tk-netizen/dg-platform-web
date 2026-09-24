import {
  getGen2OnboardingProgress,
  getOrganisationCommercialOffer,
  assertPlatformOperator,
  INDUSTRY_TAXONOMY,
  isGen2OnboardingStep,
  saveGen2OnboardingProgress,
  type Gen2JourneyPosition,
  type Gen2OperatingProfile,
  type Gen2VipSetup,
} from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

const OPERATING_SUBSTEPS = new Set(["industry", "business_type", "profile"]);
const PREPARATION_SUBSTEPS = new Set(["brand", "website", "data", "connections", "ai_reporting", "workspace", "review"]);
const ALLOWED_INDUSTRIES = new Set(INDUSTRY_TAXONOMY.map((group) => group.id));
const TEMPLATE_TO_INDUSTRY = new Map(
  INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries.map((subIndustry) => [subIndustry.id, group.id] as const)),
);

function strings(value: unknown, max = 24, maxLength = 100) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, maxLength)).filter(Boolean).slice(0, max)
    : [];
}

function sanitiseOperatingProfile(raw: unknown, current: Gen2OperatingProfile = {}, lockedTemplates?: string[]): Gen2OperatingProfile {
  if (!raw || typeof raw !== "object") return current;
  const value = raw as Record<string, unknown>;
  const primaryIndustry = typeof value.primaryIndustry === "string" && ALLOWED_INDUSTRIES.has(value.primaryIndustry) ? value.primaryIndustry : current.primaryIndustry;
  const secondaryIndustries = value.secondaryIndustries === undefined
    ? (current.secondaryIndustries ?? []).filter((id) => ALLOWED_INDUSTRIES.has(id) && id !== primaryIndustry)
    : strings(value.secondaryIndustries).filter((id) => ALLOWED_INDUSTRIES.has(id) && id !== primaryIndustry);
  const selectedIndustries = new Set([primaryIndustry, ...secondaryIndustries].filter((id): id is string => Boolean(id)));
  const requestedTemplates = lockedTemplates?.length
    ? lockedTemplates
    : value.templates === undefined
      ? (current.templates ?? [])
      : strings(value.templates);
  const validTemplates = requestedTemplates.filter((template) => {
    const industry = TEMPLATE_TO_INDUSTRY.get(template);
    return Boolean(industry && selectedIndustries.has(industry));
  });
  const templates = lockedTemplates?.length
    ? Array.from(new Set(validTemplates))
    : Array.from(
        validTemplates.reduce((byIndustry, template) => {
          const industry = TEMPLATE_TO_INDUSTRY.get(template);
          if (industry && !byIndustry.has(industry)) byIndustry.set(industry, template);
          return byIndustry;
        }, new Map<string, string>()).values(),
      );
  const requestedPrimaryTemplate = typeof value.primaryTemplate === "string" ? value.primaryTemplate.slice(0, 100) : current.primaryTemplate;
  const primaryTemplate = requestedPrimaryTemplate && templates.includes(requestedPrimaryTemplate) && TEMPLATE_TO_INDUSTRY.get(requestedPrimaryTemplate) === primaryIndustry
    ? requestedPrimaryTemplate
    : templates.find((template) => TEMPLATE_TO_INDUSTRY.get(template) === primaryIndustry);
  return {
    ...current,
    primaryIndustry,
    secondaryIndustries,
    primaryTemplate,
    templates,
    recommendedIndustryApps: value.recommendedIndustryApps === undefined ? current.recommendedIndustryApps : strings(value.recommendedIndustryApps),
    recommendedGrowthApps: value.recommendedGrowthApps === undefined ? current.recommendedGrowthApps : strings(value.recommendedGrowthApps),
    recommendedWorkflows: value.recommendedWorkflows === undefined ? current.recommendedWorkflows : strings(value.recommendedWorkflows, 12, 180),
    recommendedDashboard: value.recommendedDashboard === undefined ? current.recommendedDashboard : strings(value.recommendedDashboard, 12, 180),
  };
}

function sanitiseJourneyPosition(raw: unknown, current: Gen2JourneyPosition = {}): Gen2JourneyPosition {
  if (!raw || typeof raw !== "object") return current;
  const value = raw as Record<string, unknown>;
  const stage = isGen2OnboardingStep(value.stage) ? value.stage : current.stage;
  const requestedSubstep = typeof value.substep === "string" ? value.substep : undefined;
  const substep = stage === "operating_profile"
    ? (requestedSubstep && OPERATING_SUBSTEPS.has(requestedSubstep) ? requestedSubstep : "industry")
    : stage === "platform_preparation"
      ? (requestedSubstep && PREPARATION_SUBSTEPS.has(requestedSubstep) ? requestedSubstep : "brand")
      : undefined;
  return { stage, substep, updatedAt: new Date().toISOString() };
}

function sanitiseVipSetup(raw: unknown, current: Gen2VipSetup): Gen2VipSetup {
  if (!raw || typeof raw !== "object") return current;
  const value = raw as Record<string, unknown>;
  const safeTimestamp = (field: "completedAt" | "rerunRequestedAt" | "firstLoginHandoverCompletedAt") =>
    value[field] === null
      ? null
      : typeof value[field] === "string"
        ? value[field].slice(0, 64)
        : current[field];
  return {
    ...current,
    completedAt: safeTimestamp("completedAt"),
    rerunRequestedAt: safeTimestamp("rerunRequestedAt"),
    firstLoginHandoverCompletedAt: safeTimestamp("firstLoginHandoverCompletedAt"),
  };
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const requestedOrganisationId = req.headers.get("x-dg-operator-organisation")?.trim();
  const targetOrganisationId = requestedOrganisationId && requestedOrganisationId !== session.organisationId
    ? (assertPlatformOperator({ clerkUserId: session.clerkUserId, organisationId: session.organisationId, role: session.role, email: session.email }) ? requestedOrganisationId : null)
    : session.organisationId;
  if (!targetOrganisationId) return NextResponse.json({ error: { code: "operator_only", message: "DigitalGate operator authority required." } }, { status: 403 });
  if (targetOrganisationId !== session.organisationId) return NextResponse.json({ error: { code: "operator_read_only", message: "Customer onboarding is read-only in operator view." } }, { status: 409 });
  const denied = requirePermission(session, { module: "settings", action: "edit", scope: "organisation" });
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const [current, offer] = await Promise.all([
    getGen2OnboardingProgress(targetOrganisationId),
    getOrganisationCommercialOffer(targetOrganisationId),
  ]);
  const vipSetup = sanitiseVipSetup(body.vipSetup, current.vipSetup!);
  const onboardingCompleted = Boolean(current.vipSetup?.completedAt || vipSetup.completedAt);
  const journeyPosition = onboardingCompleted
    ? { stage: "implementation" as const, substep: undefined, updatedAt: new Date().toISOString() }
    : sanitiseJourneyPosition(body.journeyPosition, current.journeyPosition);
  const patch = {
    ...(onboardingCompleted
      ? { currentStep: "implementation" as const }
      : isGen2OnboardingStep(body.currentStep)
        ? { currentStep: body.currentStep }
        : {}),
    journeyPosition,
    operatingProfile: sanitiseOperatingProfile(
      body.operatingProfile,
      current.operatingProfile,
      offer?.industryTemplates,
    ),
    vipSetup,
    ...(offer
      ? {
          industryTemplates: offer.industryTemplates,
          industryApps: offer.industryApps,
          premiumApps: offer.premiumApps,
        }
      : {
          ...(body.industryTemplates !== undefined ? { industryTemplates: sanitiseOperatingProfile({ templates: strings(body.industryTemplates), primaryIndustry: current.operatingProfile?.primaryIndustry, secondaryIndustries: current.operatingProfile?.secondaryIndustries }, current.operatingProfile).templates ?? [] } : {}),
          ...(body.industryApps !== undefined ? { industryApps: strings(body.industryApps) } : {}),
          ...(body.premiumApps !== undefined ? { premiumApps: strings(body.premiumApps) } : {}),
        }),
  };
  const progress = await saveGen2OnboardingProgress(targetOrganisationId, patch);
  return NextResponse.json({ data: { progress } });
}
