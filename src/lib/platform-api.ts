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

// Ensure in-app notification fan-out is bound in this Node isolate.
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

/** Clerk session only — for user-specific routes (support chat, key management). */
export async function requireClerkSession(): Promise<PlatformSession | NextResponse> {
  return resolveClerkSession();
}

/** Clerk session or organisation API key (`dg_live_…`). */
export async function requirePlatformAuth(
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

/** @deprecated Use requirePlatformAuth(req) or requireClerkSession() */
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

/** Block live side-effects (email, billing, connectors, team invites) in the demo org. */
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

/** Enforce feature access for the current session (Platform 1.0 role gate). */
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

/** Enforce locked permission model (module + action + scope). */
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
    organisationSlug: session.organisationSlug,
    email: session.email,
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

export type PlatformAuthContext =
  | { mode: "session"; session: PlatformSession }
  | { mode: "connector" };

/** Clerk session or legacy env connector key — for address resolve and WP bridge */
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

/** Organisation owners/admins only (Clerk sessions — not API keys). */
export function requireOrgAdmin(session: PlatformSession): NextResponse | null {
  if (session.clerkUserId.startsWith("api_key:")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "API keys cannot manage API keys" } },
      { status: 403 },
    );
  }

  if (["owner", "admin"].includes(session.role)) return null;

  return requirePermission(session, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
}
