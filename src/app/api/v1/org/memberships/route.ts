import { auth } from "@clerk/nextjs/server";
import { listUserOrganisations } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { readActiveOrganisationId } from "@/lib/active-org-cookie";

function hasApiKeyCredential(req: Request): boolean {
  const apiKey = req.headers.get("X-API-Key")?.trim();
  const authorization = req.headers.get("Authorization")?.trim();
  return Boolean(apiKey || authorization?.toLowerCase().startsWith("bearer "));
}

export async function GET(req: Request) {
  if (hasApiKeyCredential(req)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Interactive session required" } },
      { status: 403 },
    );
  }
  const { userId } = await auth({ acceptsToken: "session_token" });
  if (!userId) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
  }
  if (userId.startsWith("api_key:")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Interactive session required" } }, { status: 403 });
  }

  const organisations = await listUserOrganisations(userId);
  const activeOrganisationId = await readActiveOrganisationId().catch(() => undefined);
  const visibleActiveOrganisationId = activeOrganisationId && organisations.some(
    (organisation) => organisation.organisationId === activeOrganisationId,
  ) ? activeOrganisationId : null;

  return NextResponse.json({
    data: {
      activeOrganisationId: visibleActiveOrganisationId,
      organisations,
    },
  });
}
