/**
 * Rebuild RR property detail pages with WP-style hero + mosaic gallery + details.
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

function statusColor(status) {
  const label = statusLabel(status);
  if (label === "Sold") return "#C62828";
  if (label === "Under Offer") return "#F57C00";
  if (label === "For Sale") return "#2E7D32";
  return "#666666";
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
    ? `<button type="button" class="gallery-item gallery-thumb gallery-more" role="listitem" aria-label="View ${remainingAfterTwo} more photos" data-index="3"><img src="${esc(moreSrc)}" alt="${esc(title)} — more photos" loading="lazy" /><span class="more-overlay">+ ${remainingAfterTwo}</span></button>`
    : "";

  const thumbs =
    sideThumbs.length || moreSrc
      ? `<div class="gallery-thumbs">${thumbButtons}${moreButton}</div>`
      : "";

  const hidden = list
    .slice(4)
    .map(
      (src, i) =>
        `<button type="button" class="gallery-item gallery-hidden" data-index="${i + 4}" tabindex="-1" aria-hidden="true"><img src="${esc(src)}" alt="" /></button>`,
    )
    .join("");

  return `<div class="property-gallery wb-mosaic-gallery" data-wb-gallery="${esc(JSON.stringify(list))}"><div class="gallery-grid wb-mosaic-grid" role="list"><button type="button" class="gallery-item gallery-main" role="listitem" aria-label="Photo 1" data-index="0"><img src="${esc(main)}" alt="${esc(title)}" loading="eager" /></button>${thumbs}</div>${hidden ? `<div class="gallery-hidden" aria-hidden="true">${hidden}</div>` : ""}</div>`;
}

function buildDetailHtml(property, meta) {
  const marketing = meta.marketing || {};
  const images = (Array.isArray(meta.images) ? meta.images : []).filter((u) =>
    String(u).startsWith("http"),
  );
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

  const featureHtml = features.length
    ? `<div class="features-list"><h3>Features &amp; Highlights</h3><ul>${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`
    : "";

  const specItems = [
    beds != null
      ? `<div class="feature-item"><span class="icon">🛏</span><span class="value">${beds}</span><span class="label">Bed</span></div>`
      : "",
    baths != null
      ? `<div class="feature-item"><span class="icon">🛁</span><span class="value">${baths}</span><span class="label">Bath</span></div>`
      : "",
    cars != null
      ? `<div class="feature-item"><span class="icon">🚗</span><span class="value">${cars}</span><span class="label">Car</span></div>`
      : "",
    land
      ? `<div class="feature-item"><span class="icon">📐</span><span class="value">${esc(land)}</span><span class="label">Land</span></div>`
      : "",
    building
      ? `<div class="feature-item"><span class="icon">🏠</span><span class="value">${esc(building)}</span><span class="label">Building</span></div>`
      : "",
    property.propertyType
      ? `<div class="feature-item"><span class="icon">🏷</span><span class="value">${esc(property.propertyType)}</span><span class="label">Type</span></div>`
      : "",
  ].filter(Boolean);

  return `<style>
.wb-html-island--page{color:#1C2B2A}
.roe-prop-detail{background:#F5F2EF;color:#1C2B2A;min-height:70vh}
.roe-prop-detail .property-hero{background:#1C2B2A;padding:clamp(5.5rem,12vw,7.5rem) 1.25rem 1.75rem;color:#fff}
.roe-prop-detail .property-hero .container{max-width:1280px;margin:0 auto}
.roe-prop-detail .property-hero h1{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:700;margin:0 0 .35rem;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.roe-prop-detail .price-row{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.35rem}
.roe-prop-detail .price-row .status{display:inline-block;background:${color};color:#fff;padding:.25rem 1rem;border-radius:40px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.roe-prop-detail .price-row .price{color:#C9A46C;font-size:clamp(1.4rem,2.5vw,2rem);font-weight:700}
.roe-prop-detail .address-sub{color:#B8C5C2;font-size:1rem;margin-top:.15rem;font-weight:300}
.roe-prop-detail .property-gallery{margin:0;background:#000;border-radius:0}
.roe-prop-detail .property-content{padding:2.5rem 1.25rem 3.75rem;background:#F5F2EF}
.roe-prop-detail .property-content .container{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(260px,.9fr);gap:clamp(1.5rem,4vw,3.1rem)}
.roe-prop-detail .property-description{color:#4A5B59;line-height:1.8}
.roe-prop-detail .property-description h2{color:#1C2B2A;font-size:1.6rem;margin:0 0 1rem}
.roe-prop-detail .property-description p{margin:0 0 1rem;white-space:pre-wrap}
.roe-prop-detail .features-list{background:#fff;border:1px solid #E0D6CC;padding:1.5rem;margin:1.5rem 0;border-radius:16px}
.roe-prop-detail .features-list h3{color:#1C2B2A;font-size:1.2rem;margin:0 0 .75rem}
.roe-prop-detail .features-list ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:.4rem 1.25rem}
.roe-prop-detail .features-list li{color:#4A5B59;font-size:.9rem;padding-left:1.5rem;position:relative}
.roe-prop-detail .features-list li::before{content:"✓";color:#C9A46C;position:absolute;left:0;font-weight:700}
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
