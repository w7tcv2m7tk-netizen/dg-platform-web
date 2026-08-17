import type { Prisma, Property } from "@dg/database";

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

/** Lazy — keeps listing Blob mirror off the static client graph via the platform-core barrel. */
export async function persistPropertyListingImages(
  organisationId: string,
  propertyId: string,
  images: string[],
): Promise<string[]> {
  const { persistPropertyListingImages: persist } = await import(
    "./persist-listing-images"
  );
  return persist(organisationId, propertyId, images);
}

function isEphemeralImageUrl(url: string): boolean {
  return /images-uat\.corelogic\.asia|signature=|corelogic\.asia\/.*\?/i.test(url);
}

function statusColor(status: string): string {
  const label = statusLabel(status);
  if (label === "Sold") return "#C62828";
  if (label === "Under Offer") return "#F57C00";
  if (label === "For Sale") return "#2E7D32";
  if (label === "Withdrawn") return "#666666";
  return "#666666";
}

/** WP-style mosaic: large hero + exactly 2 equal side thumbs; full set in data-wb-gallery for lightbox. */
function buildMosaicGalleryHtml(images: string[], title: string): string {
  const list = images.filter((u) => u.startsWith("http"));
  if (!list.length) return "";

  const main = list[0]!;
  const thumbA = list[1] ?? null;
  const thumbB = list[2] ?? null;
  const extraCount = Math.max(0, list.length - 3);

  const thumbs = thumbA
    ? `<div class="gallery-thumbs">
        <button type="button" class="gallery-item gallery-thumb" role="listitem" aria-label="Photo 2" data-index="1"><img src="${esc(thumbA)}" alt="${esc(title)} — photo 2" loading="eager" /></button>
        ${
          thumbB
            ? `<button type="button" class="gallery-item gallery-thumb${extraCount > 0 ? " gallery-more" : ""}" role="listitem" aria-label="${extraCount > 0 ? `View ${extraCount + 1} more photos` : "Photo 3"}" data-index="2"><img src="${esc(thumbB)}" alt="${esc(title)} — photo 3" loading="lazy" />${extraCount > 0 ? `<span class="more-overlay">+${extraCount + 1}</span>` : ""}</button>`
            : ""
        }
      </div>`
    : "";

  // Hidden remainder so lightbox can walk the full set (indexes 3+)
  const hidden = list
    .slice(3)
    .map(
      (src, i) =>
        `<button type="button" class="gallery-item gallery-hidden" data-index="${i + 3}" tabindex="-1" aria-hidden="true"><img src="${esc(src)}" alt="" /></button>`,
    )
    .join("");

  return `<div class="property-gallery wb-mosaic-gallery" data-wb-gallery="${esc(JSON.stringify(list))}"><div class="gallery-grid wb-mosaic-grid" role="list"><button type="button" class="gallery-item gallery-main" role="listitem" aria-label="Photo 1" data-index="0"><img src="${esc(main)}" alt="${esc(title)}" loading="eager" /></button>${thumbs}</div>${hidden ? `<div class="gallery-hidden" aria-hidden="true">${hidden}</div>` : ""}</div>`;
}

