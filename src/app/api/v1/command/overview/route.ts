import { getOperatorCommandCentreOpsHome } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req, "command.overview.read");
  if (isNextResponse(auth)) return auth;

  const data = await getOperatorCommandCentreOpsHome(auth.operator);
  return NextResponse.json({ data });
}
