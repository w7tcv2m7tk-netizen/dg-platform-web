import { writeAuditLog } from "../audit";
import { listWebsites, listWebsitesWithPages } from "../websites/crud";

export type BackupLayerStatus = "covered" | "partial" | "gap";

export type InfrastructureBackupLayer = {
  id: string;
  label: string;
  status: BackupLayerStatus;
  detail: string;
};

export type InfrastructureWebsiteBackupRow = {
  id: string;
  name: string;
  status: string;
  pageCount: number;
  updatedAt: string;
  publishedAt: string | null;
};

export type InfrastructureBackupOverview = {
  generatedAt: string;
  layers: InfrastructureBackupLayer[];
  websites: InfrastructureWebsiteBackupRow[];
};

/** Customer-safe backup posture for the active organisation only. */
export async function getInfrastructureBackupOverview(
  organisationId: string,
): Promise<InfrastructureBackupOverview> {
  const neon = Boolean(process.env.DATABASE_URL?.trim());
  const websites = neon ? await listWebsites(organisationId) : [];

  const layers: InfrastructureBackupLayer[] = [
    {
      id: "platform-data",
      label: "Business data",
      status: neon ? "covered" : "gap",
      detail: neon
        ? "Your organisation data is stored in the DigitalGate platform database and covered by the platform recovery process."
        : "Platform backup status is currently unavailable.",
    },
    {
      id: "websites",
      label: "Design Studio websites",
      status: !neon ? "gap" : websites.length ? "covered" : "partial",
      detail: neon
        ? websites.length
          ? `${websites.length} site${websites.length === 1 ? "" : "s"} stored with pages and components included. Download a JSON export below for an offline copy.`
          : "No Design Studio sites in this organisation yet. New sites will be included automatically."
        : "Website backup status is currently unavailable.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    layers,
    websites: websites.map((site) => ({
      id: site.id,
      name: site.name,
      status: site.status,
      pageCount: site.pageCount,
      updatedAt: site.updatedAt,
      publishedAt: site.publishedAt ?? null,
    })),
  };
}

export async function exportOrganisationWebsiteBackup(
  organisationId: string,
  actorId?: string,
) {
  const sites = await listWebsitesWithPages(organisationId);
  const payload = {
    kind: "digitalgate.website-backup",
    version: 1,
    organisationId,
    exportedAt: new Date().toISOString(),
    websites: sites,
  };

  await writeAuditLog({
    organisationId,
    actorId,
    action: "export",
    entityType: "WebsiteBackup",
    entityId: organisationId,
    changes: { websiteCount: sites.length },
  });

  return payload;
}
