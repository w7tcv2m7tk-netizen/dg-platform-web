/**
 * Rebuild RR property detail pages with mosaic lightbox HTML (no image remirror).
 * Usage: node --env-file=.env.local scripts/rebuild-roe-property-mosaics.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ORG = "cmsi1k71w0000jr04ljsf91z2";
const SITE = "cmst2cykf000r09gj6rhixvii";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status) {
  if (status === "sold") return "Sold";
  if (status === "under_offer" || status === "contract_signed") return "Under Offer";
  if (status === "listed") return "For Sale";
  if (status === "withdrawn") return "Withdrawn";
  return String(status || "").replace(/_/g, " ");
}

function formatPrice(property, meta) {
  if (meta.display_as_contact_agent === true) return "Contact Agent";
  const cents = property.listingPriceCents;
  if (cents == null) return "Contact Agent";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: property.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function featuresToList(features) {
  if (!features) return [];
  if (Array.isArray(features)) return features.map(String).filter(Boolean);
  if (typeof features === "string") {
    return features
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function buildMosaicGalleryHtml(images, title) {
  const list = (images || []).filter((u) => String(u).startsWith("http"));
  if (!list.length) return "";

  const main = list[0];
  const rest = list.slice(1);
  const sideThumbs = rest.slice(0, 2);
  const remainingAfterTwo = rest.length - 2;
  const moreSrc = remainingAfterTwo > 0 ? rest[2] : null;

  const thumbButtons = sideThumbs
    .map((src, i) => {
      const index = i + 1;
      return `<button type="button" class="gallery-item gallery-thumb" role="listitem" aria-label="Photo ${index + 1}" data-index="${index}"><img src="${esc(src)}" alt="${esc(title)} — photo ${index + 1}" loading="${index < 2 ? "eager" : "lazy"}" /></button>`;
    })
    .join("");

  const moreButton = moreSrc
    ? `<button type="button" class="gallery-item gallery-thumb gallery-more" role="listitem" aria-label="View ${remainingAfterTwo} more photos" data-index="3"><img src="${esc(moreSrc)}" alt="${esc(title)} — more photos" loading="lazy" /><span class="more-overlay">+${remainingAfterTwo}</span></button>`
    : "";

  const thumbs =
    sideThumbs.length || moreSrc
      ? `<div class="gallery-thumbs">${thumbButtons}${moreButton}</div>`
      : "";

  return `<div class="wb-mosaic-gallery property-gallery roe-prop-mosaic" data-wb-gallery="${esc(JSON.stringify(list))}"><div class="gallery-grid wb-mosaic-grid" role="list"><button type="button" class="gallery-item gallery-main" role="listitem" aria-label="Photo 1" data-index="0"><img src="${esc(main)}" alt="${esc(title)}" loading="eager" /></button>${thumbs}</div></div>`;
}

function buildDetailHtml(property, meta) {
  const marketing = meta.marketing || {};
  const images = (Array.isArray(meta.images) ? meta.images : []).filter((u) =>
    String(u).startsWith("http"),
  );
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

  const mosaic = buildMosaicGalleryHtml(images, title);
  const featureHtml = features.length
    ? `<ul class="roe-prop-features">${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`
    : "";

  return `<style>
.wb-html-island--page{color:#1C2B2A}
.roe-prop-detail{background:#F5F2EF;color:#1C2B2A;min-height:70vh}
.roe-prop-mosaic{position:relative;background:#0a0a0a}
.roe-prop-badge{position:absolute;top:1.25rem;left:1.25rem;z-index:2;background:#C62828;color:#fff;padding:.35rem .75rem;border-radius:999px;font-size:.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.roe-prop-body{max-width:920px;margin:0 auto;padding:2.5rem 1.25rem 3.5rem}
.roe-prop-body h1{font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.15;margin:0 0 .5rem;color:#14201f}
.roe-prop-address{color:#3f4a48;margin:0 0 1rem}
.roe-prop-price{font-size:1.35rem;font-weight:700;color:#6b5428;margin:0 0 1rem}
.roe-prop-specs{display:flex;gap:1rem;flex-wrap:wrap;color:#243533;margin:0 0 1.75rem}
.roe-prop-desc{color:#2f2f2f;line-height:1.7;margin:0 0 1.75rem;white-space:pre-wrap}
.roe-prop-features{margin:0 0 2rem;padding-left:1.1rem;color:#243533;line-height:1.55}
.roe-prop-features li{margin:.35rem 0}
.roe-prop-actions{display:flex;gap:1rem;flex-wrap:wrap}
.roe-prop-actions a{display:inline-flex;align-items:center;padding:.7rem 1.1rem;border-radius:999px;text-decoration:none;font-weight:700;font-size:.85rem}
.roe-prop-actions .primary{background:#C9A46C;color:#f8fafc}
.roe-prop-actions .ghost{border:1px solid #c9b8a4;color:#1c2b2a;background:#fff}
</style>
<div class="wb-html-island wb-html-island--page wb-html-island--light"><div class="roe-prop-detail">
  <div class="roe-prop-hero-wrap">
    ${mosaic || `<div class="roe-prop-mosaic wb-mosaic-gallery"><div class="gallery-grid wb-mosaic-grid"><div class="gallery-item gallery-main gallery-main--empty"></div></div></div>`}
    <span class="roe-prop-badge">${esc(statusLabel(property.status))}</span>
  </div>
  <div class="roe-prop-body">
    <h1>${esc(title)}</h1>
    <p class="roe-prop-address">${esc(address)}</p>
    <p class="roe-prop-price">${esc(formatPrice(property, meta))}</p>
    ${specs.length ? `<div class="roe-prop-specs"><span>${esc(specs.join(" · "))}</span></div>` : ""}
    <p class="roe-prop-desc">${esc(description)}</p>
    ${featureHtml}
    <div class="roe-prop-actions">
      <a class="primary" href="https://report.roerealty.com.au">Get Property Report</a>
      <a class="ghost" href="/contact">Contact Roe Realty</a>
      <a class="ghost" href="/property">Back to properties</a>
    </div>
  </div>
</div></div>`;
}

async function main() {
  const pages = await prisma.websitePage.findMany({
    where: { websiteId: SITE, slug: { startsWith: "property/" } },
    select: { id: true, slug: true, components: true, title: true },
  });
  const props = await prisma.property.findMany({
    where: { organisationId: ORG, deletedAt: null },
  });

  let updated = 0;
  for (const property of props) {
    const meta = { ...(property.metadata || {}) };
    const pageSlug =
      (typeof meta.gen2_website_slug === "string" && meta.gen2_website_slug.trim()) ||
      null;
    const page =
      (pageSlug && pages.find((p) => p.slug === pageSlug)) ||
      pages.find((p) =>
        String(p.title || "")
          .toLowerCase()
          .includes(String(property.addressLine1 || "").toLowerCase()),
      );
    if (!page) {
      console.warn("skip (no page)", property.addressLine1);
      continue;
    }

    const detailHtml = buildDetailHtml(property, meta);
    const components = Array.isArray(page.components) ? [...page.components] : [];
    const htmlIdx = components.findIndex((c) => c?.type === "html");
    if (htmlIdx >= 0) {
      components[htmlIdx] = {
        ...components[htmlIdx],
        props: { ...(components[htmlIdx].props || {}), html: detailHtml },
      };
    } else {
      components.unshift({
        id: `html-${page.slug}`,
        type: "html",
        props: { html: detailHtml },
      });
    }

    await prisma.websitePage.update({
      where: { id: page.id },
      data: { components },
    });
    updated += 1;
    console.log("updated", page.slug);
  }

  console.log(`Done. Updated ${updated} property pages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
