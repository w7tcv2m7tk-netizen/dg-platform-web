import { getOrgGoogleAnalyticsSettings, saveOrgGoogleAnalyticsSettings } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  return NextResponse.json({ data: await getOrgGoogleAnalyticsSettings(session.organisationId) });
}

async function save(req: Request, body: { property?: unknown; propertyLabel?: unknown; searchConsoleSite?: unknown }) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
  const current = await getOrgGoogleAnalyticsSettings(session.organisationId);
  const property = body.property === undefined ? current.property : clean(body.property);
  const propertyLabel = body.propertyLabel === undefined ? current.propertyLabel : clean(body.propertyLabel);
  const searchConsoleSite = body.searchConsoleSite === undefined ? current.searchConsoleSite : clean(body.searchConsoleSite);
  if (property && !/^properties\/\d+$/.test(property)) return NextResponse.json({ error: "Invalid GA4 property" }, { status: 400 });
  if (searchConsoleSite && !(searchConsoleSite.startsWith("http://") || searchConsoleSite.startsWith("https://") || searchConsoleSite.startsWith("sc-domain:"))) return NextResponse.json({ error: "Invalid Search Console site" }, { status: 400 });
  await saveOrgGoogleAnalyticsSettings(session.organisationId, { property, propertyLabel, searchConsoleSite });
  return { session };
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({})) as { property?: unknown; propertyLabel?: unknown; searchConsoleSite?: unknown };
  const result = await save(req, body);
  if (isNextResponse(result)) return result;
  return NextResponse.json({ data: await getOrgGoogleAnalyticsSettings(result.session.organisationId) });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const result = await save(req, { property: form.has("property") ? form.get("property") : undefined, propertyLabel: form.has("propertyLabel") ? form.get("propertyLabel") : undefined, searchConsoleSite: form.has("searchConsoleSite") ? form.get("searchConsoleSite") : undefined });
  if (isNextResponse(result)) return result;
  return NextResponse.redirect(new URL("/apps/analytics/connectors/google?saved=1", req.url), 303);
}
