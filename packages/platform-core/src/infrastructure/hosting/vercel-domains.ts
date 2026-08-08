/**
 * Optional Vercel project domain attach for custom hostnames.
 * Requires VERCEL_TOKEN + VERCEL_PROJECT_ID (and optional VERCEL_TEAM_ID).
 */

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

export function isVercelDomainAttachConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim(),
  );
}

export async function attachVercelProjectDomain(
  hostname: string,
): Promise<VercelDomainAttachResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const name = hostname.trim().toLowerCase();

  if (!token || !projectId) {
    return {
      ok: false,
      configured: false,
      hostname: name,
      message:
        "Vercel domain attach not configured. Set VERCEL_TOKEN + VERCEL_PROJECT_ID (optional VERCEL_TEAM_ID), or add the domain manually in Vercel → Domains.",
    };
  }

  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${qs}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      // Already exists is OK
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
