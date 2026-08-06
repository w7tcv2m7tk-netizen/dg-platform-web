import { createOrganisationForUser, type OrgTemplate } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

const VALID_TEMPLATES = new Set<OrgTemplate>(["default", "real-estate", "accommodation"]);

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string | undefined)?.trim();
  const template = (body.template as OrgTemplate | undefined) ?? "default";

  if (!name) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }

  if (!VALID_TEMPLATES.has(template)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid template" } },
      { status: 422 },
    );
  }

  try {
    const created = await createOrganisationForUser({
      clerkUserId: session.clerkUserId,
      email: session.email,
      name: session.name,
      orgName: name,
      template,
    });

    await writeActiveOrganisationId(created.organisationId);

    return NextResponse.json({ data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create organisation";
    return NextResponse.json(
      { error: { code: "create_failed", message } },
      { status: 422 },
    );
  }
}
