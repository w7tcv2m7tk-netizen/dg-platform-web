import { resolveEnabledAppIds } from "../apps/org-apps";
import { platformEvents } from "../events";
import { getServiceTemplate, isServiceTemplateKey } from "./templates";
import type { ServiceTemplate, ServiceTemplateKey } from "./types";

export type OrgServicesSettings = {
  templateKey?: ServiceTemplateKey;
  appliedAt?: string;
};

export function readOrgServicesSettings(
  settings: unknown,
): OrgServicesSettings {
  const root = (settings as { services?: OrgServicesSettings } | null)?.services;
  if (!root || typeof root !== "object") return {};
  return {
    templateKey:
      root.templateKey && isServiceTemplateKey(root.templateKey)
        ? root.templateKey
        : undefined,
    appliedAt: typeof root.appliedAt === "string" ? root.appliedAt : undefined,
  };
}

export function getActiveServiceTemplate(settings: unknown): ServiceTemplate {
  const { templateKey } = readOrgServicesSettings(settings);
  return getServiceTemplate(templateKey);
}

/**
 * Apply a Service Template to the organisation — enables Services app,
 * stores template key, seeds Business Profile services text.
 */
export async function applyServiceTemplate(input: {
  organisationId: string;
  templateKey: ServiceTemplateKey;
  actorId?: string;
}): Promise<{ template: ServiceTemplate; enabledApps: string[] }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required");
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const template = getServiceTemplate(input.templateKey);
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true, slug: true, settings: true, industry: true },
  });
  if (!org) throw new Error("Organisation not found");

  const { isPlatformOperatorOrgSlug } = await import("../org/platform-org-sanitize");
  if (isPlatformOperatorOrgSlug(org.slug)) {
    throw new Error(
      "Service Templates cannot be applied to the DigitalGate platform operator organisation",
    );
  }

  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const apps = (settings.apps as { enabled?: string[] } | undefined) ?? {};
  const profile = (settings.profile as Record<string, unknown> | undefined) ?? {};
  const brandVoice =
    (profile.brandVoice as Record<string, unknown> | undefined) ?? {};

  const enabled = new Set([
    ...(Array.isArray(apps.enabled) ? apps.enabled : resolveEnabledAppIds({ apps })),
    "services",
    "crm",
    "commerce",
    "automation",
  ]);

  const nextSettings = {
    ...settings,
    apps: { ...apps, enabled: [...enabled] },
    services: {
      templateKey: template.key,
      appliedAt: new Date().toISOString(),
    },
    profile: {
      ...profile,
      industryVertical: "services",
      brandVoice: {
        ...brandVoice,
        services: template.services.join(", "),
      },
      updatedAt: new Date().toISOString(),
    },
  };

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      industry: org.industry || "services",
      settings: nextSettings as unknown as InputJsonValue,
    },
  });

  await prisma.appInstallation.upsert({
    where: {
      organisationId_appId: {
        organisationId: org.id,
        appId: "services",
      },
    },
    create: {
      organisationId: org.id,
      appId: "services",
      version: "0.3.0",
      enabled: true,
    },
    update: { enabled: true, version: "0.3.0" },
  });

  await platformEvents.publish({
    type: "services.template.applied",
    organisationId: org.id,
    actorId: input.actorId,
    entityType: "Organisation",
    entityId: org.id,
    payload: { templateKey: template.key },
    occurredAt: new Date(),
  });

  return { template, enabledApps: [...enabled] };
}
