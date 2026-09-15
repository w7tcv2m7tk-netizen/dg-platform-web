import {
  getGen2OnboardingProgress,
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
const ALLOWED_INDUSTRIES = new Set(["property", "finance", "services", "accommodation-hospitality", "automotive", "creator-media"]);

function strings(value: unknown, max = 24, maxLength = 100) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, maxLength)).filter(Boolean).slice(0, max)
    : [];
}

function sanitiseOperatingProfile(raw: unknown, current: Gen2OperatingProfile = {}): Gen2OperatingProfile {
  if (!raw || typeof raw !== "object") return current;
  const value = raw as Record<string, unknown>;
  const primaryIndustry = typeof value.primaryIndustry === "string" && ALLOWED_INDUSTRIES.has(value.primaryIndustry) ? value.primaryIndustry : current.primaryIndustry;
  return {
    ...current,
    primaryIndustry,
    secondaryIndustries: value.secondaryIndustries === undefined ? current.secondaryIndustries : strings(value.secondaryIndustries).filter((id) => ALLOWED_INDUSTRIES.has(id) && id !== primaryIndustry),
    primaryTemplate: typeof value.primaryTemplate === "string" ? value.primaryTemplate.slice(0, 100) : current.primaryTemplate,
    templates: value.templates === undefined ? current.templates : strings(value.templates),
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
  let substep: string | undefined;
  if (stage === "operating_profile") {
    substep = requestedSubstep && OPERATING_SUBSTEPS.has(requestedSubstep) ? requestedSubstep : "industry";
  } else if (stage === "platform_preparation") {
    substep = requestedSubstep && PREPARATION_SUBSTEPS.has(requestedSubstep) ? requestedSubstep : "brand";
  }
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
  const denied = requirePermission(session, { module: "settings", action: "edit", scope: "organisation" });
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const current = await getGen2OnboardingProgress(session.organisationId);
  const patch = {
    ...(isGen2OnboardingStep(body.currentStep) ? { currentStep: body.currentStep } : {}),
    journeyPosition: sanitiseJourneyPosition(body.journeyPosition, current.journeyPosition),
    operatingProfile: sanitiseOperatingProfile(body.operatingProfile, current.operatingProfile),
    vipSetup: sanitiseVipSetup(body.vipSetup, current.vipSetup!),
    ...(body.industryTemplates !== undefined ? { industryTemplates: strings(body.industryTemplates) } : {}),
    ...(body.industryApps !== undefined ? { industryApps: strings(body.industryApps) } : {}),
    ...(body.premiumApps !== undefined ? { premiumApps: strings(body.premiumApps) } : {}),
  };
  const progress = await saveGen2OnboardingProgress(session.organisationId, patch);
  return NextResponse.json({ data: { progress } });
}
