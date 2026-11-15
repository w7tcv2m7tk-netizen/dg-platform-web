import { auth } from "@clerk/nextjs/server";
import { resolveUserMembership } from "@dg/platform-core";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { isTrustedSameOriginRequest } from "@/lib/same-origin";
const hasApiKeyCredential = (req: Request): boolean => {
  const apiKey = req.headers.get("X-API-Key")?.trim();
  const authorization = req.headers.get("Authorization")?.trim();
  return Boolean(apiKey || authorization?.toLowerCase().startsWith("bearer "));
};

export async function POST(req: Request) {
  // A state-changing tenant switch must be an exact same-origin browser request.
  if (!isTrustedSameOriginRequest(req)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Same-origin request required" } },
      { status: 403 },
    );
  }

  // Authenticate the Clerk human independently of the stale active-tenant cookie.
  // Tenant recovery must not require resolving the invalid old tenant first.
  if (hasApiKeyCredential(req)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Interactive session required for tenant switching" } },
      { status: 403 },
    );
  }

  const { userId } = await auth({ acceptsToken: "session_token" });
  if (!userId) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }
  if (userId.startsWith("api_key:")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Interactive session required for tenant switching" } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const organisationId = body?.organisationId;

  if (typeof organisationId !== "string" || !organisationId.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "organisationId required" } },
      { status: 422 },
    );
  }

  // The body target is validated against fresh membership state. The stale active
  // cookie is never consulted and is only replaced after successful validation.
  const membership = await resolveUserMembership(userId, organisationId);
  if (!membership || membership.organisationId !== organisationId) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You do not belong to this organisation" } },
      { status: 403 },
    );
  }

  await writeActiveOrganisationId(organisationId);
  revalidateTag("portal-me", "max");
  revalidateTag(`portal-me-${userId}`, "max");

  return NextResponse.json({
    data: {
      organisationId,
      organisationName: membership.organisation.name,
      organisationSlug: membership.organisation.slug,
    },
  });
}
