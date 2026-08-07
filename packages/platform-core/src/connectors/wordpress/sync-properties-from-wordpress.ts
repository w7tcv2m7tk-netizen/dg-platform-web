import type { Prisma } from "@dg/database";

export type WpPropertyListing = {
  id: number;
  dg_property_id?: string;
  title?: string;
  permalink?: string;
  post_status?: string;
  status?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  price?: string | number;
  property_type?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  car_spaces?: string | number;
  land_size?: string;
  building_size?: string;
  features?: string;
  description?: string;
  inspection_times?: string;
  external_id?: string;
  images?: string[];
  featured_image?: string | null;
  agent?: {
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
  };
  modified_at?: string;
};

export type SyncPropertiesFromWordPressInput = {
  organisationId: string;
  actorId?: string;
  properties: WpPropertyListing[];
};

export type SyncPropertiesFromWordPressResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function mapWpStatus(status?: string): string {
  const raw = (status ?? "").toLowerCase();
  if (raw.includes("under contract") || raw.includes("under_offer")) return "under_offer";
  if (raw.includes("sold")) return "sold";
  if (raw.includes("withdrawn")) return "withdrawn";
  if (raw.includes("for sale") || raw.includes("listed")) return "listed";
  if (raw.includes("draft") || raw.includes("appraisal")) return "appraisal";
  return "listed";
}

function toInt(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

function toPriceCents(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

function normalizeType(value?: string): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

async function findExistingProperty(
  organisationId: string,
  wp: WpPropertyListing,
) {
  const { prisma } = await import("@dg/database");

  if (wp.dg_property_id?.trim()) {
    const byDg = await prisma.property.findFirst({
      where: {
        id: wp.dg_property_id.trim(),
        organisationId,
        deletedAt: null,
      },
    });
    if (byDg) return byDg;
  }

  const byWpId = await prisma.property.findFirst({
    where: {
      organisationId,
      deletedAt: null,
      externalRefs: {
        path: ["wp_property_id"],
        equals: wp.id,
      },
    },
  });
  if (byWpId) return byWpId;

  if (wp.external_id?.trim() && wp.external_id !== String(wp.id)) {
    const byExternal = await prisma.property.findFirst({
      where: {
        organisationId,
        deletedAt: null,
        OR: [
          {
            externalRefs: {
              path: ["rea_id"],
              equals: wp.external_id.trim(),
            },
          },
          {
            externalRefs: {
              path: ["wp_external_id"],
              equals: wp.external_id.trim(),
            },
          },
        ],
      },
    });
    if (byExternal) return byExternal;
  }

  const address = wp.address?.trim();
  const suburb = wp.suburb?.trim();
  if (address && suburb) {
    return prisma.property.findFirst({
      where: {
        organisationId,
        deletedAt: null,
        addressLine1: address,
        suburb,
        postcode: wp.postcode?.trim() || undefined,
      },
    });
  }

  return null;
}

export async function syncPropertiesFromWordPress(
  input: SyncPropertiesFromWordPressInput,
): Promise<SyncPropertiesFromWordPressResult> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = Prisma.InputJsonValue;

  const result: SyncPropertiesFromWordPressResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const wp of input.properties) {
    try {
      const address = wp.address?.trim() || wp.title?.split(",")[0]?.trim() || "";
      const suburb = wp.suburb?.trim() || "Unknown";
      if (!address) {
        result.skipped += 1;
        continue;
      }

      const existing = await findExistingProperty(input.organisationId, wp);
      const images = Array.isArray(wp.images)
        ? wp.images.filter((u) => typeof u === "string" && u.startsWith("http"))
        : [];
      const marketing = {
        headline: wp.title?.trim() || undefined,
        description: wp.description?.trim() || undefined,
        features: wp.features?.trim() || undefined,
        portal_url: wp.permalink || undefined,
      };

      const metadataBase = {
        marketing,
        images,
        featured_image: wp.featured_image || images[0] || undefined,
        car_spaces: toInt(wp.car_spaces),
        land_size: wp.land_size?.trim() || undefined,
        building_size: wp.building_size?.trim() || undefined,
        inspection_times: wp.inspection_times?.trim() || undefined,
        wp_agent: wp.agent ?? undefined,
        wp_synced_at: new Date().toISOString(),
      };

      const externalRefs = {
        wp_property_id: wp.id,
        wp_property_permalink: wp.permalink,
        wp_external_id: wp.external_id || undefined,
        wp_property_synced_at: new Date().toISOString(),
      };

      if (existing) {
        const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
        const prevMarketing =
          (prevMeta.marketing as Record<string, unknown> | undefined) ?? {};
        const prevRefs = (existing.externalRefs as Record<string, unknown> | null) ?? {};

        await prisma.property.update({
          where: { id: existing.id },
          data: {
            addressLine1: address,
            suburb,
            state: (wp.state?.trim() || existing.state || "QLD").toUpperCase(),
            postcode: wp.postcode?.trim() || existing.postcode || "0000",
            status: mapWpStatus(wp.status),
            propertyType: normalizeType(wp.property_type) ?? existing.propertyType,
            bedrooms: toInt(wp.bedrooms) ?? existing.bedrooms,
            bathrooms: toInt(wp.bathrooms) ?? existing.bathrooms,
            listingPriceCents: toPriceCents(wp.price) ?? existing.listingPriceCents,
            metadata: {
              ...prevMeta,
              ...metadataBase,
              marketing: { ...prevMarketing, ...marketing },
              // Prefer newer WP gallery when present
              images: images.length ? images : prevMeta.images,
            } as InputJsonValue,
            externalRefs: { ...prevRefs, ...externalRefs } as InputJsonValue,
          },
        });

        // Back-link dg id on WP if missing — handled on next publish
        if (!existing.externalRefs || !(existing.externalRefs as Record<string, unknown>).wp_property_id) {
          /* refs just set */
        }

        // Ensure WP knows our id for future upserts
        if (!wp.dg_property_id) {
          /* optional reverse link on next publish */
        }

        result.updated += 1;
      } else {
        const created = await prisma.property.create({
          data: {
            organisationId: input.organisationId,
            addressLine1: address,
            suburb,
            state: (wp.state?.trim() || "QLD").toUpperCase(),
            postcode: wp.postcode?.trim() || "0000",
            country: "AU",
            status: mapWpStatus(wp.status),
            propertyType: normalizeType(wp.property_type),
            bedrooms: toInt(wp.bedrooms),
            bathrooms: toInt(wp.bathrooms),
            listingPriceCents: toPriceCents(wp.price),
            currency: "AUD",
            metadata: metadataBase as InputJsonValue,
            externalRefs: externalRefs as InputJsonValue,
          },
        });

        await prisma.activity.create({
          data: {
            organisationId: input.organisationId,
            entityType: "Property",
            entityId: created.id,
            activityType: "wordpress_import",
            title: "Imported from website",
            body: wp.permalink ?? `WP #${wp.id}`,
            sourceApp: "real-estate",
            createdBy: input.actorId,
          },
        });

        result.created += 1;
      }
    } catch (err) {
      result.errors.push(
        `WP #${wp.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}
