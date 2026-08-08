import { getClientIntelligence } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireCommandCentre } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requireCommandCentre(req, "command.clients.read");
  if (isNextResponse(session)) return session;

  const data = await getClientIntelligence();
  return NextResponse.json({ data });
}
