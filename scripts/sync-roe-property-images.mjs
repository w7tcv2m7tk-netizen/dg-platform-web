#!/usr/bin/env node
/**
 * Mirror Roe Cotality images → Vercel Blob and rebuild Gen 2 website pages.
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const ORG = "cmsi1k71w0000jr04ljsf91z2";
const SITE = "cmst2cykf000r09gj6rhixvii";
const PUBLISH = new Set([
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "withdrawn",
]);

const prisma = new PrismaClient();

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugPart(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/-]/g, "")
    .replace(/[/\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultSlug(p) {
  return `property/${slugPart(`${p.addressLine1}-${p.suburb}`)}`;
}

function isEphemeral(url) {
  return /images-uat\.corelogic\.asia|signature=|corelogic\.asia\/.*\?/i.test(url);
}

function statusLabel(status) {
  if (status === "sold") return "Sold";
  if (status === "under_offer" || status === "contract_signed") return "Under Offer";
  if (status === "listed") return "For Sale";
  return String(status).replace(/_/g, " ");
}

function formatPrice(p, meta) {
  if (meta.display_as_contact_agent === true) return "Contact Agent";
  if (p.listingPriceCents == null) return "Contact Agent";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: p.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(p.listingPriceCents / 100);
}

function featuresToList(features) {
  if (typeof features === "string") {
    return features
      .split(/\r?\n|\u2022|\*/)
      .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(features)) return features.map(String).map((s) => s.trim()).filter(Boolean);
  return [];
}

async function mirrorImage(orgId, propertyId, src) {
  if (!isEphemeral(src) && /blob\.vercel-storage\.com|\/org-assets\//i.test(src)) {
    return src;
  }
  const res = await fetch(src, {
    redirect: "follow",
    headers: { Accept: "image/*,*/*" },
  });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) throw new Error(`not image ${contentType}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) throw new Error("too small");
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 16);
  const pathname = `org-assets/${orgId}/listing-images/${propertyId}/${hash}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return blob.url;
}

