/**
 * RR listing hub helpers: `/properties` is canonical; `/property` is a WP leftover redirect.
 */
export const PROPERTY_HUB_REDIRECT_HTML = `<meta http-equiv="refresh" content="0;url=/properties"><link rel="canonical" href="https://roerealty.com.au/properties"><script>location.replace("/properties");</script><p>Moved to <a href="/properties">Properties</a>.</p>`;

const PUBLISH = new Set([
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "withdrawn",
]);

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

function buildCardHtml(property, pageSlug) {
  const meta = property.metadata || {};
  const marketing = meta.marketing || {};
  const images = Array.isArray(meta.images) ? meta.images.map(String) : [];
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

export function replacePropertyGrid(html, cardsHtml) {
  const open = String(html).search(/<div class="roe-property-grid"/i);
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

function pageHtml(page) {
  const components = Array.isArray(page?.components) ? page.components : [];
  const htmlComp = components.find((c) => c?.type === "html");
  return typeof htmlComp?.props?.html === "string" ? htmlComp.props.html : "";
}

export function isListingHubRedirect(page) {
  if ((page?.intent || "").toLowerCase() === "redirect") return true;
  const html = pageHtml(page);
  return (
    page?.slug === "property" &&
    (/http-equiv=["']refresh["']/i.test(html) ||
      /location\.replace\(["']\/properties["']\)/i.test(html))
  );
}

export async function ensureRoeListingHub(prisma, websiteId) {
  const propertyPage = await prisma.websitePage.findFirst({
    where: { websiteId, slug: "property" },
  });
  const propertiesPage = await prisma.websitePage.findFirst({
    where: { websiteId, slug: "properties" },
  });

  if (!propertiesPage && propertyPage && !isListingHubRedirect(propertyPage)) {
    await prisma.websitePage.update({
      where: { id: propertyPage.id },
      data: {
        slug: "properties",
        intent: "listings",
        title:
          propertyPage.title === "Property" || /redirect/i.test(propertyPage.title || "")
            ? "Properties"
            : propertyPage.title,
      },
    });
  }

  const leftover = await prisma.websitePage.findFirst({
    where: { websiteId, slug: "property" },
  });
  const redirectSeo = {
    title: "Properties | Roe Realty Listings",
    description: "Browse Roe Realty property listings.",
    canonicalPath: "/properties",
  };
  const redirectComponents = [
    { id: "redirect-html", type: "html", props: { html: PROPERTY_HUB_REDIRECT_HTML } },
  ];

  if (!leftover) {
    const maxSort = await prisma.websitePage.aggregate({
      where: { websiteId },
      _max: { sortOrder: true },
    });
    await prisma.websitePage.create({
      data: {
        websiteId,
        title: "Property (redirect)",
        slug: "property",
        intent: "redirect",
        status: "published",
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        seo: redirectSeo,
        components: redirectComponents,
      },
    });
    return;
  }

  await prisma.websitePage.update({
    where: { id: leftover.id },
    data: {
      intent: "redirect",
      title: "Property (redirect)",
      status: "published",
      seo: redirectSeo,
      components: redirectComponents,
    },
  });
}

export async function rebuildRoeListingHub(prisma, { websiteId, organisationId }) {
  const hub =
    (await prisma.websitePage.findFirst({
      where: { websiteId, slug: "properties" },
    })) ||
    (await prisma.websitePage.findFirst({
      where: { websiteId, slug: "property", NOT: { intent: "redirect" } },
    }));
  if (!hub) return { ok: false, reason: "no_hub" };

  const props = await prisma.property.findMany({
    where: {
      organisationId,
      deletedAt: null,
      status: { in: [...PUBLISH] },
    },
    orderBy: { updatedAt: "desc" },
  });
  const cards = props
    .filter((p) => (p.metadata || {}).website_hidden !== true)
    .map((p) => {
      const meta = p.metadata || {};
      const slug =
        (typeof meta.gen2_website_slug === "string" && meta.gen2_website_slug) ||
        defaultSlug(p);
      return buildCardHtml(p, slug);
    })
    .join("\n");

  const components = Array.isArray(hub.components) ? [...hub.components] : [];
  const idx = components.findIndex((c) => c?.type === "html");
  if (idx < 0) return { ok: false, reason: "no_html" };

  const nextProps = { ...(components[idx].props || {}) };
  nextProps.html = replacePropertyGrid(String(nextProps.html || ""), cards);
  components[idx] = { ...components[idx], props: nextProps };
  await prisma.websitePage.update({
    where: { id: hub.id },
    data: { status: "published", components },
  });
  return { ok: true, slug: hub.slug, cards: props.length };
}
