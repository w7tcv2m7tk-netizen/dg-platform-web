import { GROWTH_APP_CATALOGUE, saveGen2OnboardingProgress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

const PLATFORM_OPERATOR_SLUG = "digitalgate";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (session.organisationSlug !== PLATFORM_OPERATOR_SLUG) {
    return NextResponse.json({ error: { code: "operator_only", message: "This setup is reserved for the DigitalGate platform operator." } }, { status: 403 });
  }

  const now = new Date().toISOString();
  const premiumApps = GROWTH_APP_CATALOGUE.map((app) => app.appId);
  const progress = await saveGen2OnboardingProgress(session.organisationId, {
    platformTier: "business",
    industryApps: [],
    industryTemplates: [],
    premiumApps,
    operatingProfile: {
      primaryIndustry: undefined,
      secondaryIndustries: [],
      primaryTemplate: undefined,
      templates: [],
      recommendedIndustryApps: [],
      recommendedGrowthApps: premiumApps,
      recommendedWorkflows: ["Platform operations", "Customer success", "Product intelligence"],
      recommendedDashboard: ["Platform health", "Customer activity", "Growth performance"],
    },
    vipSetup: {
      version: 1,
      required: false,
      completedAt: now,
      firstLoginHandoverCompletedAt: null,
      appearance: "system",
      timezone: "Australia/Brisbane",
      locale: "en-AU",
      currency: "AUD",
    },
    journeyPosition: { stage: "implementation", updatedAt: now },
  });

  return NextResponse.json({ data: { progress, classification: "Platform Operator · Technology & SaaS", billingRequired: false } });
}
