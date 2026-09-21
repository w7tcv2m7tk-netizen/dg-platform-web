import {
  activateTeamInviteSeat,
  ensurePendingTeamInvite,
  normalizeTeamInviteRole,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";
import { maxUsersForTier, type PlatformTier } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const denied = requirePermission(session, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const role = normalizeTeamInviteRole(body.role);

  const { prisma } = await import("@dg/database");
  const subscription = await prisma.platformSubscription.findUnique({
    where: { organisationId: session.organisationId },
    select: { planTier: true },
  });
  const tier = subscription?.planTier as PlatformTier | null;
  if (tier) {
    const maxUsers = maxUsersForTier(tier);
    if (maxUsers != null) {
      const occupiedSeats = await prisma.membership.count({
        where: {
          organisationId: session.organisationId,
          status: { in: ["active", "invited"] },
        },
      });
      if (occupiedSeats >= maxUsers) {
        return NextResponse.json(
          {
            error: {
              code: "plan_user_limit",
              message: `Your ${tier === "professional" ? "Growth" : "Starter"} plan supports up to ${maxUsers} user${maxUsers === 1 ? "" : "s"}. Upgrade the Core Platform plan to add another user.`,
            },
          },
          { status: 403 },
        );
      }
    }
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "invalid_email", message: "A valid email is required" } },
      { status: 400 },
    );
  }

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const existingUsers = await client.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const existingUser = existingUsers.data[0] ?? null;

    if (existingUser) {
      const seat = await activateTeamInviteSeat({
        organisationId: session.organisationId,
        clerkUserId: existingUser.id,
        email,
        name:
          [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ") ||
          email,
        role,
      });
      if (!seat) {
        return NextResponse.json(
          { error: { code: "invite_failed", message: "Could not add this user to the team" } },
          { status: 422 },
        );
      }
      return NextResponse.json({
        data: {
          email,
          role: seat.role,
          status: "active",
          joinedImmediately: true,
        },
      });
    }

    const pending = await ensurePendingTeamInvite({
      organisationId: session.organisationId,
      email,
      role,
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.digitalgate.com.au");

    let invitationId: string | null = null;
    let inviteStatus = "pending";
    try {
      const invitation = await client.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${appUrl}/dashboard`,
        publicMetadata: {
          dgOrganisationId: session.organisationId,
          dgRole: role,
          dgOrgName: session.organisationName,
        },
      });
      invitationId = invitation.id;
      inviteStatus = invitation.status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!/already exists|already invited/i.test(message)) {
        throw err;
      }
    }

    return NextResponse.json({
      data: {
        invitationId,
        email,
        role,
        status: inviteStatus,
        membershipId: pending.membershipId,
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