function buildDetailHtml(property: PropertyRow, _pageSlug: string): string {
  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  const marketing = (meta.marketing as Record<string, unknown> | undefined) ?? {};
  const images = (Array.isArray(meta.images) ? meta.images : [])
    .map(String)
    .filter((u) => u.startsWith("http"));
  const listingTitle =
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
  const status = statusLabel(property.status);
  const color = statusColor(property.status);
  const price = formatPrice(property, meta);
  const mosaic = buildMosaicGalleryHtml(images, listingTitle);
  const inspectionRaw =
    (typeof meta.inspection_times === "string" && meta.inspection_times.trim()) ||
    (typeof meta.inspectionTimes === "string" && meta.inspectionTimes.trim()) ||
    "";
  const inspectionLines = inspectionRaw
    ? inspectionRaw
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const featureHtml = features.length
    ? `<div class="features-list"><h3>Features &amp; Highlights</h3><ul>${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`
    : "";

  const inspectionHtml = inspectionLines.length
    ? `<div class="inspection-times"><h3>Inspection Times</h3><ul>${inspectionLines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>`
    : `<div class="inspection-times"><h3>Inspection Times</h3><p>Contact Roe Realty to arrange a private inspection.</p></div>`;

  const specItems = [
    beds != null ? `<div class="feature-item"><span class="icon">🛏</span><span class="value">${beds}</span><span class="label">Bed</span></div>` : "",
    baths != null ? `<div class="feature-item"><span class="icon">🛁</span><span class="value">${baths}</span><span class="label">Bath</span></div>` : "",
    cars != null ? `<div class="feature-item"><span class="icon">🚗</span><span class="value">${cars}</span><span class="label">Car</span></div>` : "",
    land ? `<div class="feature-item"><span class="icon">📐</span><span class="value">${esc(land)}</span><span class="label">Land</span></div>` : "",
    building ? `<div class="feature-item"><span class="icon">🏠</span><span class="value">${esc(building)}</span><span class="label">Building</span></div>` : "",
    property.propertyType
      ? `<div class="feature-item"><span class="icon">🏷</span><span class="value">${esc(property.propertyType)}</span><span class="label">Type</span></div>`
      : "",
  ].filter(Boolean);

  return `<style>
.wb-html-island--page{color:#1C2B2A}
.roe-prop-detail{background:#F5F2EF;color:#1C2B2A;min-height:70vh}
.roe-prop-detail .property-hero{background:#1C2B2A;padding:clamp(5.5rem,12vw,7.5rem) 1.25rem 1.75rem;color:#fff}
.roe-prop-detail .property-hero .container{max-width:1280px;margin:0 auto}
.roe-prop-detail .property-hero h1{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:700;margin:0 0 .35rem;color:#fff!important;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.roe-prop-detail .price-row{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.35rem}
.roe-prop-detail .price-row .status{display:inline-block;background:${color};color:#fff!important;padding:.25rem 1rem;border-radius:40px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.roe-prop-detail .price-row .price{color:#C9A46C!important;font-size:clamp(1.4rem,2.5vw,2rem);font-weight:700}
.roe-prop-detail .address-sub{color:#B8C5C2!important;font-size:1rem;margin-top:.15rem;font-weight:300}
.roe-prop-detail .property-gallery{margin:0;background:#000;border-radius:0}
.roe-prop-detail .property-content{padding:2.5rem 1.25rem 3.75rem;background:#F5F2EF}
.roe-prop-detail .property-content .container{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(260px,.9fr);gap:clamp(1.5rem,4vw,3.1rem)}
.roe-prop-detail .property-description{color:#4A5B59;line-height:1.8}
.roe-prop-detail .property-description h2{color:#1C2B2A;font-size:1.6rem;margin:0 0 1rem}
.roe-prop-detail .property-description p{margin:0 0 1rem;white-space:pre-wrap}
.roe-prop-detail .features-list,.roe-prop-detail .inspection-times{background:#fff;border:1px solid #E0D6CC;padding:1.5rem;margin:1.5rem 0;border-radius:16px}
.roe-prop-detail .features-list h3,.roe-prop-detail .inspection-times h3{color:#1C2B2A;font-size:1.2rem;margin:0 0 .75rem}
.roe-prop-detail .features-list ul,.roe-prop-detail .inspection-times ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:.4rem 1.25rem}
.roe-prop-detail .inspection-times ul{grid-template-columns:1fr}
.roe-prop-detail .features-list li,.roe-prop-detail .inspection-times li,.roe-prop-detail .inspection-times p{color:#4A5B59;font-size:.9rem;padding-left:1.5rem;position:relative;margin:0}
.roe-prop-detail .features-list li::before,.roe-prop-detail .inspection-times li::before{content:"✓";color:#C9A46C;position:absolute;left:0;font-weight:700}
.roe-prop-detail .inspection-times p{padding-left:0}
.roe-prop-detail .property-sidebar{display:flex;flex-direction:column;gap:1.5rem}
.roe-prop-detail .feature-box{background:#fff;border:1px solid #E0D6CC;padding:1.25rem;border-radius:16px}
.roe-prop-detail .feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}
.roe-prop-detail .feature-item{display:flex;flex-direction:column;align-items:center;text-align:center;padding:.5rem .25rem;border-radius:8px;background:#F9F7F5}
.roe-prop-detail .feature-item .icon{color:#C9A46C;font-size:1.25rem;margin-bottom:.15rem}
.roe-prop-detail .feature-item .value{font-weight:700;color:#1C2B2A;font-size:1.05rem}
.roe-prop-detail .feature-item .label{color:#4A5B59;font-size:.75rem}
.roe-prop-detail .roe-prop-actions{display:flex;flex-direction:column;gap:.65rem}
.roe-prop-detail .roe-prop-actions a{display:inline-flex;align-items:center;justify-content:center;padding:.75rem 1.1rem;border-radius:999px;text-decoration:none;font-weight:700;font-size:.85rem}
.roe-prop-detail .roe-prop-actions .primary{background:#C9A46C;color:#f8fafc}
.roe-prop-detail .roe-prop-actions .ghost{border:1px solid #c9b8a4;color:#1c2b2a;background:#fff}
.roe-prop-detail .roe-prop-return{padding:0 1.25rem 3rem;background:#F5F2EF;text-align:center}
.roe-prop-detail .roe-prop-return a{display:inline-flex;align-items:center;justify-content:center;padding:.85rem 1.5rem;border-radius:999px;border:1px solid #c9b8a4;background:#fff;color:#1c2b2a;font-weight:700;text-decoration:none}
@media (max-width:900px){
  .roe-prop-detail .property-content .container{grid-template-columns:1fr}
  .roe-prop-detail .features-list ul{grid-template-columns:1fr}
  .roe-prop-detail .feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>
<div class="wb-html-island wb-html-island--page wb-html-island--light"><div class="roe-prop-detail property-page">
  <div class="property-hero">
    <div class="container">
      <h1>${esc(listingTitle)}</h1>
      <div class="price-row">
        <span class="status">${esc(status)}</span>
        <span class="price">${esc(price)}</span>
      </div>
      <div class="address-sub">${esc(address)}</div>
    </div>
  </div>
  ${mosaic || ""}
  <div class="property-content">
    <div class="container">
      <div>
        <div class="property-description">
          <h2>${esc(listingTitle)}</h2>
          <p>${esc(description)}</p>
        </div>
        ${featureHtml}
        ${inspectionHtml}
      </div>
      <aside class="property-sidebar">
        ${specItems.length ? `<div class="feature-box"><div class="feature-grid">${specItems.join("")}</div></div>` : ""}
        <div class="roe-prop-actions">
          <a class="primary" href="https://report.roerealty.com.au">Get Property Report</a>
          <a class="ghost" href="/contact">Contact Roe Realty</a>
          <a class="ghost" href="/properties">Back to properties</a>
        </div>
      </aside>
    </div>
  </div>
  <div class="roe-prop-return">
    <a href="/properties">← Return to properties</a>
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

function pageHtml(page: { components?: unknown }): string {
  const components = Array.isArray(page.components)
    ? (page.components as Array<Record<string, unknown>>)
    : [];
  const htmlComp = components.find((c) => c.type === "html");
  const props = (htmlComp?.props as Record<string, unknown> | undefined) ?? {};
  return typeof props.html === "string" ? props.html : "";
}

/** WP leftover `/property` is a redirect; the live hub is `/properties`. */
function isListingHubRedirect(page: {
  slug: string;
  intent?: string | null;
  components?: unknown;
}): boolean {
  if ((page.intent || "").toLowerCase() === "redirect") return true;
  const html = pageHtml(page);
  return (
    page.slug === "property" &&
    (/http-equiv=["']refresh["']/i.test(html) || /location\.replace\(["']\/properties["']\)/i.test(html))
  );
}

/**
 * Live RR hub is `/properties`. `/property` is a WP leftover redirect (middleware 308).
 * Never write the listing grid onto the redirect stub.
 */
function findListingHubPage<
  T extends { slug: string; intent?: string | null; components?: unknown },
>(pages: T[]): T | undefined {
  const hubs = pages.filter(
    (p) => (p.slug === "properties" || p.slug === "property") && !isListingHubRedirect(p),
  );
  return hubs.find((p) => p.slug === "properties") ?? hubs[0];
}

async function refreshListingHub(input: {
  organisationId: string;
  websiteId: string;
  pages: Array<{
    id: string;
    slug: string;
    title: string;
    intent?: string | null;
    components: unknown;
  }>;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const listingPage = findListingHubPage(input.pages);
  if (!listingPage) return;

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
        pickExistingSlug(p, input.pages) ||
        defaultPropertyPageSlug(p);
      return buildCardHtml(p, slug);
    })
    .join("\n");

  const components = Array.isArray(listingPage.components)
    ? [...(listingPage.components as Array<Record<string, unknown>>)]
    : [];
  const htmlIdx = components.findIndex((c) => c.type === "html");
  if (htmlIdx < 0) return;

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

async function loadWebsitePages(websiteId: string) {
  const { prisma } = await import("@dg/database");
  return prisma.websitePage.findMany({
    where: { websiteId },
    select: {
      id: true,
      slug: true,
      title: true,
      intent: true,
      components: true,
      seo: true,
      status: true,
    },
  });
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
 * (detail page + /properties grid). WordPress sync remains separate.
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

  const websiteId = await resolveWebsiteId(input.organisationId);
  if (!websiteId) {
    return { ok: false, reason: "no_website", message: "No Gen 2 website for organisation" };
  }
  const pages = await loadWebsitePages(websiteId);

  const skipDetail =
    !input.force &&
    (meta.website_hidden === true || !WEBSITE_PUBLISH_STATUSES.has(property.status));
  if (skipDetail) {
    // Still refresh /properties so hide / status changes drop stale cards.
    await refreshListingHub({
      organisationId: input.organisationId,
      websiteId,
      pages,
    });
    if (meta.website_hidden === true) {
      return {
        ok: false,
        reason: "hidden",
        message: "Listing is hidden from the website",
      };
    }
    return {
      ok: false,
      reason: "skipped_status",
      message: `Status "${property.status}" is not published to the website`,
    };
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

  // Refresh listing grid (/properties; never the /property redirect stub)
  await refreshListingHub({
    organisationId: input.organisationId,
    websiteId,
    pages,
  });

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
