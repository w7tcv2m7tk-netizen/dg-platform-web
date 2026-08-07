import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  if (session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only owners and admins can invite" } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const role = body.role === "admin" ? "admin" : "member";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "invalid_email", message: "A valid email is required" } },
      { status: 400 },
    );
  }

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.digitalgate.com.au");

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl}/dashboard`,
      publicMetadata: {
        dgOrganisationId: session.organisationId,
        dgRole: role,
        dgOrgName: session.organisationName,
      },
    });

    // Pending membership placeholder until they accept and sign in.
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@dg/database");
      const placeholderId = `invite:${email}`;
      const existing = await prisma.membership.findFirst({
        where: {
          organisationId: session.organisationId,
          OR: [{ email }, { clerkUserId: placeholderId }],
        },
      });
      if (!existing) {
        await prisma.membership.create({
          data: {
            organisationId: session.organisationId,
            clerkUserId: placeholderId,
            email,
            role,
            status: "invited",
            displayName: email.split("@")[0] ?? email,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        invitationId: invitation.id,
        email,
        role,
        status: invitation.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json(
      { error: { code: "invite_failed", message } },
      { status: 422 },
    );
  }
}
