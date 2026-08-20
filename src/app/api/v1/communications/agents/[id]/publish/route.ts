import { publishCommunicationAgent } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  rejectDemoLiveAction,
  requireFeature,
  requirePlatformAuth,
} from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.agents.configure");
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  try {
    const agent = await publishCommunicationAgent({
      organisationId: session.organisationId,
      agentId: id,
      actorId: session.clerkUserId,
    });
    if (!agent) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Agent not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: agent });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "Publish failed",
        },
      },
      { status: 502 },
    );
  }
}
