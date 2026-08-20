import {
  deleteCommunicationAgent,
  getCommunicationAgent,
  updateCommunicationAgent,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.voice.read");
  if (denied) return denied;

  const { id } = await ctx.params;
  const agent = await getCommunicationAgent(session.organisationId, id);
  if (!agent) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Agent not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: agent });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.agents.configure");
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const agent = await updateCommunicationAgent(session.organisationId, id, {
    actorId: session.clerkUserId,
    ...body,
  });
  if (!agent) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Agent not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: agent });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.agents.configure");
  if (denied) return denied;

  const { id } = await ctx.params;
  const ok = await deleteCommunicationAgent({
    organisationId: session.organisationId,
    agentId: id,
    actorId: session.clerkUserId,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Agent not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { deleted: true } });
}
