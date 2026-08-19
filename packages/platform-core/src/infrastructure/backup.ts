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
  wordpressSites: { id: string; label: string; baseUrl: string }[];
  git: {
    sha: string | null;
    repo: string | null;
    environment: string | null;
  };
};

function wpSitesFromEnv(): { id: string; label: string; baseUrl: string }[] {
  const raw = process.env.DG_WP_HEALTH_SITES?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      label?: string;
      baseUrl?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s.baseUrl?.trim())
      .map((s, i) => ({
        id: s.id?.trim() || `wp-${i}`,
        label: s.label?.trim() || s.baseUrl!.replace(/^https?:\/\//, ""),
        baseUrl: s.baseUrl!.replace(/\/$/, ""),
      }));
  } catch {
    return [];
  }
}

/** Honest backup posture for this organisation + DigitalGate platform. */
export async function getInfrastructureBackupOverview(
  organisationId: string,
): Promise<InfrastructureBackupOverview> {
  const websites = process.env.DATABASE_URL
    ? await listWebsites(organisationId)
    : [];
  const wordpressSites = wpSitesFromEnv();
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const repo =
    process.env.VERCEL_GIT_REPO_SLUG?.trim() ||
    process.env.VERCEL_GIT_REPO_OWNER?.trim() ||
    null;
  const environment = process.env.VERCEL_ENV?.trim() || null;
  const neon = Boolean(process.env.DATABASE_URL?.trim());

  const layers: InfrastructureBackupLayer[] = [
    {
      id: "neon",
      label: "Platform database (Neon)",
      status: neon ? "covered" : "gap",
      detail: neon
        ? "CRM, organisations, Design Studio sites, pages, and settings live in Postgres. Neon point-in-time recovery is the restore path — confirm PITR is on in the Neon console."
        : "DATABASE_URL is not set — platform data is not on a hosted database in this environment.",
    },
    {
      id: "git",
      label: "Platform code (GitHub / Vercel)",
      status: sha ? "covered" : "partial",
      detail: sha
        ? `This deployment is commit ${sha.slice(0, 7)}${repo ? ` · ${repo}` : ""}${environment ? ` · ${environment}` : ""}. Unpushed local work is not in this backup.`
        : "No Vercel git metadata on this process. Push dg-platform-web to origin so production matches what you are building.",
    },
    {
      id: "websites",
      label: "Design Studio websites",
      status: !neon ? "gap" : websites.length ? "covered" : "partial",
      detail: neon
        ? websites.length
          ? `${websites.length} site${websites.length === 1 ? "" : "s"} stored in Neon (pages and components included). Download a JSON export below for an offline copy.`
          : "No Design Studio sites in this organisation yet. New sites will be included automatically."
        : "Cannot list sites without a database.",
    },
    {
      id: "wordpress",
      label: "WordPress / connected sites",
      status: wordpressSites.length ? "partial" : "gap",
      detail: wordpressSites.length
        ? `${wordpressSites.length} connected WordPress site${wordpressSites.length === 1 ? "" : "s"} — content is not copied into Neon. Keep host/cPanel or WordPress backups (and Cloudflare if the zone is on Cloudflare).`
        : "No DG_WP_HEALTH_SITES configured. Legacy WordPress sites are not backed up by DigitalGate until they are connected or migrated into Design Studio.",
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
    wordpressSites,
    git: { sha, repo, environment },
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
