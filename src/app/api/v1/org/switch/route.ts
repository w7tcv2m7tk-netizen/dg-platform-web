import { resolveUserMembership } from "@dg/platform-core";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const organisationId = body.organisationId as string | undefined;

  if (!organisationId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "organisationId required" } },
      { status: 422 },
    );
  }

  const membership = await resolveUserMembership(session.clerkUserId, organisationId);
  if (!membership) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You do not belong to this organisation" } },
      { status: 403 },
    );
  }

  await writeActiveOrganisationId(organisationId);
  revalidateTag("portal-me", "max");
  revalidateTag(`portal-me-${session.clerkUserId}`, "max");

  return NextResponse.json({
    data: {
      organisationId,
      organisationName: membership.organisation.name,
      organisationSlug: membership.organisation.slug,
    },
  });
}
