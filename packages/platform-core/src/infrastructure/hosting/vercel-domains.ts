/**
 * Optional Vercel project domain attach + recommended DNS targets.
 * Requires VERCEL_TOKEN + VERCEL_PROJECT_ID (and optional VERCEL_TEAM_ID).
 *
 * Preferred path: attach hostnames, then GET /v6/domains/{host}/config for
 * project-specific A / CNAME (legacy anycast still works but often stays Invalid).
 */

export const LEGACY_VERCEL_A_TARGET = "76.76.21.21";
export const LEGACY_VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export type VercelDomainAttachResult =
  | {
      ok: true;
      configured: true;
      hostname: string;
      verified: boolean | null;
      raw?: unknown;
    }
  | {
      ok: false;
      configured: boolean;
      hostname: string;
      message: string;
      status?: number;
    };

export type WebsiteHostingDnsTargets = {
  aTarget: string;
  cnameTarget: string;
  source: "vercel" | "env" | "legacy";
  note?: string;
  apexHostname: string;
  wwwHostname: string;
};

export function isVercelDomainAttachConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim(),
  );
}

function vercelAuth(): {
  token: string;
  projectId: string;
  teamId?: string;
} | null {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) return null;
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;
  return { token, projectId, teamId };
}

export function apexAndWwwHostnames(domainName: string): {
  apex: string;
  www: string;
} {
  const raw = domainName.trim().toLowerCase().replace(/\.$/, "");
  if (raw.startsWith("www.")) {
    const apex = raw.slice(4);
    return { apex, www: raw };
  }
  return { apex: raw, www: `www.${raw}` };
}

export async function attachVercelProjectDomain(
  hostname: string,
): Promise<VercelDomainAttachResult> {
  const auth = vercelAuth();
  const name = hostname.trim().toLowerCase();

  if (!auth) {
    return {
      ok: false,
      configured: false,
      hostname: name,
      message:
        "Vercel domain attach not configured. Set VERCEL_TOKEN + VERCEL_PROJECT_ID (optional VERCEL_TEAM_ID), or add the domain manually in Vercel → Domains.",
    };
  }

  const qs = auth.teamId ? `?teamId=${encodeURIComponent(auth.teamId)}` : "";
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(auth.projectId)}/domains${qs}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        typeof json.error === "object" &&
        json.error &&
        typeof (json.error as { message?: string }).message === "string"
          ? (json.error as { message: string }).message
          : typeof json.message === "string"
            ? json.message
            : `Vercel HTTP ${res.status}`;
      if (
        res.status === 409 ||
        /already|exists/i.test(errMsg) ||
        (typeof json.error === "object" &&
          (json.error as { code?: string })?.code === "domain_already_in_use")
      ) {
        return {
          ok: true,
          configured: true,
          hostname: name,
          verified: null,
          raw: json,
        };
      }
      return {
        ok: false,
        configured: true,
        hostname: name,
        message: errMsg,
        status: res.status,
      };
    }

    return {
      ok: true,
      configured: true,
      hostname: name,
      verified:
        typeof json.verified === "boolean" ? json.verified : null,
      raw: json,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      hostname: name,
      message: err instanceof Error ? err.message : "Vercel attach failed",
    };
  }
}

/** Attach apex + www (idempotent). */
export async function attachVercelWebsiteHostnames(
  domainName: string,
): Promise<{ apex: VercelDomainAttachResult; www: VercelDomainAttachResult }> {
  const { apex, www } = apexAndWwwHostnames(domainName);
  const [apexResult, wwwResult] = await Promise.all([
    attachVercelProjectDomain(apex),
    attachVercelProjectDomain(www),
  ]);
  return { apex: apexResult, www: wwwResult };
}

type VercelDomainConfig = {
  recommendedIPv4?: Array<{ rank: number; value: string[] }>;
  recommendedCNAME?: Array<{ rank: number; value: string }>;
  misconfigured?: boolean;
};

