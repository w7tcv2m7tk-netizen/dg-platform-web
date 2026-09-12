import { auth, currentUser } from "@clerk/nextjs/server";
import {
  apiKeyToPlatformSession,
  bootConnectorEngine,
  buildAccessContext,
  hasPermission,
  isDemoOrganisationId,
  DEMO_RESTRICTED_MESSAGE,
  registerNotificationEventHandlers,
  sessionHasFeature,
  verifyPlatformApiKey,
  type PermissionAction,
  type PermissionModule,
  type PermissionScope,
  type PlatformSession,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { enforceWriteEntitlement } from "@/lib/write-entitlement";

registerNotificationEventHandlers();
bootConnectorEngine();

export function extractApiKeyFromRequest(req: Request) {
  const headerKey = req.headers.get("X-API-Key")?.trim();
  if (headerKey) return headerKey;

  const authHeader = req.headers.get("Authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function isValidLegacyConnectorKey(provided: string) {
  const keys = [
    process.env.DG_WP_CONNECTOR_API_KEY?.trim(),
    process.env.DG_API_KEY?.trim(),
    process.env.DG_ADDRESS_RESOLVE_API_KEY?.trim(),
  ].filter(Boolean) as string[];

  return keys.some((key) => key === provided);
}

function requestPathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "";
  }
}

function accommodationWritePermission(
  req: Request,
  session: PlatformSession,
): NextResponse | null {
  if (requestPathname(req) !== "/api/v1/accommodation") return null;

  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  return requirePermission(session, {
    module: "industry",
    action: method === "DELETE" ? "delete" : "edit",
    scope: "organisation",
    subModule: "accommodation",
  });
}

/** Property detail mutations are organisation-wide Real Estate operations. */
function realEstatePropertyWritePermission(
  req: Request,
  session: PlatformSession,
): NextResponse | null {
  const pathname = requestPathname(req);
  if (!/^\/api\/v1\/properties\/[^/]+$/.test(pathname)) return null;

  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  return requirePermission(session, {
    module: "industry",
    action: method === "DELETE" ? "delete" : "edit",
    scope: "organisation",
    subModule: "real-estate",
  });
}

export async function requireClerkSession(): Promise<PlatformSession | NextResponse> {
  return resolveClerkSession();
}

export async function requirePlatformAuth(
  req: Request,
): Promise<PlatformSession | NextResponse> {
  const session = await resolvePlatformAuthSession(req);
  if (isNextResponse(session)) return session;

  const writeBlock = await enforceWriteEntitlement(req, session);
  if (writeBlock) return writeBlock;

  const accommodationPermissionBlock = accommodationWritePermission(req, session);
  if (accommodationPermissionBlock) return accommodationPermissionBlock;

  const propertyPermissionBlock = realEstatePropertyWritePermission(req, session);
  if (propertyPermissionBlock) return propertyPermissionBlock;

  return session;
}

async function resolvePlatformAuthSession(
  req: Request,
): Promise<PlatformSession | NextResponse> {
  const apiKey = extractApiKeyFromRequest(req);

  if (apiKey) {
    const verified = await verifyPlatformApiKey(apiKey);
    if (verified) {
      return apiKeyToPlatformSession(verified);
    }

    return NextResponse.json(
      {
        error: {
          code: "auth_failed",
          message: "Invalid or revoked API key",
        },
      },
      { status: 401 },
    );
  }

  return resolveClerkSession();
}

export async function requirePlatformSession(
  req?: Request,
): Promise<PlatformSession | NextResponse> {
  if (req) return requirePlatformAuth(req);
  return resolveClerkSession();
}

async function resolveClerkSession(): Promise<PlatformSession | NextResponse> {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    email;

  const session = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name,
  });

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "database_not_configured",
          message: "Platform database is not configured",
        },
      },
      { status: 503 },
    );
  }

  return session;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function rejectDemoLiveAction(
  session: PlatformSession,
): Promise<NextResponse | null> {
  const demo = await isDemoOrganisationId(session.organisationId);
  if (!demo) return null;
  return NextResponse.json(
    { error: { code: "demo_restricted", message: DEMO_RESTRICTED_MESSAGE } },
    { status: 403 },
  );
}

export function requireFeature(
  session: PlatformSession,
  featureId: string,
): NextResponse | null {
  if (!sessionHasFeature(session, featureId)) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: `Insufficient permissions for ${featureId}`,
        },
      },
      { status: 403 },
    );
  }
  return null;
}

export function requirePermission(
  session: PlatformSession,
  check: {
    module: PermissionModule;
    action: PermissionAction;
    scope?: PermissionScope;
    subModule?: string;
  },
): NextResponse | null {
  const ctx = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: [],
    grants: session.permissionGrants,
  });
  if (!hasPermission(ctx, check)) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: `Insufficient permissions for ${check.module}.${check.action}`,
        },
      },
      { status: 403 },
    );
  }
  return null;
}

export async function requireIndustryAppBeta(
  session: PlatformSession,
  appId: string,
): Promise<NextResponse | null> {
  const { organisationHasIndustryAppBeta, INDUSTRY_APP_BETA_FLAGS } = await import(
    "@dg/platform-core"
  );
  const flag = INDUSTRY_APP_BETA_FLAGS[appId];
  if (!flag) return null;
  const ok = await organisationHasIndustryAppBeta(session.organisationId, appId);
  if (ok) return null;
  return NextResponse.json(
    {
      error: {
        code: "beta_required",
        message: `${appId} requires ${flag} enrolment for this organisation`,
      },
    },
    { status: 403 },
  );
}

export type PlatformAuthContext =
  | { mode: "session"; session: PlatformSession }
  | { mode: "connector" };

export async function authenticatePlatformOrConnector(
  req: Request,
): Promise<PlatformAuthContext | NextResponse> {
  const apiKey = extractApiKeyFromRequest(req);
  if (apiKey && isValidLegacyConnectorKey(apiKey)) {
    return { mode: "connector" };
  }

  const verified = apiKey ? await verifyPlatformApiKey(apiKey) : null;
  if (verified) {
    return { mode: "session", session: apiKeyToPlatformSession(verified) };
  }

  const session = await resolveClerkSession();
  if (isNextResponse(session)) {
    if (apiKey) {
      return NextResponse.json(
        { error: { code: "auth_failed", message: "Invalid API key" } },
        { status: 401 },
      );
    }
    return session;
  }

  return { mode: "session", session };
}

export function sessionIsOrgAdmin(session: PlatformSession): boolean {
  if (session.clerkUserId.startsWith("api_key:")) return false;
  if (["owner", "admin"].includes(session.role)) return true;
  return requirePermission(session, {
    module: "team",
    action: "manage",
    scope: "organisation",
  }) === null;
}

export function requireOrgAdmin(session: PlatformSession): NextResponse | null {
  if (session.clerkUserId.startsWith("api_key:")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "API keys cannot manage API keys" } },
      { status: 403 },
    );
  }

  if (sessionIsOrgAdmin(session)) return null;

  return requirePermission(session, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
}
