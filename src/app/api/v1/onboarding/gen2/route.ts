import {
  createNegotiatedCommercialCheckoutSession,
  createOrganisationGoal,
  createPlatformCheckoutSession,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
  getOrganisationBusinessProfile,
  getOrganisationCommercialOffer,
  getOrganisationGoals,
  saveGen2OnboardingProgress,
  updateOrganisationBusinessProfile,
  type Gen2OnboardingProgress,
  type Gen2OnboardingStep,
  type Gen2VipSetup,
  type PlatformSession,
  isGen2OnboardingStep,
  assertPlatformOperator,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

const GOAL_METRIC_HINTS: Record<string, { metric: "custom" | "active_leads" | "seo" | "ai_visibility" | "business_health"; target: number }> = {
  more_leads: { metric: "active_leads", target: 20 },
  seo: { metric: "seo", target: 80 },
  ai_visibility: { metric: "ai_visibility", target: 80 },
  website_performance: { metric: "business_health", target: 80 },
};
const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);
const CLIENT_CHECKLIST_KEYS = new Set(["business_identity", "business_profile", "goals", "plan", "apps", "implementation"]);
const APPEARANCES = new Set(["system", "dark", "light"]);
const MIGRATION_INTENTS = new Set(["migrate", "replace", "connect", "none"]);
const CONNECTION_PROVIDERS = new Set(["google_workspace", "microsoft_365", "apple_icloud"]);
const CONNECTION_CAPABILITIES = new Set(["contacts", "calendar", "mail"]);
const CONNECTION_STATUSES = new Set(["not_started", "planned", "connected", "attention_required"]);

function resolveOrganisationId(req: Request, session: PlatformSession) {
  const requested = req.headers.get("x-dg-operator-organisation")?.trim();
  if (!requested || requested === session.organisationId) return session.organisationId;
  const operator = assertPlatformOperator({ clerkUserId: session.clerkUserId, organisationId: session.organisationId, role: session.role, email: session.email });
  if (!operator) return NextResponse.json({ error: { code: "operator_only", message: "DigitalGate operator authority required." } }, { status: 403 });
  return requested;
}

type AllowedClientProgress = Partial<Pick<Gen2OnboardingProgress, "platformTier" | "supportPlan" | "billingCadence" | "industryApps" | "industryTemplates" | "premiumApps" | "checklist" | "vipSetup">>;

