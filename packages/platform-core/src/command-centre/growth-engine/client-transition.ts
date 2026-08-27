/**
 * Growth Engine Module 10 — prospect → live client organisation.
 * Creates or links an Organisation, advances stage to onboarding.
 * No Stripe subscription invented — billing stays operator-driven.
 */

import { writeAuditLog } from "../../audit";
import { platformEvents } from "../../events";
import {
  createClientOrganisation,
  inferOrgTemplateFromIndustry,
} from "../../org/client-org";
import type { OrgTemplate } from "../../org/memberships";
import type { ClientTransitionResult } from "./types";

export type TransitionGrowthProspectInput = {
  prospectId: string;
  actorId: string;
  operatorOrganisationId?: string;
  actorEmail?: string | null;
  actorName?: string | null;
  /** Override inferred template from prospect industry. */
  template?: OrgTemplate;
  /** Link an existing org instead of creating one. */
  existingOrganisationId?: string;
};

export type TransitionGrowthProspectError =
  | { error: "not_found" }
  | { error: "already_converted"; organisationId: string }
  | { error: "org_not_found" }
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
  if (!process.env.DATABASE_URL) {
    return { error: "validation", message: "DATABASE_URL is not configured" };
  }

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
        clerkUserId: input.actorId,
        status: "active",
      },
    });
    if (!membership) {
      await prisma.membership.create({
        data: {
          organisationId: existing.id,
          clerkUserId: input.actorId,
          role: "admin",
          status: "active",
          email: input.actorEmail?.trim() || null,
          displayName: input.actorName?.trim() || null,
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
      actorClerkUserId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
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
      actorId: input.actorId,
    });
  }

  if (input.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operatorOrganisationId,
      actorId: input.actorId,
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
    actorId: input.actorId,
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
