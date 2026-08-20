import { getCommunicationProvider } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.voice.read");
  if (denied) return denied;

  try {
    const voices = await getCommunicationProvider("elevenlabs").listVoices();
    return NextResponse.json({ data: voices });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "Could not list voices",
        },
      },
      { status: 502 },
    );
  }
}
