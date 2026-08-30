/**
 * Live URL timing + Google PageSpeed Insights (when available).
 * Scores are cached on website.metadata.pagespeed so Health Centre stays fast.
 */

import { updateWebsite } from "./crud";
import { resolvePrimaryLinkedDomain } from "../infrastructure/domains/primary-linked";
import { safeExternalFetch } from "../command-centre/growth-engine/ssrf-guard";

import type { SerializedWebsite } from "./types";

export type CachedPagespeed = {
  mobile: number | null;
  desktop: number | null;
  checkedAt: string | null;
  ttfbMs?: number | null;
  bytes?: number | null;
  url?: string | null;
};

const PSI_TIMEOUT_MS = 45_000;
const FETCH_TIMEOUT_MS = 8_000;

export function pagespeedFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CachedPagespeed {
  const raw = metadata?.pagespeed;
  if (!raw || typeof raw !== "object") {
    return { mobile: null, desktop: null, checkedAt: null };
  }
  const p = raw as Record<string, unknown>;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
  return {
    mobile: num(p.mobile),
    desktop: num(p.desktop),
    checkedAt: typeof p.checkedAt === "string" ? p.checkedAt : null,
    ttfbMs: num(p.ttfbMs),
    bytes: num(p.bytes),
    url: typeof p.url === "string" ? p.url : null,
  };
}

export function publicHttpsUrlForDomain(name: string | null | undefined): string | null {
  const host = name?.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (!host) return null;
  return `https://${host.replace(/\.$/, "")}/`;
}

async function probeTtfb(url: string): Promise<{ ttfbMs: number; bytes: number; status: number }> {
  const started = Date.now();
  // The probed host comes from a tenant-linked domain, so it is not trusted.
  // safeExternalFetch validates every redirect hop — redirect:follow would let
  // a tenant domain bounce this probe into private address space.
  const res = await safeExternalFetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": "DigitalGate-HealthCentre/1.0" },
  });
  const ttfbMs = Date.now() - started;
  const buf = await res.arrayBuffer();
  return { ttfbMs, bytes: buf.byteLength, status: res.status };
}

function psiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_PAGESPEED_API_KEY?.trim() ||
    process.env.PAGESPEED_API_KEY?.trim() ||
    undefined
  );
}

async function fetchPsiScore(
  url: string,
  strategy: "mobile" | "desktop",
): Promise<number | null> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  const key = psiApiKey();
  if (key) endpoint.searchParams.set("key", key);

  const res = await fetch(endpoint.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    lighthouseResult?: { categories?: { performance?: { score?: number } } };
  };
  const score = json.lighthouseResult?.categories?.performance?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return Math.round(score * 100);
}

export async function probeWebsitePagespeed(url: string): Promise<CachedPagespeed> {
  const checkedAt = new Date().toISOString();
  let ttfbMs: number | null = null;
  let bytes: number | null = null;
  try {
    const timing = await probeTtfb(url);
    ttfbMs = timing.ttfbMs;
    bytes = timing.bytes;
  } catch {
    /* live fetch optional — PSI may still succeed */
  }

  const [mobile, desktop] = await Promise.all([
    fetchPsiScore(url, "mobile"),
    fetchPsiScore(url, "desktop"),
  ]);

  return {
    mobile,
    desktop,
    checkedAt,
    ttfbMs,
    bytes,
    url,
  };
}

export async function persistWebsitePagespeed(input: {
  organisationId: string;
  websiteId: string;
  pagespeed: CachedPagespeed;
}): Promise<SerializedWebsite | null> {
  return updateWebsite({
    organisationId: input.organisationId,
    websiteId: input.websiteId,
    metadata: { pagespeed: input.pagespeed },
  });
}

export async function refreshWebsitePagespeedForLiveUrl(input: {
  organisationId: string;
  websiteId: string;
  url: string;
}): Promise<CachedPagespeed> {
  const pagespeed = await probeWebsitePagespeed(input.url);
  await persistWebsitePagespeed({
    organisationId: input.organisationId,
    websiteId: input.websiteId,
    pagespeed,
  });
  return pagespeed;
}

export async function refreshPublishedSitesPagespeed(limit = 8): Promise<{
  refreshed: number;
  skipped: number;
  errors: string[];
}> {
  const { prisma } = await import("@dg/database");
  const websites = await prisma.website.findMany({
    where: { status: "published" },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, organisationId: true, slug: true, metadata: true },
  });
  const domains = await prisma.infrastructureDomain.findMany({
    where: {
      websiteId: { in: websites.map((w) => w.id) },
    },
    select: {
      id: true,
      websiteId: true,
      name: true,
      sslState: true,
    },
  });

  let refreshed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const site of websites) {
    const linked = domains.filter((d) => d.websiteId === site.id);
    const primary = resolvePrimaryLinkedDomain(
      {
        id: site.id,
        metadata: (site.metadata as Record<string, unknown>) ?? null,
      },
      linked,
    );
    const url = publicHttpsUrlForDomain(primary?.name);
    if (!url) {
      skipped += 1;
      continue;
    }
    try {
      await refreshWebsitePagespeedForLiveUrl({
        organisationId: site.organisationId,
        websiteId: site.id,
        url,
      });
      refreshed += 1;
    } catch (err) {
      errors.push(
        `${site.slug}: ${err instanceof Error ? err.message : "pagespeed failed"}`,
      );
    }
  }

  return { refreshed, skipped, errors };
}
