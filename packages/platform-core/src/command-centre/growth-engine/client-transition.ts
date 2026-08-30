/**
 * Growth Engine Module 10 — prospect → live client organisation.
 * Creates or links an Organisation, advances stage to onboarding.
 * No Stripe subscription invented — billing stays operator-driven.
 */

import {
  isPlatformOperatorContext,
  type PlatformOperatorContext,
} from "../../access/platform-operator-context";
import { writeAuditLog } from "../../audit";
import { platformEvents } from "../../events";
import {
  createClientOrganisation,
  inferOrgTemplateFromIndustry,
} from "../../org/client-org";
import type { OrgTemplate } from "../../org/memberships";
import type { ClientTransitionResult } from "./types";

export type TransitionGrowthProspectInput = {
  /**
   * Proof of platform authority. This operation creates organisations and
   * grants the actor membership in them, so it is platform-only by
   * construction — see access/platform-operator-context.
   */
  operator: PlatformOperatorContext;
  prospectId: string;
  /** Override inferred template from prospect industry. */
  template?: OrgTemplate;
  /** Link an existing org instead of creating one. */
  existingOrganisationId?: string;
};

export type TransitionGrowthProspectError =
  | { error: "not_found" }
  | { error: "already_converted"; organisationId: string }
  | { error: "org_not_found" }
  | { error: "forbidden" }
  | { error: "validation"; message: string };

function isError(
  value: ClientTransitionResult | TransitionGrowthProspectError,
): value is TransitionGrowthProspectError {
  return "error" in value;
}

/**
 * Convert a won (or late-stage) prospect into a platform client org.
 */
