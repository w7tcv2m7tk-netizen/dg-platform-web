import {
  getMembershipProfile,
  listOrganisationMembers,
  removeOrganisationMember,
  updateMembershipProfile,
  updateMembershipRole,
} from "@dg/platform-core";
import { pushMembershipProfileToClerk } from "@dg/platform-core/org/membership-profile-clerk";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "team",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

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

  if (typeof body.role === "string" && (body.role === "admin" || body.role === "member")) {
    const denied = requirePermission(session, {
      module: "team",
      action: "manage",
      scope: "organisation",
    });
    if (denied) return denied;
    const result = await updateMembershipRole({
      organisationId: session.organisationId,
      membershipId,
      role: body.role,
      actorRole: session.role,
      actorMembershipId: session.membershipId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "not_found" ? 404 : 403 },
      );
    }
    return NextResponse.json({ data: { member: result.member } });
  }

  const isSelf = target.clerkUserId === session.clerkUserId;
  if (!isSelf) {
    const denied = requirePermission(session, {
      module: "team",
      action: "edit",
      scope: "organisation",
    });
    if (denied) return denied;
  }

  const updated = await updateMembershipProfile(session.organisationId, membershipId, {
    displayName: body.displayName,
    bio: body.bio,
    jobTitle: body.jobTitle,
    phone: body.phone,
    avatarUrl: body.avatarUrl,
    publicEmail: body.publicEmail,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Could not update profile" } },
      { status: 422 },
    );
  }

  let accountSync: { ok: true } | { ok: false; message: string } | null = null;
  if (isSelf && body.syncToAccount !== false) {
    accountSync = await pushMembershipProfileToClerk({
      clerkUserId: target.clerkUserId,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
    });
  }

  const websiteSync = null;

  const refreshed =
    (await getMembershipProfile(session.organisationId, membershipId)) ?? updated;

  return NextResponse.json({
    data: {
      member: refreshed,
      accountSync,
      websiteSync,
    },
  });
}

/** Soft-remove a teammate (owner/admin only). */
export async function DELETE(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const membershipId = String(body.membershipId ?? "").trim();
  if (!membershipId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "membershipId is required" } },
      { status: 422 },
    );
  }

  const result = await removeOrganisationMember({
    organisationId: session.organisationId,
    membershipId,
    actorMembershipId: session.membershipId,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "forbidden_self" || result.code === "last_owner"
          ? 403
          : 422;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ data: { removed: true, membershipId: result.membershipId } });
}
