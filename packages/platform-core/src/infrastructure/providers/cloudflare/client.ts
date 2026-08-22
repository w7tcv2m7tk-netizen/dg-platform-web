import { InfrastructureNotConfiguredError } from "../../core/types";
import { isCloudflareConfigured, resolveCloudflareConfig } from "./config";

const CF_API = "https://api.cloudflare.com/client/v4";

export class CloudflareApiError extends Error {
  readonly code = "cloudflare_api_error" as const;

  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CloudflareApiError";
  }
}

type CfResult<T> = { success: true; data: T } | { success: false; message: string };

async function cfRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<CfResult<T>> {
  const config = resolveCloudflareConfig();
  if (!config) {
    return { success: false, message: "Cloudflare API token or zone ID not configured." };
  }

  const res = await fetch(`${CF_API}/${path.replace(/^\//, "")}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    result?: T;
    errors?: Array<{ message?: string }>;
  };

  if (!res.ok || json.success === false) {
    const msg =
      json.errors?.[0]?.message ||
      `Cloudflare API error (${res.status})`;
    return { success: false, message: msg };
  }

  return { success: true, data: (json.result ?? json) as T };
}

export type CloudflareZoneStatus = {
  configured: boolean;
  zoneId?: string;
  zoneName?: string;
  plan?: string;
  status?: string;
  message?: string;
};

export async function getCloudflareZoneStatus(): Promise<CloudflareZoneStatus> {
  const config = resolveCloudflareConfig();
  if (!config) {
    return { configured: false, message: "Zone ID and API token not set." };
  }

  const result = await cfRequest<{
    name?: string;
    status?: string;
    plan?: { name?: string };
  }>("GET", `zones/${config.zoneId}`);

  if (!result.success) {
    return {
      configured: true,
      zoneId: config.zoneId,
      message: result.message,
    };
  }

  return {
    configured: true,
    zoneId: config.zoneId,
    zoneName: result.data.name,
    plan: result.data.plan?.name,
    status: result.data.status,
  };
}

export type CloudflareAnalyticsSummary = {
  success: boolean;
  requests?: number;
  bandwidthBytes?: number;
  message?: string;
};

/** Last 7 days requests + bandwidth via Cloudflare GraphQL. */
export async function getCloudflareAnalyticsSummary(): Promise<CloudflareAnalyticsSummary> {
  const config = resolveCloudflareConfig();
  if (!config) {
    return { success: false, message: "Zone ID not set." };
  }

  const query = {
    query: `query {
      viewer {
        zones(filter: { zoneTag: "${config.zoneId}" }) {
          httpRequests1dGroups(limit: 7, orderBy: [date_ASC]) {
            sum { requests bytes }
          }
        }
      }
    }`,
  };

  try {
    const res = await fetch(`${CF_API}/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(20_000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: {
        viewer?: {
          zones?: Array<{
            httpRequests1dGroups?: Array<{ sum?: { requests?: number; bytes?: number } }>;
          }>;
        };
      };
      errors?: Array<{ message?: string }>;
    };

    if (!res.ok || data.errors?.length) {
      return {
        success: false,
        message:
          data.errors?.[0]?.message ||
          "Analytics query failed — ensure token has Analytics read permission.",
      };
    }

    const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
    if (!groups.length) {
      return {
        success: false,
        message:
          "No analytics data returned — ensure token has Analytics read permission.",
      };
    }

    let requests = 0;
    let bandwidthBytes = 0;
    for (const group of groups) {
      requests += Number(group.sum?.requests ?? 0);
      bandwidthBytes += Number(group.sum?.bytes ?? 0);
    }

    return { success: true, requests, bandwidthBytes };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Analytics request failed",
    };
  }
}

export async function purgeCloudflareCache(
  input: { everything?: boolean; urls?: string[] } = { everything: true },
): Promise<{ ok: boolean; message: string }> {
  if (!isCloudflareConfigured()) {
    throw new InfrastructureNotConfiguredError(
      "Cloudflare API token and zone ID are not configured",
    );
  }

  const config = resolveCloudflareConfig()!;
  const urls = (input.urls ?? []).map((u) => u.trim()).filter(Boolean);

  const body =
    urls.length > 0
      ? { files: urls }
      : { purge_everything: true };

  const result = await cfRequest<{ id?: string }>(
    "POST",
    `zones/${config.zoneId}/purge_cache`,
    body,
  );

  if (!result.success) {
    throw new CloudflareApiError(result.message);
  }

  return {
    ok: true,
    message: urls.length
      ? `Purged ${urls.length} URL(s) from Cloudflare cache.`
      : "Cloudflare cache purged (everything).",
  };
}
