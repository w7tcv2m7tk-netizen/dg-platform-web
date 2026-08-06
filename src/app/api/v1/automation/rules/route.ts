import { listAutomationRules, platformApps } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const rules = listAutomationRules();
  const manifestTriggers = platformApps
    .list()
    .flatMap((app) =>
      app.manifest.automationTriggers.map((t) => ({
        id: t.id,
        label: t.label,
        appId: app.manifest.id,
        appName: app.manifest.name,
        objectType: t.objectType,
      })),
    );
  const manifestActions = platformApps
    .list()
    .flatMap((app) =>
      app.manifest.automationActions.map((a) => ({
        id: a.id,
        label: a.label,
        appId: app.manifest.id,
        appName: app.manifest.name,
      })),
    );

  return NextResponse.json({
    data: { rules, manifestTriggers, manifestActions },
  });
}
