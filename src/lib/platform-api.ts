import { auth, currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession, type PlatformSession } from "@dg/platform-core";
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