async function persistImages(orgId, propertyId, images) {
  const out = [];
  const seen = new Set();
  for (const src of images) {
    const url = String(src || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    try {
      out.push(await mirrorImage(orgId, propertyId, url));
    } catch (e) {
      console.warn("mirror fail", propertyId, e.message, url.slice(0, 80));
      if (!isEphemeral(url)) out.push(url);
    }
  }
  return out;
}

function buildDetailHtml(property, meta) {
  const marketing = meta.marketing || {};
  const images = (Array.isArray(meta.images) ? meta.images : []).filter((u) =>
    String(u).startsWith("http"),
  );
  const hero = images[0] || meta.featured_image || "";
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
      <a class="primary" href="https://report.roerealty.com.au">Get Property Report</a>
      <a class="ghost" href="/contact">Contact Roe Realty</a>
      <a class="ghost" href="/property">Back to properties</a>
    </div>
  </div>
</div></div>`;
}

function buildCard(property, meta, pageSlug) {
  const marketing = meta.marketing || {};
  const images = Array.isArray(meta.images) ? meta.images : [];
  const hero = images[0] || meta.featured_image || "";
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

function pickSlug(property, pages) {
  const meta = property.metadata || {};
  if (typeof meta.gen2_website_slug === "string" && meta.gen2_website_slug.trim()) {
    return meta.gen2_website_slug.trim().replace(/^\/+/, "");
  }
  const wanted = defaultSlug(property);
  if (pages.some((p) => p.slug === wanted)) return wanted;
  const addrKey = slugPart(property.addressLine1);
  const match = pages.find((p) => p.slug.startsWith("property/") && p.slug.includes(addrKey));
  if (match) return match.slug;
  const byTitle = pages.find((p) =>
    String(p.title || "")
      .toLowerCase()
      .includes(property.addressLine1.toLowerCase()),
  );
  if (byTitle?.slug?.startsWith("property/")) return byTitle.slug;
  return wanted;
}

function replaceGrid(html, cardsHtml) {
  if (/class="roe-property-grid"/.test(html)) {
    return html.replace(
      /<div class="roe-property-grid"[\s\S]*?<\/div>(?=\s*(?:<\/div>|<\/section>|<\/main>|$))/i,
      `<div class="roe-property-grid">${cardsHtml}</div>`,
    );
  }
  return `${html}\n<div class="roe-property-grid">${cardsHtml}</div>`;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN missing");
  }

  const pages = await prisma.websitePage.findMany({
    where: { websiteId: SITE },
    select: { id: true, slug: true, title: true, components: true },
  });
  const props = await prisma.property.findMany({
    where: { organisationId: ORG, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  const summary = [];
  for (const property of props) {
    const meta = { ...(property.metadata || {}) };
    const raw = (Array.isArray(meta.images) ? meta.images : []).map(String);
    console.log("mirroring", property.addressLine1, raw.length, "images…");
    const durable = await persistImages(ORG, property.id, raw);
    meta.images = durable;
    meta.featured_image = durable[0] || null;
    meta.listing_images_mirrored_at = new Date().toISOString();
    const pageSlug = pickSlug({ ...property, metadata: meta }, pages);
    meta.gen2_website_slug = pageSlug;

    await prisma.property.update({
      where: { id: property.id },
      data: { metadata: meta },
    });

    const title =
      (meta.marketing?.headline && String(meta.marketing.headline).trim()) ||
      `${property.addressLine1}, ${property.suburb}`;
    const detailHtml = buildDetailHtml(property, meta);
    const seo = {
      title: `${title} | Roe Realty`,
      description: `${title} — ${statusLabel(property.status)} with Roe Realty. View photos, specs and enquire today.`,
      keywords: [title.toLowerCase(), "roe realty", property.suburb.toLowerCase()],
      ogTitle: `${title} | Roe Realty`,
      ogDescription: `${title} — ${statusLabel(property.status)} with Roe Realty.`,
      ...(durable[0] ? { ogImage: durable[0] } : {}),
    };
    const existing = pages.find((p) => p.slug === pageSlug);
    const components = [
      {
        id: existing?.components?.[0]?.id || `html-${pageSlug}`,
        type: "html",
        props: { html: detailHtml },
      },
    ];
    if (existing) {
      await prisma.websitePage.update({
        where: { id: existing.id },
        data: { title, status: "published", seo, components },
      });
    } else {
      const maxSort = await prisma.websitePage.aggregate({
        where: { websiteId: SITE },
        _max: { sortOrder: true },
      });
      await prisma.websitePage.create({
        data: {
          websiteId: SITE,
          title,
          slug: pageSlug,
          intent: "custom",
          status: "published",
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          seo,
          components,
        },
      });
    }

    summary.push({
      address: `${property.addressLine1}, ${property.suburb}`,
      pageSlug,
      images: durable.length,
      first: durable[0]?.slice(0, 90),
      hosts: [...new Set(durable.map((u) => { try { return new URL(u).hostname; } catch { return "?"; } }))],
    });
  }

  // Rebuild listing grid from refreshed metadata
  const refreshed = await prisma.property.findMany({
    where: { organisationId: ORG, deletedAt: null, status: { in: [...PUBLISH] } },
    orderBy: { updatedAt: "desc" },
  });
  const cards = refreshed
    .filter((p) => (p.metadata || {}).website_hidden !== true)
    .map((p) => {
      const meta = p.metadata || {};
      const slug = meta.gen2_website_slug || defaultSlug(p);
      return buildCard(p, meta, slug);
    })
    .join("\n");

  const listing = await prisma.websitePage.findFirst({
    where: { websiteId: SITE, slug: "property" },
  });
  if (listing) {
    const components = Array.isArray(listing.components) ? [...listing.components] : [];
    const idx = components.findIndex((c) => c.type === "html");
    if (idx >= 0) {
      const props = { ...(components[idx].props || {}) };
      props.html = replaceGrid(String(props.html || ""), cards);
      components[idx] = { ...components[idx], props };
      await prisma.websitePage.update({
        where: { id: listing.id },
        data: { status: "published", components },
      });
    }
  }

  console.log(JSON.stringify({ summary, listingUpdated: Boolean(listing) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
