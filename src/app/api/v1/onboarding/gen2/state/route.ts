import {
  getGen2OnboardingProgress,
  saveGen2OnboardingProgress,
  updateOrganisationBusinessProfile,
  isGen2OnboardingStep,
  type Gen2OnboardingStep,
  type Gen2VipSetup,
} from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

const OPERATING_STEPS = new Set(["industry", "business_type", "profile"]);
const PREPARATION_STEPS = new Set(["brand", "website", "data", "connections", "ai_reporting", "workspace", "review"]);
const APPEARANCES = new Set(["system", "dark", "light"]);
const MIGRATION = new Set(["migrate", "replace", "connect", "none"]);
const PROVIDERS = new Set(["google_workspace", "microsoft_365", "apple_icloud"]);
const CAPABILITIES = new Set(["contacts", "calendar", "mail"]);
const STATUSES = new Set(["not_started", "planned", "connected", "attention_required"]);

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}
function strings(value: unknown, max = 30, itemMax = 120) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.slice(0, itemMax)).slice(0, max) : [];
}
function safeSetup(raw: unknown, current: Gen2VipSetup): Gen2VipSetup {
  if (!raw || typeof raw !== "object") return current;
  const source = raw as Record<string, unknown>;
  const connections: Gen2VipSetup["connections"] = { ...(current.connections ?? {}) };
  if (source.connections && typeof source.connections === "object") {
    for (const [provider, rawConnection] of Object.entries(source.connections as Record<string, unknown>)) {
      if (!PROVIDERS.has(provider) || !rawConnection || typeof rawConnection !== "object") continue;
      const c = rawConnection as Record<string, unknown>;
      connections[provider as keyof typeof connections] = {
        requested: c.requested === true,
        requestedCapabilities: strings(c.requestedCapabilities, 3, 20).filter((v): v is "contacts" | "calendar" | "mail" => CAPABILITIES.has(v)),
        status: STATUSES.has(String(c.status)) ? c.status as "not_started" | "planned" | "connected" | "attention_required" : "not_started",
      };
    }
  }
  return {
    ...current,
    version: 1,
    required: source.required === undefined ? current.required : source.required === true,
    completedAt: source.completedAt === undefined ? current.completedAt : text(source.completedAt, 64) ?? null,
    rerunRequestedAt: source.rerunRequestedAt === undefined ? current.rerunRequestedAt : text(source.rerunRequestedAt, 64) ?? null,
    operatingProfileStep: OPERATING_STEPS.has(String(source.operatingProfileStep)) ? source.operatingProfileStep as Gen2VipSetup["operatingProfileStep"] : current.operatingProfileStep,
    platformPreparationStep: PREPARATION_STEPS.has(String(source.platformPreparationStep)) ? source.platformPreparationStep as Gen2VipSetup["platformPreparationStep"] : current.platformPreparationStep,
    primaryIndustryId: source.primaryIndustryId === undefined ? current.primaryIndustryId : text(source.primaryIndustryId, 80),
    secondaryIndustryIds: source.secondaryIndustryIds === undefined ? current.secondaryIndustryIds : strings(source.secondaryIndustryIds, 12, 80),
    recommendedGrowthApps: source.recommendedGrowthApps === undefined ? current.recommendedGrowthApps : strings(source.recommendedGrowthApps, 20, 80),
    firstLoginHandoverCompletedAt: source.firstLoginHandoverCompletedAt === undefined ? current.firstLoginHandoverCompletedAt : text(source.firstLoginHandoverCompletedAt, 64) ?? null,
    appearance: APPEARANCES.has(String(source.appearance)) ? source.appearance as Gen2VipSetup["appearance"] : current.appearance,
    timezone: text(source.timezone, 80) ?? current.timezone,
    locale: text(source.locale, 24) ?? current.locale,
    currency: text(source.currency, 12) ?? current.currency,
    websiteDomain: source.websiteDomain === undefined ? current.websiteDomain : text(source.websiteDomain, 255),
    websiteMigrationIntent: source.websiteMigrationIntent === undefined ? current.websiteMigrationIntent : MIGRATION.has(String(source.websiteMigrationIntent)) ? source.websiteMigrationIntent as Gen2VipSetup["websiteMigrationIntent"] : undefined,
    brandPrimary: source.brandPrimary === undefined ? current.brandPrimary : text(source.brandPrimary, 32),
    brandAccent: source.brandAccent === undefined ? current.brandAccent : text(source.brandAccent, 32),
    brandColoursExtracted: source.brandColoursExtracted === undefined ? current.brandColoursExtracted : source.brandColoursExtracted === true,
    brandColoursOverridden: source.brandColoursOverridden === undefined ? current.brandColoursOverridden : source.brandColoursOverridden === true,
    contactImportRequested: source.contactImportRequested === undefined ? current.contactImportRequested : source.contactImportRequested === true,
    contactImportFormat: source.contactImportFormat === "csv" || source.contactImportFormat === "vcard" ? source.contactImportFormat : current.contactImportFormat,
    socialProfiles: source.socialProfiles && typeof source.socialProfiles === "object" ? Object.fromEntries(Object.entries(source.socialProfiles as Record<string, unknown>).map(([k,v]) => [k.slice(0,40), text(v,500) ?? ""]).filter(([,v]) => Boolean(v))) : current.socialProfiles,
    connections,
    aiAdvicePriorities: source.aiAdvicePriorities === undefined ? current.aiAdvicePriorities : strings(source.aiAdvicePriorities, 12),
    aiReportingPriorities: source.aiReportingPriorities === undefined ? current.aiReportingPriorities : strings(source.aiReportingPriorities, 12),
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
  const baseSetup = current.vipSetup!;
  const vipSetup = safeSetup(body.vipSetup, baseSetup);
  const currentStep = isGen2OnboardingStep(body.currentStep) ? body.currentStep as Gen2OnboardingStep : current.currentStep;
  const patch = {
    currentStep,
    vipSetup,
    ...(Array.isArray(body.industryTemplates) ? { industryTemplates: strings(body.industryTemplates, 30, 80) } : {}),
    ...(Array.isArray(body.industryApps) ? { industryApps: strings(body.industryApps, 20, 80) } : {}),
    ...(Array.isArray(body.premiumApps) ? { premiumApps: strings(body.premiumApps, 20, 80) } : {}),
    ...(body.platformTier === "starter" || body.platformTier === "professional" || body.platformTier === "business" ? { platformTier: body.platformTier } : {}),
    ...(body.billingCadence === "monthly" || body.billingCadence === "annual" ? { billingCadence: body.billingCadence } : {}),
  };
  const progress = await saveGen2OnboardingProgress(session.organisationId, patch);
  if (body.profile && typeof body.profile === "object") {
    const p = body.profile as Record<string, unknown>;
    await updateOrganisationBusinessProfile(session.organisationId, {
      businessName: text(p.businessName, 160), tradingName: text(p.tradingName,160), abn: text(p.abn,40), websiteUrl: text(p.websiteUrl,500), industryVertical: text(p.industryVertical,160), businessPhone: text(p.phone,60), businessEmail: text(p.email,254), contactName: text(p.primaryContactName,160), contactPhone: text(p.phone,60), contactEmail: text(p.email,254),
      brandVoice: { tone: text(p.description,1000), services: text(p.services,3000), targetAudience: text(p.targetCustomers,3000), tagline: text(p.differentiators,1000), competitors: text(p.challenges,2000) },
    });
  }
  return NextResponse.json({ data: { progress } });
}
