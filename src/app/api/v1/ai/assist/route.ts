import { NextResponse } from "next/server";
import {
  buildAiSystemPrompt,
  captureDigitalTwinSnapshot,
  gatherOverviewLiveMetrics,
  generateFromBusinessContext,
  getBusinessContext,
  type AiGenerateAction,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors] = await Promise.all([
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
  ]);

  const twinSnapshot = metrics
    ? captureDigitalTwinSnapshot({
        organisationId: session.organisationId,
        organisationName: session.organisationName,
        enabledAppIds,
        metrics,
        connectors,
      })
    : null;

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot,
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

  const enabledAppIds = await getOrgEnabledAppIds();
  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
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
