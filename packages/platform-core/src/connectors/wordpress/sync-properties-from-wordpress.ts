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
  display_as_contact_agent?: boolean | string | number;
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
  const raw = (status ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
  // Prefer specific AU stages before generic "under contract" / sold.
  if (raw.includes("unconditional")) return "unconditional";
  if (
    raw.includes("contract signed") ||
    raw.includes("contracts exchanged") ||
    raw === "contract" ||
    raw.includes("under contract")
  ) {
    return "contract_signed";
  }
  if (raw.includes("under offer") || raw.includes("under_offer")) return "under_offer";
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

function isWpDisplayAsContactAgent(wp: WpPropertyListing): boolean {
  const flag = wp.display_as_contact_agent;
  if (flag === true || flag === 1 || flag === "1" || flag === "true") return true;
  if (typeof wp.price === "string") {
    const normalized = wp.price.trim().toLowerCase();
    return (
      normalized === "contact agent" ||
      normalized === "contact for price" ||
      normalized === "poa" ||
      normalized === "price on application"
    );
  }
  return false;
}

function normalizeType(value?: string): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

/** Keep last occurrence so newer payload fields win. */
function dedupeByWpId(properties: WpPropertyListing[]): WpPropertyListing[] {
  const byId = new Map<number, WpPropertyListing>();
  for (const wp of properties) {
    if (!Number.isFinite(wp.id)) continue;
    byId.set(wp.id, wp);
  }
  return [...byId.values()];
}

async function findExistingProperty(
  db: Prisma.TransactionClient,
  organisationId: string,
  wp: WpPropertyListing,
) {
  if (wp.dg_property_id?.trim()) {
    const byDg = await db.property.findFirst({
      where: {
        id: wp.dg_property_id.trim(),
        organisationId,
        deletedAt: null,
      },
    });
    if (byDg) return byDg;
  }

  // JSON equality is type-sensitive — match both number and string forms.
  const byWpId = await db.property.findFirst({
    where: {
      organisationId,
      deletedAt: null,
      OR: [
        { externalRefs: { path: ["wp_property_id"], equals: wp.id } },
        { externalRefs: { path: ["wp_property_id"], equals: String(wp.id) } },
      ],
    },
  });
  if (byWpId) return byWpId;

  if (wp.external_id?.trim() && wp.external_id !== String(wp.id)) {
    const byExternal = await db.property.findFirst({
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
    const where: Prisma.PropertyWhereInput = {
      organisationId,
      deletedAt: null,
      addressLine1: { equals: address, mode: "insensitive" },
      suburb: { equals: suburb, mode: "insensitive" },
    };
    const postcode = wp.postcode?.trim();
    if (postcode) where.postcode = postcode;
    return db.property.findFirst({ where });
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

  const properties = dedupeByWpId(input.properties);

  for (const wp of properties) {
    try {
      const address = wp.address?.trim() || wp.title?.split(",")[0]?.trim() || "";
      const suburb = wp.suburb?.trim() || "Unknown";
      if (!address) {
        result.skipped += 1;
        continue;
      }

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
        display_as_contact_agent: isWpDisplayAsContactAgent(wp),
        wp_agent: wp.agent ?? undefined,
        wp_synced_at: new Date().toISOString(),
      };

      const externalRefs = {
        wp_property_id: wp.id,
        wp_property_permalink: wp.permalink,
        wp_external_id: wp.external_id || undefined,
        wp_property_synced_at: new Date().toISOString(),
      };

      // Serialize create/update per WP listing so concurrent syncs (Properties +
      // Listings page auto-sync) cannot insert two rows for the same wp_property_id.
      const outcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${`${input.organisationId}:wp-property:${wp.id}`})
          )
        `;

        const existing = await findExistingProperty(tx, input.organisationId, wp);

        if (existing) {
          const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
          const prevMarketing =
            (prevMeta.marketing as Record<string, unknown> | undefined) ?? {};
          const prevRefs = (existing.externalRefs as Record<string, unknown> | null) ?? {};

          await tx.property.update({
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
                images: images.length ? images : prevMeta.images,
              } as InputJsonValue,
              externalRefs: { ...prevRefs, ...externalRefs } as InputJsonValue,
            },
          });
          return "updated" as const;
        }

        const created = await tx.property.create({
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

        await tx.activity.create({
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

        return "created" as const;
      });

      if (outcome === "created") result.created += 1;
      else result.updated += 1;
    } catch (err) {
      result.errors.push(
        `WP #${wp.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  if (result.created + result.updated > 0) {
    const { syncAllPropertiesToGen2Website } = await import("../../properties/sync-to-gen2-website");
    await syncAllPropertiesToGen2Website({
      organisationId: input.organisationId,
      actorId: input.actorId,
    }).catch(() => null);
  }

  return result;
}