export async function transitionGrowthProspectToClient(
  input: TransitionGrowthProspectInput,
): Promise<ClientTransitionResult | TransitionGrowthProspectError> {
  // Defence in depth: the brand cannot be forged in TypeScript, but refuse
  // anything reaching here through an untyped path.
  if (!isPlatformOperatorContext(input.operator)) {
    return { error: "forbidden" };
  }

  if (!process.env.DATABASE_URL) {
    return { error: "validation", message: "DATABASE_URL is not configured" };
  }

  const actorId = input.operator.actorId;
  const actorEmail = input.operator.actorEmail;
  const actorName = input.operator.actorName;

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const prospect = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!prospect) return { error: "not_found" };
  if (prospect.archivedAt) return { error: "not_found" };

  if (prospect.convertedOrganisationId) {
    return {
      error: "already_converted",
      organisationId: prospect.convertedOrganisationId,
    };
  }

  const template =
    input.template ?? inferOrgTemplateFromIndustry(prospect.industry);

  let organisationId: string;
  let installedAppIds: string[] = [];
  let created = false;

  if (input.existingOrganisationId?.trim()) {
    const existing = await prisma.organisation.findUnique({
      where: { id: input.existingOrganisationId.trim() },
      select: {
        id: true,
        settings: true,
        appInstallations: { select: { appId: true, enabled: true } },
      },
    });
    if (!existing) return { error: "org_not_found" };

    organisationId = existing.id;
    installedAppIds = existing.appInstallations
      .filter((a) => a.enabled)
      .map((a) => a.appId);

    // Ensure staff can switch into the linked org
    const membership = await prisma.membership.findFirst({
      where: {
        organisationId: existing.id,
        clerkUserId: actorId,
        status: "active",
      },
    });
    if (!membership) {
      await prisma.membership.create({
        data: {
          organisationId: existing.id,
          clerkUserId: actorId,
          role: "admin",
          status: "active",
          email: actorEmail?.trim() || null,
          displayName: actorName?.trim() || null,
        },
      });
    }

    // Carry useful prospect metadata onto profile when empty
    const settings = (existing.settings as Record<string, unknown> | null) ?? {};
    const profile =
      settings.profile && typeof settings.profile === "object"
        ? (settings.profile as Record<string, unknown>)
        : {};
    const nextProfile = {
      ...profile,
      businessName:
        (typeof profile.businessName === "string" && profile.businessName.trim()) ||
        prospect.businessName,
      websiteUrl:
        (typeof profile.websiteUrl === "string" && profile.websiteUrl.trim()) ||
        prospect.websiteUrl ||
        undefined,
      location:
        (typeof profile.location === "string" && profile.location.trim()) ||
        prospect.location ||
        undefined,
      primaryContactName:
        (typeof profile.primaryContactName === "string" &&
          profile.primaryContactName.trim()) ||
        prospect.contactName ||
        undefined,
      primaryContactEmail:
        (typeof profile.primaryContactEmail === "string" &&
          profile.primaryContactEmail.trim()) ||
        prospect.contactEmail ||
        undefined,
      primaryContactPhone:
        (typeof profile.primaryContactPhone === "string" &&
          profile.primaryContactPhone.trim()) ||
        prospect.contactPhone ||
        undefined,
    };
    await prisma.organisation.update({
      where: { id: existing.id },
      data: {
        settings: {
          ...settings,
          profile: nextProfile,
          growth: {
            ...((settings.growth as object) ?? {}),
            sourceProspectId: prospect.id,
            linkedAt: new Date().toISOString(),
          },
        } as unknown as InputJsonValue,
      },
    });
  } else {
    const createdOrg = await createClientOrganisation({
      actorClerkUserId: actorId,
      actorEmail: actorEmail,
      actorName: actorName,
      orgName: prospect.businessName,
      template,
      sourceProspectId: prospect.id,
      profile: {
        businessName: prospect.businessName,
        websiteUrl: prospect.websiteUrl,
        industry: prospect.industry,
        location: prospect.location,
        contactName: prospect.contactName,
        contactEmail: prospect.contactEmail,
        contactPhone: prospect.contactPhone,
      },
    });
    organisationId = createdOrg.organisationId;
    installedAppIds = createdOrg.installedAppIds;
    created = createdOrg.created;
  }

  const meta =
    prospect.metadata && typeof prospect.metadata === "object"
      ? (prospect.metadata as Record<string, unknown>)
      : {};

  const updated = await prisma.growthProspect.update({
    where: { id: prospect.id },
    data: {
      convertedOrganisationId: organisationId,
      stage: "onboarding",
      metadata: {
        ...meta,
        transitionedAt: new Date().toISOString(),
        transitionTemplate: template,
        transitionCreatedOrg: created,
      } as unknown as InputJsonValue,
    },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: prospect.id,
      type: "proposal_accepted",
      metadata: {
        organisationId,
        template,
        created,
        source: "client_transition",
      },
    },
  });

  // Preserve prospect activity identity — never orphan history on convert.
  if (prospect.organisationId) {
    const { preserveProspectActivityOnCrmConvert } = await import(
      "../../prospecting-engine/activity-workspace"
    );
    await preserveProspectActivityOnCrmConvert({
      organisationId: prospect.organisationId,
      prospectId: prospect.id,
      actorId: actorId,
    });
  }

  if (input.operator.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operator.operatorOrganisationId,
      actorId: actorId,
      action: "update",
      entityType: "GrowthProspect",
      entityId: prospect.id,
      changes: {
        convertedOrganisationId: organisationId,
        stage: "onboarding",
        template,
        created,
      },
    });
  }

  const transitionedAt = new Date();

  await platformEvents.publish({
    type: "prospect.proposal_accepted",
    organisationId: organisationId,
    actorId: actorId,
    entityType: "GrowthProspect",
    entityId: prospect.id,
    payload: {
      prospectId: prospect.id,
      businessName: prospect.businessName,
      organisationId,
      template,
      created,
      stage: updated.stage,
    },
    occurredAt: transitionedAt,
  });

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { name: true },
  });

  const result: ClientTransitionResult = {
    prospectId: prospect.id,
    organisationId,
    organisationName: org?.name ?? prospect.businessName,
    installedAppIds,
    onboardingStarted: true,
    twinSnapshotCreated: false,
    transitionedAt,
    contactEmail: prospect.contactEmail,
    contactName: prospect.contactName,
    nextSteps: {
      clientsHref: "/command/clients",
      teamHref: "/dashboard/settings/team",
      billingHref: "/dashboard/settings/billing",
      connectorsHref: "/dashboard/settings/connectors",
      switchHint:
        "Switch into the new client org (org switcher), then invite the owner and open Billing — Stripe checkout is created there, not invented here.",
    },
  };

  return result;
}

export function transitionResultOrThrow(
  value: ClientTransitionResult | TransitionGrowthProspectError,
): ClientTransitionResult {
  if (isError(value)) {
    throw new Error(
      value.error === "validation"
        ? value.message
        : value.error === "already_converted"
          ? `Prospect already linked to org ${value.organisationId}`
          : value.error,
    );
  }
  return value;
}
