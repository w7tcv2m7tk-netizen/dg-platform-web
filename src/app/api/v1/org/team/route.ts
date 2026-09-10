import {
  getMembershipProfile,
  listOrganisationMembers,
  removeOrganisationMember,
  updateMembershipPermissions,
  updateMembershipProfile,
  updateMembershipRole,
  type PermissionAction,
  type PermissionGrant,
  type PermissionModule,
  type PermissionScope,
} from "@dg/platform-core";
import { pushMembershipProfileToClerk } from "@dg/platform-core/org/membership-profile-clerk";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

const PERMISSION_MODULES = new Set<PermissionModule>([
  "crm",
  "commerce",
  "documents",
  "communications",
  "websites",
  "infrastructure",
  "industry",
  "growth",
  "intelligence",
  "team",
  "billing",
  "settings",
  "partners",
  "delivery",
]);
const PERMISSION_ACTIONS = new Set<PermissionAction>([
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "manage",
  "approve",
  "assign",
]);
const PERMISSION_SCOPES = new Set<PermissionScope>([
  "own",
  "assigned",
  "team",
  "organisation",
]);

function parsePermissionPayload(raw: unknown): PermissionGrant[] | null {
  if (!Array.isArray(raw) || raw.length > 100) return null;
  const deduped = new Map<string, PermissionGrant>();

  for (const value of raw) {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (
      typeof item.module !== "string" ||
      !PERMISSION_MODULES.has(item.module as PermissionModule) ||
      typeof item.action !== "string" ||
      !PERMISSION_ACTIONS.has(item.action as PermissionAction) ||
      typeof item.scope !== "string" ||
      !PERMISSION_SCOPES.has(item.scope as PermissionScope)
    ) {
      return null;
    }

    let subModule: string | undefined;
    if (item.subModule !== undefined && item.subModule !== null && item.subModule !== "") {
      if (typeof item.subModule !== "string") return null;
      const candidate = item.subModule.trim();
      if (!candidate || candidate.length > 80 || !/^[a-z0-9._-]+$/i.test(candidate)) return null;
      subModule = candidate;
    }

    const grant: PermissionGrant = {
      module: item.module as PermissionModule,
      action: item.action as PermissionAction,
      scope: item.scope as PermissionScope,
      ...(subModule ? { subModule } : {}),
    };
    deduped.set(`${grant.module}:${grant.subModule ?? "*"}:${grant.action}:${grant.scope}`, grant);
  }

  return [...deduped.values()];
}

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

  if (Object.prototype.hasOwnProperty.call(body, "permissions")) {
    const denied = requirePermission(session, {
      module: "team",
      action: "manage",
      scope: "organisation",
    });
    if (denied) return denied;
    if (session.role !== "owner") {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only the Organisation Owner can change granular permissions",
          },
        },
        { status: 403 },
      );
    }

    const permissions = parsePermissionPayload(body.permissions);
    if (!permissions) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Invalid permission grants" } },
        { status: 422 },
      );
    }

    const result = await updateMembershipPermissions({
      organisationId: session.organisationId,
      membershipId,
      grants: permissions,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "not_found" ? 404 : 403 },
      );
    }
    return NextResponse.json({ data: { member: result.member } });
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
