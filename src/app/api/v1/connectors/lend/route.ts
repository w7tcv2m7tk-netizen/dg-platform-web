import { createLendClient, getOrgConnectorSettings, saveOrgConnectorSettings } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { specialistIndustryEntitlementBlock } from "@/lib/specialist-industry-entitlement";

export const dynamic = "force-dynamic";

type LendSettings = {
  apiKey?: string;
  apiSecret?: string;
  environment?: "sandbox" | "live";
  status?: "connected" | "error" | "disconnected";
  lastVerifiedAt?: string;
  lastError?: string;
};

function publicState(settings: LendSettings | null) {
  return {
    configured: Boolean(settings?.apiKey && settings?.apiSecret),
    environment: settings?.environment ?? "sandbox",
    status: settings?.status ?? "disconnected",
    lastVerifiedAt: settings?.lastVerifiedAt ?? null,
    lastError: settings?.lastError ?? null,
  };
}

async function authorise(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await specialistIndustryEntitlementBlock(session.organisationId, "finance");
  if (blocked) return blocked;
  return session;
}

export async function GET(req: Request) {
  const session = await authorise(req);
  if (isNextResponse(session)) return session;
  const settings = (await getOrgConnectorSettings(session.organisationId, "lend")) as LendSettings | null;
  return NextResponse.json({ data: publicState(settings) });
}

export async function POST(req: Request) {
  const session = await authorise(req);
  if (isNextResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as {
    apiKey?: string;
    apiSecret?: string;
    environment?: "sandbox" | "live";
  } | null;
  const apiKey = body?.apiKey?.trim();
  const apiSecret = body?.apiSecret?.trim();
  const environment = body?.environment === "live" ? "live" : "sandbox";
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: { code: "invalid_credentials", message: "Lend API key and secret are required." } }, { status: 400 });
  }

  const client = createLendClient({ apiKey, apiSecret, environment });
  try {
    await client.getPurposes();
    const settings: LendSettings = {
      apiKey,
      apiSecret,
      environment,
      status: "connected",
      lastVerifiedAt: new Date().toISOString(),
    };
    await saveOrgConnectorSettings(session.organisationId, "lend", settings);
    return NextResponse.json({ data: publicState(settings) });
  } catch {
    return NextResponse.json({ error: { code: "lend_connection_failed", message: "Lend credentials could not be verified. Check the credentials and environment." } }, { status: 400 });
  }
}
