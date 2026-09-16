import {
  discoverOrgGoogleGbpLocations,
  getOrgGbpSyncSnapshot,
  setOrgGoogleGbpSelectedLocations,
  syncOrgGoogleGbp,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET — live discoverable resources plus the organisation's active GBP cache. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const [snapshot, discovery] = await Promise.all([
    getOrgGbpSyncSnapshot(session.organisationId),
    discoverOrgGoogleGbpLocations(session.organisationId),
  ]);
  if (!snapshot || !discovery) {
    return NextResponse.json(
      { error: { code: "not_connected", message: "Google Business Profile is not connected for this organisation" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      health: snapshot.health,
      accounts: discovery.accounts,
      availableLocations: discovery.locations,
      selectedLocationNames: discovery.selectedLocationNames,
      locations: snapshot.locations,
      reviewsCached: snapshot.reviews.length,
      reviewsAvailable: snapshot.health.reviewsAvailable ?? false,
      reviewsBlockedReason: snapshot.health.reviewsBlockedReason ?? null,
      discoveryErrors: discovery.errors,
    },
  });
}

/** PUT — assign GBP resources to this organisation, validate them live, then rebuild its cache. */
export async function PUT(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({})) as { locationNames?: unknown };
  if (!Array.isArray(body.locationNames) || body.locationNames.some((value) => typeof value !== "string")) {
    return NextResponse.json(
      { error: { code: "invalid_locations", message: "locationNames must be an array of Business Profile location names" } },
      { status: 400 },
    );
  }

  const discovery = await discoverOrgGoogleGbpLocations(session.organisationId);
  if (!discovery) {
    return NextResponse.json(
      { error: { code: "not_connected", message: "Google Business Profile is not connected for this organisation" } },
      { status: 404 },
    );
  }

  const requested = [...new Set((body.locationNames as string[]).map((name) => name.trim()).filter(Boolean))];
  const available = new Set(discovery.locations.map((location) => location.name));
  const invalid = requested.filter((name) => !available.has(name));
  if (invalid.length) {
    return NextResponse.json(
      { error: { code: "location_not_available", message: "One or more Business Profile locations are not available to this Google connection", locations: invalid } },
      { status: 400 },
    );
  }

  try {
    await setOrgGoogleGbpSelectedLocations(session.organisationId, requested);
  } catch (error) {
    return NextResponse.json(
      { error: { code: "selection_failed", message: error instanceof Error ? error.message : "Could not save Business Profile locations" } },
      { status: 400 },
    );
  }

  const synced = await syncOrgGoogleGbp(session.organisationId);
  return NextResponse.json({ data: { selectedLocationNames: requested, sync: synced } });
}
