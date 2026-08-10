/**
 * Per-org connector settings blob under organisation.settings.connectors.<id>
 */

import type { Prisma } from "@dg/database";

export type OrgConnectorSettingsBlob = Record<string, unknown>;

export async function getOrgConnectorSettings(
  organisationId: string,
  connectorId: string,
): Promise<OrgConnectorSettingsBlob | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const connectors = (org?.settings as { connectors?: Record<string, unknown> } | null)
    ?.connectors;
  const blob = connectors?.[connectorId];
  if (!blob || typeof blob !== "object") return null;
  return blob as OrgConnectorSettingsBlob;
}

export async function saveOrgConnectorSettings(
  organisationId: string,
  connectorId: string,
  settings: OrgConnectorSettingsBlob,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const prev = (org?.settings as Record<string, unknown> | null) ?? {};
  const connectors = (prev.connectors as Record<string, unknown> | undefined) ?? {};
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...prev,
        connectors: {
          ...connectors,
          [connectorId]: settings,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

export async function clearOrgConnectorSettings(
  organisationId: string,
  connectorId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const prev = (org?.settings as Record<string, unknown> | null) ?? {};
  const connectors = {
    ...((prev.connectors as Record<string, unknown> | undefined) ?? {}),
  };
  delete connectors[connectorId];
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...prev,
        connectors,
      } as Prisma.InputJsonValue,
    },
  });
}
