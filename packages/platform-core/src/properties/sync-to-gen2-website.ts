import type { Prisma, Property } from "@dg/database";

import { storeOrgFile } from "../assets/org-brand-storage";
import { WEBSITE_PUBLISH_STATUSES } from "./statuses";

type PropertyRow = Property;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/-]/g, "")
    .replace(/[/\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function defaultPropertyPageSlug(property: {
  addressLine1: string;
  suburb: string;
}): string {
  return `property/${slugPart(`${property.addressLine1}-${property.suburb}`)}`;
}

function formatPrice(property: PropertyRow, meta: Record<string, unknown>): string {
  if (meta.display_as_contact_agent === true) return "Contact Agent";
  const cents = property.listingPriceCents;
  if (cents == null) return "Contact Agent";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: property.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function statusLabel(status: string): string {
  if (status === "sold") return "Sold";
  if (status === "under_offer" || status === "contract_signed") return "Under Offer";
  if (status === "listed") return "For Sale";
  if (status === "withdrawn") return "Withdrawn";
  return status.replace(/_/g, " ");
}

function featuresToList(features: unknown): string[] {
  if (typeof features === "string") {
    return features
      .split(/\r?\n|\u2022|\*/)
      .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(features)) return features.map(String).map((s) => s.trim()).filter(Boolean);
  return [];
}

function isEphemeralImageUrl(url: string): boolean {
  return /images-uat\.corelogic\.asia|signature=|corelogic\.asia\/.*\?/i.test(url);
}

/**
 * Copy remote listing photos into durable org Blob storage when they look ephemeral
 * (signed Cotality/UAT URLs). Already-blob / stable URLs are left alone.
 */
export async function persistPropertyListingImages(
  organisationId: string,
  propertyId: string,
  images: string[],
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < images.length; i += 1) {
    const src = String(images[i] || "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);

    if (!isEphemeralImageUrl(src) && /blob\.vercel-storage\.com|\/org-assets\//i.test(src)) {
      out.push(src);
      continue;
    }

    try {
      const res = await fetch(src, {
        redirect: "follow",
        headers: { Accept: "image/*,*/*" },
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) continue;
      const stored = await storeOrgFile({
        organisationId,
        buffer,
        contentType,
        maxBytes: 8 * 1024 * 1024,
        sizeLabel: "Listing image",
        keyPrefix: `listing-images/${propertyId}`,
      });
      out.push(stored.url);
    } catch {
      // Keep original if mirror fails — better than dropping the gallery entirely.
      if (!isEphemeralImageUrl(src)) out.push(src);
    }
  }

  return out;
}

function buildDetailHtml(property: PropertyRow, pageSlug: string): string {
  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  const marketing = (meta.marketing as Record<string, unknown> | undefined) ?? {};
  const images = (Array.isArray(meta.images) ? meta.images : [])
    .map(String)
    .filter((u) => u.startsWith("http"));
  const hero = images[0] || (typeof meta.featured_image === "string" ? meta.featured_image : "");
  const title =
    (typeof marketing.headline === "string" && marketing.headline.trim()) ||
    `${property.addressLine1}, ${property.suburb}`;
  const address = [
    property.addressLine1,
    property.addressLine2,
    property.suburb,
    property.state,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  const description =
    (typeof marketing.description === "string" && marketing.description.trim()) ||
    `This ${statusLabel(property.status).toLowerCase()} listing is managed by Roe Realty. Enquire for comparable sales, appraisal advice, or buyer representation in this area.`;
  const features = featuresToList(marketing.features);
  const beds = property.bedrooms;
  const baths = property.bathrooms;
  const cars = typeof meta.car_spaces === "number" ? meta.car_spaces : null;
  const land = typeof meta.land_size === "string" ? meta.land_size : null;
  const building = typeof meta.building_size === "string" ? meta.building_size : null;
  const specs = [
    beds != null ? `${beds} bed` : null,
    baths != null ? `${baths} bath` : null,
    cars != null ? `${cars} car` : null,
    land ? `Land ${land}` : null,
    building ? `Building ${building}` : null,
    property.propertyType || null,
  ].filter(Boolean);

  const gallery =
    images.length > 1
      ? `<div class="gallery-grid roe-prop-gallery" role="list">${images
          .map(
            (src, i) =>
              `<button type="button" class="gallery-item" role="listitem" aria-label="Photo ${i + 1}"><img src="${esc(src)}" alt="${esc(title)} — photo ${i + 1}" loading="${i < 2 ? "eager" : "lazy"}" /></button>`,
          )
          .join("")}</div>`
      : "";

  const featureHtml = features.length
    ? `<ul class="roe-prop-features">${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`
    : "";

  return `<style>
.wb-html-island--page{color:#1C2B2A}
.roe-prop-detail{background:#F5F2EF;color:#1C2B2A;min-height:70vh}
.roe-prop-hero{position:relative;min-height:52vh;background:#1a2e2b}
.roe-prop-hero img{width:100%;height:52vh;object-fit:cover;display:block}
.roe-prop-badge{position:absolute;top:1.25rem;left:1.25rem;background:#C62828;color:#fff;padding:.35rem .75rem;border-radius:999px;font-size:.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.roe-prop-body{max-width:920px;margin:0 auto;padding:2.5rem 1.25rem 3.5rem}
.roe-prop-body h1{font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.15;margin:0 0 .5rem;color:#14201f}
.roe-prop-address{color:#3f4a48;margin:0 0 1rem}
.roe-prop-price{font-size:1.35rem;font-weight:700;color:#6b5428;margin:0 0 1rem}
.roe-prop-specs{display:flex;gap:1rem;flex-wrap:wrap;color:#243533;margin:0 0 1.75rem}
.roe-prop-desc{color:#2f2f2f;line-height:1.7;margin:0 0 1.75rem;white-space:pre-wrap}
.roe-prop-features{margin:0 0 2rem;padding-left:1.1rem;color:#243533;line-height:1.55}
.roe-prop-features li{margin:.35rem 0}
.roe-prop-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.65rem;margin:0 0 2rem}
.roe-prop-gallery .gallery-item{border:0;padding:0;background:transparent;cursor:zoom-in;border-radius:.45rem;overflow:hidden}
.roe-prop-gallery img{width:100%;height:140px;object-fit:cover;display:block}
.roe-prop-actions{display:flex;gap:1rem;flex-wrap:wrap}
.roe-prop-actions a{display:inline-flex;align-items:center;padding:.7rem 1.1rem;border-radius:999px;text-decoration:none;font-weight:700;font-size:.85rem}
.roe-prop-actions .primary{background:#C9A46C;color:#f8fafc}
.roe-prop-actions .ghost{border:1px solid #c9b8a4;color:#1c2b2a;background:#fff}
</style>
<div class="wb-html-island wb-html-island--page wb-html-island--light"><div class="roe-prop-detail">
  <div class="roe-prop-hero">
    ${hero ? `<img src="${esc(hero)}" alt="${esc(title)}" />` : ""}
    <span class="roe-prop-badge">${esc(statusLabel(property.status))}</span>
  </div>
  <div class="roe-prop-body">
    <h1>${esc(title)}</h1>
    <p class="roe-prop-address">${esc(address)}</p>
    <p class="roe-prop-price">${esc(formatPrice(property, meta))}</p>
    ${specs.length ? `<div class="roe-prop-specs"><span>${esc(specs.join(" · "))}</span></div>` : ""}
    <p class="roe-prop-desc">${esc(description)}</p>
    ${featureHtml}
    ${gallery}
    <div class="roe-prop-actions">
      <a class="primary" href="/property-report">Get Property Report</a>
      <a class="ghost" href="/contact">Contact Roe Realty</a>
      <a class="ghost" href="/property">Back to properties</a>
    </div>
  </div>
</div></div>`;
}

function buildCardHtml(property: PropertyRow, pageSlug: string): string {
  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  const marketing = (meta.marketing as Record<string, unknown> | undefined) ?? {};
  const images = (Array.isArray(meta.images) ? meta.images : []).map(String);
  const hero =
    images[0] ||
    (typeof meta.featured_image === "string" ? meta.featured_image : "") ||
    "";
  const title =
    (typeof marketing.headline === "string" && marketing.headline.trim()) ||
    `${property.addressLine1}, ${property.suburb}`;
  const beds = property.bedrooms;
  const baths = property.bathrooms;
  const cars = typeof meta.car_spaces === "number" ? meta.car_spaces : null;
  const specs = [
    beds != null ? `${beds} bed` : null,
    baths != null ? `${baths} bath` : null,
    cars != null ? `${cars} car` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<article class="roe-property-card">
  <a class="card-link" href="/${esc(pageSlug)}">
    <div class="card-image">${hero ? `<img src="${esc(hero)}" alt="${esc(title)}" loading="lazy" />` : ""}<span class="card-status">${esc(statusLabel(property.status))}</span></div>
    <div class="card-content">
      <h3 class="card-title">${esc(title)}</h3>
      <p class="card-address">${esc(property.addressLine1)}, ${esc(property.suburb)}</p>
      <p class="card-price">${esc(formatPrice(property, meta))}</p>
      ${specs ? `<p class="card-specs">${esc(specs)}</p>` : ""}
    </div>
  </a>
</article>`;
}

function replacePropertyGrid(html: string, cardsHtml: string): string {
  const open = html.search(/<div class="roe-property-grid"/i);
  if (open >= 0) {
    const openTagEnd = html.indexOf(">", open);
    let i = openTagEnd + 1;
    let depth = 1;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
      } else {
        depth -= 1;
        i = nextClose + 6;
      }
    }
    return `${html.slice(0, open)}<div class="roe-property-grid">${cardsHtml}</div>${html.slice(i)}`;
  }
  if (/<\/main>/i.test(html)) {
    return html.replace(/<\/main>/i, `<div class="roe-property-grid">${cardsHtml}</div></main>`);
  }
  return `${html}\n<div class="roe-property-grid">${cardsHtml}</div>`;
}

async function resolveWebsiteId(organisationId: string): Promise<string | null> {
  const { prisma } = await import("@dg/database");
  const published = await prisma.website.findFirst({
    where: { organisationId, status: "published" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (published) return published.id;
  const draft = await prisma.website.findFirst({
    where: { organisationId, status: "draft" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return draft?.id ?? null;
}

function pickExistingSlug(
  property: PropertyRow,
  pages: Array<{ slug: string; title: string }>,
): string | null {
  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  if (typeof meta.gen2_website_slug === "string" && meta.gen2_website_slug.trim()) {
    return meta.gen2_website_slug.trim().replace(/^\/+/, "");
  }
  const wanted = defaultPropertyPageSlug(property);
  if (pages.some((p) => p.slug === wanted)) return wanted;

  const addrKey = slugPart(property.addressLine1);
  const suburbKey = slugPart(property.suburb);
  const match = pages.find((p) => {
    if (!p.slug.startsWith("property/")) return false;
    const leaf = p.slug.slice("property/".length);
    return leaf.includes(addrKey) || (addrKey && leaf.includes(addrKey.split("-")[0]));
  });
  if (match) return match.slug;

  const byTitle = pages.find((p) =>
    p.title?.toLowerCase().includes(property.addressLine1.toLowerCase()),
  );
  if (byTitle?.slug.startsWith("property/")) return byTitle.slug;

  // Avoid collision with suburb-only mismatches
  if (suburbKey && pages.some((p) => p.slug.includes(suburbKey) && p.slug.includes(addrKey))) {
    return pages.find((p) => p.slug.includes(suburbKey) && p.slug.includes(addrKey))!.slug;
  }
  return null;
}

export type SyncPropertyToGen2WebsiteResult =
  | {
      ok: true;
      websiteId: string;
      pageSlug: string;
      imageCount: number;
      mirrored: number;
    }
  | { ok: false; reason: "no_website" | "hidden" | "skipped_status" | "error"; message: string };

/**
 * Persist durable listing images and push this property onto the org Gen 2 website
 * (detail page + /property grid). WordPress sync remains separate.
 */
export async function syncPropertyToGen2Website(input: {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Force sync even for non-publish statuses */
  force?: boolean;
}): Promise<SyncPropertyToGen2WebsiteResult> {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!property) {
    return { ok: false, reason: "error", message: "Property not found" };
  }

  const meta = { ...((property.metadata as Record<string, unknown> | null) ?? {}) };
  if (meta.website_hidden === true && !input.force) {
    return {
      ok: false,
      reason: "hidden",
      message: "Listing is hidden from the website",
    };
  }
  if (!input.force && !WEBSITE_PUBLISH_STATUSES.has(property.status)) {
    return {
      ok: false,
      reason: "skipped_status",
      message: `Status "${property.status}" is not published to the website`,
    };
  }

  const websiteId = await resolveWebsiteId(input.organisationId);
  if (!websiteId) {
    return { ok: false, reason: "no_website", message: "No Gen 2 website for organisation" };
  }

  const rawImages = (Array.isArray(meta.images) ? meta.images : [])
    .map(String)
    .filter((u) => u.startsWith("http"));
  const beforeEphemeral = rawImages.filter(isEphemeralImageUrl).length;
  const durableImages = await persistPropertyListingImages(
    input.organisationId,
    property.id,
    rawImages,
  );
  if (durableImages.length) {
    meta.images = durableImages;
    meta.featured_image = durableImages[0];
    meta.listing_images_mirrored_at = new Date().toISOString();
  }

  const pages = await prisma.websitePage.findMany({
    where: { websiteId },
    select: { id: true, slug: true, title: true, components: true, seo: true, status: true },
  });

  const pageSlug =
    pickExistingSlug(property, pages) || defaultPropertyPageSlug(property);
  meta.gen2_website_slug = pageSlug;

  await prisma.property.update({
    where: { id: property.id },
    data: { metadata: meta as Prisma.InputJsonValue },
  });

  const refreshed = {
    ...property,
    metadata: meta,
  } as PropertyRow;

  const detailHtml = buildDetailHtml(refreshed, pageSlug);
  const title =
    (((meta.marketing as Record<string, unknown> | undefined)?.headline as string) ||
      `${property.addressLine1}, ${property.suburb}`).trim();
  const seo = {
    title: `${title} | Roe Realty`,
    description: `${title} — ${statusLabel(property.status)} with Roe Realty. View photos, specs and enquire today.`,
    keywords: [title.toLowerCase(), "roe realty", property.suburb.toLowerCase()],
    ogTitle: `${title} | Roe Realty`,
    ogDescription: `${title} — ${statusLabel(property.status)} with Roe Realty.`,
    ...(durableImages[0] ? { ogImage: durableImages[0] } : {}),
  };

  const existingDetail = pages.find((p) => p.slug === pageSlug);
  const detailComponents = [
    {
      id: existingDetail
        ? ((existingDetail.components as Array<{ id?: string }>)?.[0]?.id ??
          `html-${pageSlug}`)
        : `html-${pageSlug}`,
      type: "html",
      props: { html: detailHtml },
    },
  ];

  if (existingDetail) {
    await prisma.websitePage.update({
      where: { id: existingDetail.id },
      data: {
        title,
        status: "published",
        seo: seo as Prisma.InputJsonValue,
        components: detailComponents as Prisma.InputJsonValue,
      },
    });
  } else {
    const maxSort = await prisma.websitePage.aggregate({
      where: { websiteId },
      _max: { sortOrder: true },
    });
    await prisma.websitePage.create({
      data: {
        websiteId,
        title,
        slug: pageSlug,
        intent: "custom",
        status: "published",
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        seo: seo as Prisma.InputJsonValue,
        components: detailComponents as Prisma.InputJsonValue,
      },
    });
  }

  // Refresh listing grid (/property)
  const listingPage = pages.find((p) => p.slug === "property");
  if (listingPage) {
    const visible = await prisma.property.findMany({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        status: { in: [...WEBSITE_PUBLISH_STATUSES] },
      },
      orderBy: { updatedAt: "desc" },
    });
    const cards = visible
      .filter((p) => {
        const m = (p.metadata as Record<string, unknown> | null) ?? {};
        return m.website_hidden !== true;
      })
      .map((p) => {
        const m = (p.metadata as Record<string, unknown> | null) ?? {};
        const slug =
          (typeof m.gen2_website_slug === "string" && m.gen2_website_slug) ||
          pickExistingSlug(p, pages) ||
          defaultPropertyPageSlug(p);
        return buildCardHtml(p, slug);
      })
      .join("\n");

    const components = Array.isArray(listingPage.components)
      ? [...(listingPage.components as Array<Record<string, unknown>>)]
      : [];
    const htmlIdx = components.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0) {
      const props = { ...((components[htmlIdx].props as Record<string, unknown>) || {}) };
      const prevHtml = typeof props.html === "string" ? props.html : "";
      props.html = replacePropertyGrid(prevHtml, cards);
      components[htmlIdx] = { ...components[htmlIdx], props };
      await prisma.websitePage.update({
        where: { id: listingPage.id },
        data: {
          status: "published",
          components: components as Prisma.InputJsonValue,
        },
      });
    }
  }

  return {
    ok: true,
    websiteId,
    pageSlug,
    imageCount: durableImages.length || rawImages.length,
    mirrored: beforeEphemeral,
  };
}

export async function syncAllPropertiesToGen2Website(input: {
  organisationId: string;
  actorId?: string;
  force?: boolean;
}): Promise<Array<{ propertyId: string; address: string; result: SyncPropertyToGen2WebsiteResult }>> {
  const { prisma } = await import("@dg/database");
  const properties = await prisma.property.findMany({
    where: { organisationId: input.organisationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const out: Array<{
    propertyId: string;
    address: string;
    result: SyncPropertyToGen2WebsiteResult;
  }> = [];
  for (const property of properties) {
    const result = await syncPropertyToGen2Website({
      organisationId: input.organisationId,
      propertyId: property.id,
      actorId: input.actorId,
      force: input.force,
    });
    out.push({
      propertyId: property.id,
      address: `${property.addressLine1}, ${property.suburb}`,
      result,
    });
  }
  return out;
}
