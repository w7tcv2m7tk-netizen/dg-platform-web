import { NextResponse } from "next/server";
import {
  buildAiSystemPrompt,
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  generateFromBusinessContext,
  getBusinessContext,
  getOrganisationBusinessProfile,
  metricsContextFromLiveMetrics,
  type AiGenerateAction,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

async function loadTwinContext(session: {
  organisationId: string;
  organisationName: string;
  email: string;
  clerkUserId: string;
}) {
  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors, profile] = await Promise.all([
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
  ]);

  if (!metrics) {
    return { enabledAppIds, twinSnapshot: null, profile };
  }

  const { snapshot } = buildLiveTwinWithScores({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    metrics,
    connectors,
    profile,
    metricsContext: metricsContextFromLiveMetrics(metrics),
  });

  return { enabledAppIds, twinSnapshot: snapshot, profile };
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { enabledAppIds, twinSnapshot, profile } = await loadTwinContext(session);

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot,
    profileOverride: profile,
  });

  return NextResponse.json({
    data: {
      context,
      systemPrompt: buildAiSystemPrompt(context),
    },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: { action?: AiGenerateAction };
  try {
    body = (await req.json()) as { action?: AiGenerateAction };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const action = body.action ?? "social_post";
  const valid: AiGenerateAction[] = ["social_post", "email_draft", "briefing"];
  if (!valid.includes(action)) {
    return NextResponse.json(
      { error: { code: "invalid_action", message: "Unknown action" } },
      { status: 400 },
    );
  }

  const { enabledAppIds, twinSnapshot, profile } = await loadTwinContext(session);

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot,
    profileOverride: profile,
  });

  const output = generateFromBusinessContext(context, action);

  return NextResponse.json({
    data: {
      action,
      output,
      systemPrompt: buildAiSystemPrompt(context),
    },
  });
}
