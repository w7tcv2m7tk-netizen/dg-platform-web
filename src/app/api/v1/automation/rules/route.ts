import { listAutomationRules } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const rules = listAutomationRules().map((rule) => ({
    id: rule.id,
    trigger: rule.trigger,
    action: rule.action,
    enabled: rule.enabled,
  }));

  return NextResponse.json({ data: { rules } });
}