async function effectiveCommercialOffer(organisationId: string) {
  const [programmeRecord, current] = await Promise.all([getFoundingOnboarding(organisationId), getOrganisationCommercialOffer(organisationId)]);
  return programmeRecord?.commercialOfferSnapshot ?? current;
}
function cleanShortString(value: unknown, max = 160) { return typeof value === "string" ? value.trim().slice(0, max) : undefined; }
function savedBrandPalette(value: unknown): [string, string] | null {
  if (typeof value !== "string") return null;
  const colours = value.split(",").map((colour) => colour.trim()).filter((colour) => /^#[0-9a-fA-F]{6}$/.test(colour));
  if (!colours.length) return null;
  return [colours[0]!, colours[1] ?? colours[0]!];
}
function safeVipSetup(raw: unknown): Gen2VipSetup | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const appearance = APPEARANCES.has(String(source.appearance)) ? (source.appearance as Gen2VipSetup["appearance"]) : "system";
  const connections: NonNullable<Gen2VipSetup["connections"]> = {};
  if (source.connections && typeof source.connections === "object") {
    for (const [provider, value] of Object.entries(source.connections as Record<string, unknown>)) {
      if (!CONNECTION_PROVIDERS.has(provider) || !value || typeof value !== "object") continue;
      const connection = value as Record<string, unknown>;
      const requestedCapabilities = Array.isArray(connection.requestedCapabilities)
        ? connection.requestedCapabilities.filter((capability): capability is "contacts" | "calendar" | "mail" => typeof capability === "string" && CONNECTION_CAPABILITIES.has(capability)).slice(0, 3)
        : [];
      const status = CONNECTION_STATUSES.has(String(connection.status)) ? (connection.status as "not_started" | "planned" | "connected" | "attention_required") : "not_started";
      connections[provider as keyof typeof connections] = { requested: connection.requested === true, requestedCapabilities, status };
    }
  }
  const socialProfiles: Record<string, string> = {};
  if (source.socialProfiles && typeof source.socialProfiles === "object") {
    for (const [network, url] of Object.entries(source.socialProfiles as Record<string, unknown>).slice(0, 12)) {
      const cleanUrl = cleanShortString(url, 500); if (cleanUrl) socialProfiles[network.slice(0, 40)] = cleanUrl;
    }
  }
  return {
    version: 1, required: source.required === true,
    completedAt: cleanShortString(source.completedAt, 64) ?? null,
    rerunRequestedAt: cleanShortString(source.rerunRequestedAt, 64) ?? null,
    appearance,
    timezone: cleanShortString(source.timezone, 80) || "Australia/Brisbane",
    locale: cleanShortString(source.locale, 24) || "en-AU",
    currency: cleanShortString(source.currency, 12) || "AUD",
    websiteDomain: cleanShortString(source.websiteDomain, 255),
    websiteMigrationIntent: MIGRATION_INTENTS.has(String(source.websiteMigrationIntent)) ? (source.websiteMigrationIntent as Gen2VipSetup["websiteMigrationIntent"]) : undefined,
    brandPrimary: cleanShortString(source.brandPrimary, 32), brandAccent: cleanShortString(source.brandAccent, 32),
    brandColoursExtracted: source.brandColoursExtracted === true, brandColoursOverridden: source.brandColoursOverridden === true,
    socialProfiles, contactImportRequested: source.contactImportRequested === true,
    contactImportFormat: source.contactImportFormat === "vcard" ? "vcard" : source.contactImportFormat === "csv" ? "csv" : undefined,
    connections,
    aiAdvicePriorities: Array.isArray(source.aiAdvicePriorities) ? source.aiAdvicePriorities.filter((v): v is string => typeof v === "string").map(v => v.slice(0, 120)).slice(0, 12) : [],
    aiReportingPriorities: Array.isArray(source.aiReportingPriorities) ? source.aiReportingPriorities.filter((v): v is string => typeof v === "string").map(v => v.slice(0, 120)).slice(0, 12) : [],
  };
}
function safeClientProgress(raw: unknown): AllowedClientProgress {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>; const safe: AllowedClientProgress = {};
  if (["starter", "professional", "business"].includes(String(source.platformTier))) safe.platformTier = source.platformTier as Gen2OnboardingProgress["platformTier"];
  if (["standard", "priority", "success_partner", "enterprise_success"].includes(String(source.supportPlan))) safe.supportPlan = source.supportPlan as Gen2OnboardingProgress["supportPlan"];
  if (source.billingCadence === "monthly" || source.billingCadence === "annual") safe.billingCadence = source.billingCadence;
  if (Array.isArray(source.industryApps)) safe.industryApps = source.industryApps.filter((v): v is string => typeof v === "string" && v.length <= 80).slice(0, 20);
  if (Array.isArray(source.industryTemplates)) safe.industryTemplates = source.industryTemplates.filter((v): v is string => typeof v === "string" && v.length <= 80).slice(0, 30);
  if (Array.isArray(source.premiumApps)) safe.premiumApps = source.premiumApps.filter((v): v is string => typeof v === "string" && v.length <= 80).slice(0, 20);
  const vipSetup = safeVipSetup(source.vipSetup); if (vipSetup) safe.vipSetup = vipSetup;
  if (source.checklist && typeof source.checklist === "object") {
    const checklist: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(source.checklist as Record<string, unknown>)) if (CLIENT_CHECKLIST_KEYS.has(key) && value === true) checklist[key] = true;
    if (Object.keys(checklist).length) safe.checklist = checklist;
  }
  return safe;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req); if (isNextResponse(session)) return session;
  const resolvedOrganisationId = resolveOrganisationId(req, session); if (isNextResponse(resolvedOrganisationId)) return resolvedOrganisationId;
  const [progress, profile, goals, commercialOffer, billing] = await Promise.all([
    getGen2OnboardingProgress(resolvedOrganisationId), getOrganisationBusinessProfile(resolvedOrganisationId),
    getOrganisationGoals(resolvedOrganisationId).catch(() => []), effectiveCommercialOffer(resolvedOrganisationId),
    getOrganisationBillingStatus(resolvedOrganisationId),
  ]);
  const palette = savedBrandPalette(profile?.brandColours);
  const effectiveProgress = palette ? {
    ...progress,
    vipSetup: {
      ...(progress.vipSetup ?? {}),
      brandPrimary: progress.vipSetup?.brandPrimary || palette[0],
      brandAccent: progress.vipSetup?.brandAccent || palette[1],
    },
  } : progress;
  return NextResponse.json({ data: { progress: effectiveProgress, profile, goals, commercialOffer, billing: { kind: billing?.kind ?? null, platformExempt: billing?.kind === "platform_exempt" }, organisationName: session.organisationName } });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req); if (isNextResponse(session)) return session;
  const resolvedOrganisationId = resolveOrganisationId(req, session); if (isNextResponse(resolvedOrganisationId)) return resolvedOrganisationId;
  if (resolvedOrganisationId !== session.organisationId) return NextResponse.json({ error: { code: "operator_read_only", message: "Customer onboarding is read-only in operator view." } }, { status: 409 });
  const denied = requirePermission(session, { module: "settings", action: "edit", scope: "organisation" }); if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session); if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const markStepComplete = isGen2OnboardingStep(body.markStepComplete) ? (body.markStepComplete as Gen2OnboardingStep) : undefined;
  if (markStepComplete === "stripe") {
    const billing = await getOrganisationBillingStatus(resolvedOrganisationId);
    const exempt = billing?.kind === "platform_exempt";
    if (!exempt && (!billing || !billing.hasStripeCustomer || !VERIFIED_CHECKOUT_KINDS.has(billing.kind))) {
      return NextResponse.json({ error: { code: "checkout_not_confirmed", message: "Your Stripe checkout has not been confirmed yet. Please try again in a moment." } }, { status: 409 });
    }
  }
  if (body.profile && typeof body.profile === "object") {
    const profileDenied = requirePermission(session, { module: "settings", action: "manage", scope: "organisation" }); if (profileDenied) return profileDenied;
    await updateOrganisationBusinessProfile(resolvedOrganisationId, body.profile);
  }
  if (Array.isArray(body.goals) && body.goals.length > 0) {
    const existing = await getOrganisationGoals(resolvedOrganisationId); const existingTitles = new Set(existing.map(g => g.title.toLowerCase()));
    for (const g of body.goals.slice(0, 8)) {
      const id = typeof g === "string" ? g : g?.id; const title = typeof g === "string" ? g : g?.title ?? g?.label;
      if (!title || typeof title !== "string") continue; const trimmed = title.trim(); if (trimmed.length < 2 || existingTitles.has(trimmed.toLowerCase())) continue;
      const hint = GOAL_METRIC_HINTS[String(id)] ?? { metric: "custom" as const, target: 1 };
      await createOrganisationGoal(resolvedOrganisationId, { title: trimmed, metric: hint.metric, target: hint.target, horizon: "quarter", status: "active" }).catch(() => null); existingTitles.add(trimmed.toLowerCase());
    }
  }
  const [offer, existingProgress] = await Promise.all([effectiveCommercialOffer(resolvedOrganisationId), getGen2OnboardingProgress(resolvedOrganisationId)]);
  const clientProgress = safeClientProgress(body.progress); const requestedVipSetup = clientProgress.vipSetup;
  if (requestedVipSetup?.completedAt) {
    const profile = await getOrganisationBusinessProfile(resolvedOrganisationId); const industryTemplates = clientProgress.industryTemplates ?? existingProgress.industryTemplates ?? []; const missing: string[] = [];
    if (!profile?.businessName?.trim() && !profile?.tradingName?.trim()) missing.push("business name"); if (!profile?.industryVertical?.trim()) missing.push("industry");
    if (!profile?.brandVoice?.services?.trim()) missing.push("services or products"); if (!profile?.brandVoice?.targetAudience?.trim()) missing.push("target customers"); if (!industryTemplates.length) missing.push("exact business type");
    if (!profile?.logoUrl && !profile?.iconUrl) missing.push("logo or icon"); if (!profile?.brandColours?.trim()) missing.push("brand colours"); if (!requestedVipSetup.timezone?.trim()) missing.push("timezone"); if (!requestedVipSetup.appearance) missing.push("appearance preference");
    if (missing.length) return NextResponse.json({ error: { code: "vip_setup_incomplete", message: `Aida still needs ${missing.join(", ")} before your Business Operations Platform is ready.` } }, { status: 409 });
  }
  const requiredVipSetup: Gen2VipSetup | undefined = markStepComplete === "welcome" ? {
    ...(existingProgress.vipSetup ?? {}), ...(requestedVipSetup ?? {}), version: 1, required: true,
    appearance: requestedVipSetup?.appearance ?? existingProgress.vipSetup?.appearance ?? "system", timezone: requestedVipSetup?.timezone ?? existingProgress.vipSetup?.timezone ?? "Australia/Brisbane",
    locale: requestedVipSetup?.locale ?? existingProgress.vipSetup?.locale ?? "en-AU", currency: requestedVipSetup?.currency ?? existingProgress.vipSetup?.currency ?? "AUD",
  } : requestedVipSetup;
  const allowedProgress: AllowedClientProgress = { platformTier: clientProgress.platformTier, supportPlan: clientProgress.supportPlan, billingCadence: clientProgress.billingCadence, industryApps: clientProgress.industryApps, industryTemplates: clientProgress.industryTemplates, premiumApps: clientProgress.premiumApps, checklist: clientProgress.checklist, vipSetup: requiredVipSetup };
  const lockedProgress: AllowedClientProgress = offer ? { ...allowedProgress, platformTier: offer.platformTier, billingCadence: offer.cadence, industryApps: offer.industryApps, premiumApps: offer.premiumApps, ...(offer.supportPlan ? { supportPlan: offer.supportPlan } : {}) } : allowedProgress;
  const progress = await saveGen2OnboardingProgress(resolvedOrganisationId, { ...lockedProgress, ...(markStepComplete === "stripe" ? { subscriptionActivatedAt: new Date().toISOString() } : {}), markStepComplete });
  return NextResponse.json({ data: { progress } });
}

