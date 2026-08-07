import { resolveOrgWordPressConnector } from "./org-connector";

export type PublishPropertyInput = {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Force publish even for prospect/appraisal (creates WP draft). */
  force?: boolean;
};

export type PublishPropertyResult =
  | {
      ok: true;
      created: boolean;
      wpPropertyId: number;
      permalink?: string;
      postStatus?: string;
    }
  | {
      ok: false;
      reason: "missing_key" | "not_found" | "skipped_status" | "upstream_error" | "network_error";
      message: string;
    };

const AUTO_PUBLISH_STATUSES = new Set(["listed", "under_offer", "sold", "withdrawn"]);

function capitalizeType(value?: string | null): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export async function publishPropertyToWordPress(
  input: PublishPropertyInput,
): Promise<PublishPropertyResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "not_found", message: "Database not configured" };
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const property = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });

  if (!property) {
    return { ok: false, reason: "not_found", message: "Property not found" };
  }

  if (!input.force && !AUTO_PUBLISH_STATUSES.has(property.status)) {
    return {
      ok: false,
      reason: "skipped_status",
      message: `Status "${property.status}" is not auto-published. Set to Listed to publish, or force publish.`,
    };
  }

  const connector = await resolveOrgWordPressConnector(input.organisationId);
  if (!connector.apiKey?.trim()) {
    return {
      ok: false,
      reason: "missing_key",
      message: "WordPress API key not configured for this organisation",
    };
  }

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const marketing = (metadata.marketing as Record<string, unknown> | undefined) ?? {};
  const title =
    (typeof marketing.headline === "string" && marketing.headline.trim()) ||
    `${property.addressLine1}, ${property.suburb}`;
  const description =
    (typeof marketing.description === "string" && marketing.description) ||
    (typeof marketing.campaign === "string" && marketing.campaign) ||
    "";
  const features =
    typeof marketing.features === "string"
      ? marketing.features
      : Array.isArray(marketing.features)
        ? marketing.features.map(String).join("\n")
        : "";

  const images = Array.isArray(metadata.images)
    ? (metadata.images as unknown[]).filter(
        (u): u is string => typeof u === "string" && u.startsWith("http"),
      )
    : [];

  let agent:
    | { name?: string; phone?: string; email?: string; wp_agent_id?: number }
    | undefined;
  if (input.actorId) {
    const { getMembershipByClerkUser } = await import("../../org/membership-profile");
    const { publishMembershipToWordPressAgent } = await import("./sync-agent-publish");
    const membership = await getMembershipByClerkUser(
      input.organisationId,
      input.actorId,
    );
    if (membership) {
      const { membershipCardEmail } = await import("../../org/membership-profile");
      const cardEmail = membershipCardEmail(membership);
      const agentSync = await publishMembershipToWordPressAgent({
        organisationId: input.organisationId,
        membership,
      });
      agent = {
        name: membership.displayName ?? cardEmail ?? undefined,
        phone: membership.phone ?? undefined,
        email: cardEmail ?? undefined,
        wp_agent_id: agentSync.ok ? agentSync.wpAgentId : undefined,
      };
    }
  }

  const payload = {
    dg_property_id: property.id,
    status: property.status,
    title,
    description,
    features,
    address: property.addressLine1,
    address_line1: property.addressLine1,
    suburb: property.suburb,
    state: property.state,
    postcode: property.postcode,
    property_type: capitalizeType(property.propertyType),
    bedrooms: property.bedrooms ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    car_spaces:
      typeof metadata.car_spaces === "number"
        ? metadata.car_spaces
        : typeof metadata.carSpaces === "number"
          ? metadata.carSpaces
          : undefined,
    land_size: typeof metadata.land_size === "string" ? metadata.land_size : undefined,
    building_size:
      typeof metadata.building_size === "string" ? metadata.building_size : undefined,
    listing_price_cents: property.listingPriceCents ?? undefined,
    price: property.listingPriceCents != null ? property.listingPriceCents / 100 : undefined,
    external_id:
      typeof (property.externalRefs as Record<string, unknown> | null)?.rea_id === "string"
        ? ((property.externalRefs as Record<string, unknown>).rea_id as string)
        : property.id,
    agent,
    agent_id: agent?.wp_agent_id,
    images,
    gallery_urls: images,
    inspection_times:
      typeof metadata.inspection_times === "string" && metadata.inspection_times.trim()
        ? metadata.inspection_times.trim()
        : undefined,
  };

  try {
    const res = await fetch(`${connector.baseUrl}/properties`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": connector.apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      created?: boolean;
      message?: string;
      property?: {
        id?: number;
        permalink?: string;
        post_status?: string;
      };
    } | null;

    if (!res.ok || !data?.property?.id) {
      return {
        ok: false,
        reason: res.status === 404 ? "upstream_error" : "upstream_error",
        message:
          data?.message ??
          (res.status === 404
            ? "WordPress properties endpoint not found — deploy the latest DG Platform plugin."
            : `WordPress returned HTTP ${res.status}`),
      };
    }

    const refs = {
      ...((property.externalRefs as Record<string, unknown> | null) ?? {}),
      wp_property_id: data.property.id,
      wp_property_permalink: data.property.permalink,
      wp_property_synced_at: new Date().toISOString(),
      wp_property_source: connector.label,
    };

    await prisma.property.update({
      where: { id: property.id },
      data: { externalRefs: refs as InputJsonValue },
    });

    await prisma.activity.create({
      data: {
        organisationId: input.organisationId,
        entityType: "Property",
        entityId: property.id,
        activityType: "wordpress_publish",
        title: data.created ? "Published to website" : "Updated on website",
        body: data.property.permalink ?? `WP #${data.property.id}`,
        sourceApp: "real-estate",
        createdBy: input.actorId,
        metadata: {
          wp_property_id: data.property.id,
          permalink: data.property.permalink,
          created: Boolean(data.created),
        } as InputJsonValue,
      },
    });

    return {
      ok: true,
      created: Boolean(data.created),
      wpPropertyId: data.property.id,
      permalink: data.property.permalink,
      postStatus: data.property.post_status,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "network_error",
      message: err instanceof Error ? err.message : "Could not reach WordPress",
    };
  }
}

/** Auto-publish when status moves to a live listing state. */
export async function maybeAutoPublishPropertyToWordPress(input: {
  organisationId: string;
  propertyId: string;
  status: string;
  actorId?: string;
}): Promise<PublishPropertyResult | null> {
  if (!AUTO_PUBLISH_STATUSES.has(input.status)) return null;
  return publishPropertyToWordPress({
    organisationId: input.organisationId,
    propertyId: input.propertyId,
    actorId: input.actorId,
  });
}
