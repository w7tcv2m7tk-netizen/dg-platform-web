import {
  getMembershipProfile,
  listOrganisationMembers,
  publishMembershipToWordPressAgent,
  updateMembershipProfile,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const members = await listOrganisationMembers(session.organisationId);
  const me = members.find((m) => m.clerkUserId === session.clerkUserId) ?? null;

  return NextResponse.json({
    data: {
      members,
      me,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const membershipId =
    (body.membershipId as string | undefined)?.trim() || session.membershipId;

  const target = await getMembershipProfile(session.organisationId, membershipId);
  if (!target) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Team member not found" } },
      { status: 404 },
    );
  }

  const isSelf = target.clerkUserId === session.clerkUserId;
  const isOwner = session.role === "owner" || session.role === "admin";
  if (!isSelf && !isOwner) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You can only edit your own profile" } },
      { status: 403 },
    );
  }

  const updated = await updateMembershipProfile(session.organisationId, membershipId, {
    displayName: body.displayName,
    bio: body.bio,
    jobTitle: body.jobTitle,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Could not update profile" } },
      { status: 422 },
    );
  }

  let websiteSync: Awaited<ReturnType<typeof publishMembershipToWordPressAgent>> | null =
    null;
  if (body.syncToWebsite !== false) {
    websiteSync = await publishMembershipToWordPressAgent({
      organisationId: session.organisationId,
      membership: updated,
    });
  }

  const refreshed =
    (await getMembershipProfile(session.organisationId, membershipId)) ?? updated;

  return NextResponse.json({
    data: {
      member: refreshed,
      websiteSync,
    },
  });
}
