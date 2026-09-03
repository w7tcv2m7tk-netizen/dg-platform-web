import { resolveOrgWordPressConnector } from "../connectors/wordpress/org-connector";
import {
  upsertAccommodationUnitFromWpRow,
  type SyncAccommodationUnitsOutcome,
  type SyncAccommodationUnitsResult,
  type WpAccUnitPropRow,
} from "./units";

/**
 * Explicit legacy WordPress → Gen 2 accommodation-unit migration boundary.
 * Native accommodation runtime code must not import this module.
 */
async function fetchWpUnitsViaConnector(
  organisationId: string,
): Promise<
  | { ok: true; units: WpAccUnitPropRow[] }
  | { ok: false; reason: string; message: string }
> {
  const connector = await resolveOrgWordPressConnector(organisationId);
  if (!connector.baseUrl) {
    return { ok: false, reason: "no_connector", message: "WordPress connector not configured" };
  }

  try {
    const host = new URL(
      connector.baseUrl.includes("://") ? connector.baseUrl : `https://${connector.baseUrl}`,
    ).hostname.replace(/^www\./i, "");
    if (
      /currumbinvalleyhideaway\.com\.au$/i.test(host) ||
      /roerealty\.com\.au$/i.test(host) ||
      /^digitalgate\.com\.au$/i.test(host) ||
      /aetherra\.com\.au$/i.test(host)
    ) {
      return {
        ok: false,
        reason: "gen2_apex",
        message:
          "WordPress unit import is unavailable on the public Gen 2 site. Units already in Neon remain the source of truth.",
      };
    }
  } catch {
    /* continue to fetch attempt */
  }

  const apiKey = connector.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_key", message: "WordPress API key missing" };
  }

  const url = `${connector.baseUrl.replace(/\/$/, "")}/accommodation/properties`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: "fetch_failed",
      message: `WordPress units fetch failed (${res.status})`,
    };
  }

  const json = (await res.json()) as { properties?: WpAccUnitPropRow[] };
  return { ok: true, units: json.properties ?? [] };
}

export async function syncAccommodationUnitsFromWordPress(
  organisationId: string,
): Promise<SyncAccommodationUnitsOutcome> {
  const fetched = await fetchWpUnitsViaConnector(organisationId);
  if (!fetched.ok) {
    return { ok: false, reason: fetched.reason, message: fetched.message };
  }

  const result: SyncAccommodationUnitsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const unit of fetched.units) {
    try {
      const outcome = await upsertAccommodationUnitFromWpRow(organisationId, unit);
      if (outcome === "created") result.created++;
      else if (outcome === "updated") result.updated++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(
        `Unit #${unit.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return { ok: true, result };
}
