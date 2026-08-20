import {
  createCommunicationAgent,
  listCommunicationAgents,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.voice.read");
  if (denied) return denied;

  const items = await listCommunicationAgents(session.organisationId);
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.agents.configure");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }

  const agent = await createCommunicationAgent({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    name: body.name,
    description: body.description,
    type: body.type,
    voiceId: body.voiceId,
    model: body.model,
    greeting: body.greeting,
    language: body.language,
    timezone: body.timezone,
    systemPrompt: body.systemPrompt,
    businessHours: body.businessHours,
    enabledChannels: body.enabledChannels,
    knowledgeBaseId: body.knowledgeBaseId,
    routingRules: body.routingRules,
    transferRules: body.transferRules,
    escalationRules: body.escalationRules,
    config: body.config,
  });

  return NextResponse.json({ data: agent }, { status: 201 });
}
