import {
  applyServiceTemplate,
  getServicesOverview,
  isServiceTemplateKey,
  listServiceTemplates,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requireIndustryAppBeta, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "services");
    if (betaDenied) return betaDenied;
  }
  const denied = requireFeature(session, "services.templates.read");
  if (denied) return denied;

  return NextResponse.json({ data: listServiceTemplates() });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "services");
    if (betaDenied) return betaDenied;
  }
  const denied = requireFeature(session, "services.jobs.write");
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { templateKey?: string } | null;
  if (!body?.templateKey || !isServiceTemplateKey(body.templateKey)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Valid templateKey required" } },
      { status: 422 },
    );
  }

  const result = await applyServiceTemplate({
    organisationId: session.organisationId,
    templateKey: body.templateKey,
    actorId: session.clerkUserId,
  });

  const overview = await getServicesOverview(session.organisationId);

  return NextResponse.json({
    data: {
      template: result.template,
      enabledApps: result.enabledApps,
      overview,
    },
  });
}