export async function fetchVercelDomainConfig(
  hostname: string,
): Promise<VercelDomainConfig | null> {
  const auth = vercelAuth();
  if (!auth) return null;
  const name = hostname.trim().toLowerCase();
  const params = new URLSearchParams();
  params.set("projectIdOrName", auth.projectId);
  if (auth.teamId) params.set("teamId", auth.teamId);
  const url = `https://api.vercel.com/v6/domains/${encodeURIComponent(name)}/config?${params}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` },
      method: "GET",
    });
    if (!res.ok) return null;
    return (await res.json()) as VercelDomainConfig;
  } catch {
    return null;
  }
}

function pickRecommendedIpv4(config: VercelDomainConfig | null): string | null {
  if (!config?.recommendedIPv4?.length) return null;
  const ranked = [...config.recommendedIPv4].sort((a, b) => a.rank - b.rank);
  for (const row of ranked) {
    const ip = row.value?.find((v) => typeof v === "string" && v.trim());
    if (ip) return ip.trim();
  }
  return null;
}

function pickRecommendedCname(config: VercelDomainConfig | null): string | null {
  if (!config?.recommendedCNAME?.length) return null;
  const ranked = [...config.recommendedCNAME].sort((a, b) => a.rank - b.rank);
  for (const row of ranked) {
    if (typeof row.value === "string" && row.value.trim()) {
      return row.value.trim().replace(/\.$/, "");
    }
  }
  return null;
}

/**
 * Resolve apex A + www CNAME targets.
 * Priority: explicit env overrides → Vercel domain config → legacy anycast.
 */
export async function resolveWebsiteHostingDnsTargets(
  domainName: string,
): Promise<WebsiteHostingDnsTargets> {
  const { apex, www } = apexAndWwwHostnames(domainName);
  const envA = process.env.DG_WEBSITE_DNS_A_TARGET?.trim();
  const envCname = process.env.DG_WEBSITE_DNS_CNAME_TARGET?.trim();

  if (envA && envCname) {
    return {
      aTarget: envA,
      cnameTarget: envCname.replace(/\.$/, ""),
      source: "env",
      note: "Using DG_WEBSITE_DNS_* overrides",
      apexHostname: apex,
      wwwHostname: www,
    };
  }

  if (isVercelDomainAttachConfigured()) {
    await attachVercelWebsiteHostnames(apex);
    const [apexConfig, wwwConfig] = await Promise.all([
      fetchVercelDomainConfig(apex),
      fetchVercelDomainConfig(www),
    ]);
    const aFromVercel = pickRecommendedIpv4(apexConfig);
    const cnameFromVercel =
      pickRecommendedCname(wwwConfig) || pickRecommendedCname(apexConfig);

    if (aFromVercel || cnameFromVercel) {
      return {
        aTarget: envA || aFromVercel || LEGACY_VERCEL_A_TARGET,
        cnameTarget: (
          envCname ||
          cnameFromVercel ||
          LEGACY_VERCEL_CNAME_TARGET
        ).replace(/\.$/, ""),
        source: "vercel",
        note:
          aFromVercel && cnameFromVercel
            ? "Using Vercel recommended DNS for this project"
            : "Partial Vercel recommended DNS — filled missing target with legacy/env",
        apexHostname: apex,
        wwwHostname: www,
      };
    }

    return {
      aTarget: envA || LEGACY_VERCEL_A_TARGET,
      cnameTarget: (envCname || LEGACY_VERCEL_CNAME_TARGET).replace(/\.$/, ""),
      source: "legacy",
      note:
        "Vercel configured but domain config returned no recommendations — using legacy targets",
      apexHostname: apex,
      wwwHostname: www,
    };
  }

  return {
    aTarget: envA || LEGACY_VERCEL_A_TARGET,
    cnameTarget: (envCname || LEGACY_VERCEL_CNAME_TARGET).replace(/\.$/, ""),
    source: envA || envCname ? "env" : "legacy",
    note:
      envA || envCname
        ? "Partial env override — remaining target uses legacy"
        : "Legacy Vercel anycast (set VERCEL_TOKEN + VERCEL_PROJECT_ID for project-specific records)",
    apexHostname: apex,
    wwwHostname: www,
  };
}
