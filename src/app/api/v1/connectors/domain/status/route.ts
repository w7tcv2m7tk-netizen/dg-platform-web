import {
  domainCredentialsConfigured,
  getOrgDomainConnectorTokens,
  probeDomainConnection,
} from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/domain/status — platform + org Domain connection health. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name,
    orgName: portal?.org_name,
  });

  const configured = domainCredentialsConfigured();
  let orgTokens = null;
  if (session) {
    orgTokens = await getOrgDomainConnectorTokens(session.organisationId);
  }

  let probe: Awaited<ReturnType<typeof probeDomainConnection>> | null = null;
  if (configured) {
    probe = await probeDomainConnection();
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.DOMAIN_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.DOMAIN_CLIENT_SECRET?.trim()),
        redirectUri:
          process.env.DOMAIN_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/domain/callback",
        probe,
      },
      organisation: session
        ? {
            id: session.organisationId,
            name: session.organisationName,
            connected: Boolean(orgTokens?.accessToken || orgTokens?.refreshToken),
            expiresAt: orgTokens?.expiresAt ?? null,
            connectedAt: orgTokens?.connectedAt ?? null,
            scope: orgTokens?.scope ?? null,
          }
        : null,
    },
  });
}