/** Start Stripe Checkout from onboarding order summary. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req); if (isNextResponse(session)) return session;
  const resolvedOrganisationId = resolveOrganisationId(req, session); if (isNextResponse(resolvedOrganisationId)) return resolvedOrganisationId;
  const blocked = await rejectDemoLiveAction(session); if (blocked) return blocked;
  const operatorPreview = resolvedOrganisationId !== session.organisationId && req.headers.get("x-dg-operator-checkout-preview") === "true";
  if (resolvedOrganisationId !== session.organisationId && !operatorPreview) return NextResponse.json({ error: { code: "operator_checkout_disabled", message: "Subscription checkout is disabled while testing a customer organisation." } }, { status: 409 });
  if (operatorPreview) {
    const operator = assertPlatformOperator({ clerkUserId: session.clerkUserId, organisationId: session.organisationId, role: session.role, email: session.email });
    if (!operator) return NextResponse.json({ error: { code: "operator_only", message: "DigitalGate operator authority required." } }, { status: 403 });
  } else {
    const denied = requirePermission(session, { module: "billing", action: "manage", scope: "organisation" }); if (denied) return denied;
  }
  const [progress, offer, billing] = await Promise.all([
    getGen2OnboardingProgress(resolvedOrganisationId), effectiveCommercialOffer(resolvedOrganisationId), getOrganisationBillingStatus(resolvedOrganisationId),
  ]);
  const body = await req.json().catch(() => ({}));
  const platformTier = offer?.platformTier ?? (body.platformTier as string | undefined) ?? progress.platformTier ?? "professional";
  const billingCadence = offer?.cadence ?? (body.billingCadence === "annual" || progress.billingCadence === "annual" ? ("annual" as const) : ("monthly" as const));
  const industryApps = offer?.industryApps ?? body.industryApps ?? progress.industryApps; const premiumApps = offer?.premiumApps ?? body.premiumApps ?? progress.premiumApps; const requestedSupportPlan = typeof body.supportPlan === "string" ? body.supportPlan : undefined; const supportPlan = offer?.supportPlan ?? requestedSupportPlan ?? progress.supportPlan ?? "standard";
  if (billing?.kind === "platform_exempt") {
    await saveGen2OnboardingProgress(resolvedOrganisationId, {
      platformTier: platformTier as "starter" | "professional" | "business", billingCadence, industryApps, premiumApps, supportPlan,
      subscriptionActivatedAt: new Date().toISOString(), markStepComplete: "stripe",
    });
    return NextResponse.json({ data: { exempt: true, url: "/onboarding?checkout=success" } });
  }
  try {
    const targetProfile = operatorPreview ? await getOrganisationBusinessProfile(resolvedOrganisationId) : null;
    const checkoutEmail = operatorPreview ? (targetProfile?.businessEmail || targetProfile?.contactEmail || session.email) : session.email;
    const checkoutBusinessName = operatorPreview ? (targetProfile?.businessName || targetProfile?.tradingName || "Customer") : session.organisationName;
    const checkout = offer ? await createNegotiatedCommercialCheckoutSession({ organisationId: resolvedOrganisationId, email: checkoutEmail, businessName: checkoutBusinessName, offer, successPath: "/onboarding?checkout=success", cancelPath: "/onboarding?checkout=cancelled" })
      : await createPlatformCheckoutSession({ organisationId: resolvedOrganisationId, email: checkoutEmail, platformTier, industryApps, premiumApps, supportPlan, businessName: checkoutBusinessName, billingCadence, successPath: "/onboarding?checkout=success", cancelPath: "/onboarding?checkout=cancelled" });
    if (!operatorPreview) await saveGen2OnboardingProgress(resolvedOrganisationId, { platformTier: platformTier as "starter" | "professional" | "business", billingCadence, industryApps, premiumApps, supportPlan, stripeCheckoutSessionId: checkout.sessionId, markStepComplete: "order_summary" });
    return NextResponse.json({ data: checkout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown checkout error";
    console.error("[onboarding.checkout] Stripe checkout failed", {
      organisationId: resolvedOrganisationId,
      platformTier,
      billingCadence,
      hasCommercialOffer: Boolean(offer),
      message,
    });
    return NextResponse.json(
      {
        error: {
          code: "checkout_failed",
          message: "We couldn't start subscription checkout. Please try again or contact DigitalGate.",
          ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
        },
      },
      { status: 422 },
    );
  }
}
