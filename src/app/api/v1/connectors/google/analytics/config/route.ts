import { getOrgGoogleAnalyticsSettings, saveOrgGoogleAnalyticsSettings } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  return NextResponse.json({ data: await getOrgGoogleAnalyticsSettings(session.organisationId) });
}

export async function PUT(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const body = await req.json().catch(() => ({})) as { property?: unknown; propertyLabel?: unknown; searchConsoleSite?: unknown };
  const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
  const property = clean(body.property);
  if (property && !/^properties\/\d+$/.test(property)) return NextResponse.json({ error: "Invalid GA4 property" }, { status: 400 });
  const searchConsoleSite = clean(body.searchConsoleSite);
  if (searchConsoleSite && !(searchConsoleSite.startsWith("http://") || searchConsoleSite.startsWith("https://") || searchConsoleSite.startsWith("sc-domain:"))) return NextResponse.json({ error: "Invalid Search Console site" }, { status: 400 });
  await saveOrgGoogleAnalyticsSettings(session.organisationId, { property, propertyLabel: clean(body.propertyLabel), searchConsoleSite });
  return NextResponse.json({ data: await getOrgGoogleAnalyticsSettings(session.organisationId) });
}
