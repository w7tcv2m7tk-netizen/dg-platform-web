import {
  getCommunicationSession,
  listSessionActions,
  listSessionMessages,
  sessionHasFeature,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.call_centre.read");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getCommunicationSession(session.organisationId, id);
  if (!row) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Session not found" } },
      { status: 404 },
    );
  }

  const canHear = sessionHasFeature(session, "comms.voice.recording");
  const [messages, actions] = await Promise.all([
    canHear ? listSessionMessages(session.organisationId, id) : Promise.resolve([]),
    listSessionActions(session.organisationId, id),
  ]);

  return NextResponse.json({
    data: {
      ...row,
      transcript: canHear ? row.transcript : null,
      recordingUrl: canHear ? row.recordingUrl : null,
      recordingRestricted: !canHear && Boolean(row.recordingUrl || row.transcript),
      messages,
      actions,
    },
  });
}
