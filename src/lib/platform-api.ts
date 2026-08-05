import { auth, currentUser } from "@clerk/nextjs/server";
import { sessionHasFeature, resolvePlatformSession, type PlatformSession } from "@dg/platform-core";
import { NextResponse } from "next/server";

export async function requirePlatformSession(): Promise<
  PlatformSession | NextResponse
> {
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

  const session = await resolvePlatformSession({
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

function extractConnectorApiKey(req: Request) {
  const headerKey = req.headers.get("X-API-Key")?.trim();
  if (headerKey) return headerKey;

  const authHeader = req.headers.get("Authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function isValidConnectorKey(provided: string) {
  const keys = [
    process.env.DG_WP_CONNECTOR_API_KEY?.trim(),
    process.env.DG_API_KEY?.trim(),
    process.env.DG_ADDRESS_RESOLVE_API_KEY?.trim(),
  ].filter(Boolean) as string[];

  return keys.some((key) => key === provided);
}

export type PlatformAuthContext =
  | { mode: "session"; session: PlatformSession }
  | { mode: "connector" };

/** Clerk session or connector API key — for address resolve and WP bridge */
export async function authenticatePlatformOrConnector(
  req: Request,
): Promise<PlatformAuthContext | NextResponse> {
  const apiKey = extractConnectorApiKey(req);
  if (apiKey && isValidConnectorKey(apiKey)) {
    return { mode: "connector" };
  }

  const session = await requirePlatformSession();
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
