/**
 * One-shot SEO pass for cutover marketing sites.
 * Updates site + page title, description, keywords, og fields.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

function clamp(s, max) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function titleCaseSlug(slug) {
  return slug
    .split("/")
    .pop()
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function seoPack({ title, description, keywords }) {
  const t = clamp(title, 60);
  const d = clamp(description, 155);
  return {
    title: t,
    description: d,
    keywords: [...new Set(keywords.filter(Boolean))].slice(0, 10),
    ogTitle: t,
    ogDescription: d,
  };
}

const SITES = {
  roe: {
    id: "cmst2cykf000r09gj6rhixvii",
    brand: "Roe Realty",
    location: "Gold Coast",
    siteSeo: seoPack({
      title: "Roe Realty | Gold Coast Real Estate Agent",
      description:
        "Independent Gold Coast real estate agent helping vendors attract qualified buyers, maximise sale outcomes, and sell with clear strategy.",
      keywords: [
        "Roe Realty",
        "Gold Coast real estate agent",
        "sell property Gold Coast",
        "property appraisal Gold Coast",
        "Currumbin real estate",
      ],
    }),
    pages: {
      home: seoPack({
        title: "Roe Realty | Sell Smarter on the Gold Coast",
        description:
          "Strategic marketing and buyer demand analytics for Gold Coast vendors. Get a free property report or book an appraisal with Ben Roe.",
        keywords: [
          "Roe Realty",
          "Gold Coast real estate",
          "sell house Gold Coast",
          "property report",
        ],
      }),
      sell: seoPack({
        title: "Sell Your Property | Roe Realty Gold Coast",
        description:
          "Create more buyer demand and stronger sale outcomes. Book a free property appraisal with Roe Realty on the southern Gold Coast.",
        keywords: [
          "sell property Gold Coast",
          "property appraisal",
          "vendor agent Gold Coast",
          "Roe Realty",
        ],
      }),
      buy: seoPack({
        title: "Buy on the Gold Coast | Roe Realty",
        description:
          "Buyer representation and local market insight across Currumbin, Palm Beach, Burleigh and the southern Gold Coast.",
        keywords: [
          "buy property Gold Coast",
          "buyer agent Gold Coast",
          "Currumbin property",
          "Roe Realty",
        ],
      }),
      about: seoPack({
        title: "About Ben Roe | Roe Realty",
        description:
          "Meet Ben Roe — independent Gold Coast agent focused on strategy, buyer demand, and clear advice for vendors and buyers.",
        keywords: ["Ben Roe", "Roe Realty", "Gold Coast agent", "about"],
      }),
      contact: seoPack({
        title: "Contact Roe Realty | Book an Appraisal",
        description:
          "Contact Roe Realty to book a free appraisal, request a property report, or discuss selling or buying on the Gold Coast.",
        keywords: [
          "contact Roe Realty",
          "book appraisal",
          "Gold Coast real estate contact",
        ],
      }),
      "property-report": seoPack({
        title: "Free Property Report | Roe Realty",
        description:
          "Request an instant property report with local market context and next steps from Roe Realty on the Gold Coast.",
        keywords: [
          "property report Gold Coast",
          "property valuation",
          "Roe Realty report",
        ],
      }),
      "property-appraisal": seoPack({
        title: "Free Property Appraisal | Roe Realty",
        description:
          "Book a free 30-minute property appraisal with Roe Realty. Honest market advice, no obligation, Gold Coast focused.",
        keywords: [
          "free property appraisal",
          "Gold Coast appraisal",
          "home valuation",
          "Roe Realty",
        ],
      }),
      property: seoPack({
        title: "Properties | Roe Realty Gold Coast",
        description:
          "Browse Roe Realty listings and recent sales across the southern Gold Coast, including Currumbin, Tugun and surrounds.",
        keywords: [
          "Gold Coast properties",
          "Roe Realty listings",
          "sold properties",
        ],
      }),
      "privacy-policy": seoPack({
        title: "Privacy Policy | Roe Realty",
        description:
          "How Roe Realty collects, uses and protects personal information for appraisals, enquiries and property reports.",
        keywords: ["privacy policy", "Roe Realty"],
      }),
      "legal-notice": seoPack({
        title: "Legal Notice | Roe Realty",
        description:
          "Legal notice and disclaimer information for Roe Realty website content and property marketing materials.",
        keywords: ["legal notice", "Roe Realty"],
      }),
      "agent-disclaimer": seoPack({
        title: "Agent Disclaimer | Roe Realty",
        description:
          "Important agent disclaimer for Roe Realty listings, appraisals and marketing information on the Gold Coast.",
        keywords: ["agent disclaimer", "Roe Realty"],
      }),
    },
  },
  cvh: {
    id: "cmst2d41i003509gj0nuocwqw",
    brand: "Currumbin Valley Hideaway",
    location: "Currumbin Valley",
    siteSeo: seoPack({
      title: "Currumbin Valley Hideaway | Luxury Eco Retreat",
      description:
        "Luxury eco accommodation in Currumbin Valley — rainforest domes, private studios and nature stays near the southern Gold Coast.",
      keywords: [
        "Currumbin Valley Hideaway",
        "Currumbin Valley accommodation",
        "eco retreat Gold Coast",
        "rainforest dome stay",
      ],
    }),
    pages: {
      home: seoPack({
        title: "Currumbin Valley Hideaway | Eco Luxury Stays",
        description:
          "Retreat into the rainforest at Currumbin Valley Hideaway. Book luxury eco domes and private studios near the Gold Coast.",
        keywords: [
          "Currumbin Valley Hideaway",
          "luxury eco accommodation",
          "Currumbin Valley stay",
        ],
      }),
      stay: seoPack({
        title: "Stay | Domes & Studios at the Hideaway",
        description:
          "Choose your Currumbin Valley stay — Starlight Dome, Rainforest Dome, Garden Studio, Tiny Home and more.",
        keywords: [
          "Currumbin Valley accommodation",
          "book stay",
          "eco dome Gold Coast",
        ],
      }),
      gallery: seoPack({
        title: "Gallery | Currumbin Valley Hideaway",
        description:
          "Explore rainforest domes, interiors and valley views at Currumbin Valley Hideaway through our photo gallery.",
        keywords: ["Hideaway gallery", "Currumbin Valley photos"],
      }),
      experiences: seoPack({
        title: "Experiences | Currumbin Valley Nature",
        description:
          "Discover rock pools, walks, local food and valley experiences near Currumbin Valley Hideaway.",
        keywords: [
          "Currumbin Valley experiences",
          "things to do Currumbin Valley",
        ],
      }),
      contact: seoPack({
        title: "Contact | Currumbin Valley Hideaway",
        description:
          "Contact Currumbin Valley Hideaway to ask about availability, stays, or planning your rainforest escape.",
        keywords: ["contact Hideaway", "Currumbin Valley booking enquiry"],
      }),
      about: seoPack({
        title: "About | Currumbin Valley Hideaway",
        description:
          "Learn about Currumbin Valley Hideaway — a luxury eco retreat set in rainforest on the southern Gold Coast hinterland.",
        keywords: ["about Currumbin Valley Hideaway", "eco retreat"],
      }),
      "privacy-policy": seoPack({
        title: "Privacy Policy | Currumbin Valley Hideaway",
        description:
          "Privacy policy for Currumbin Valley Hideaway guest enquiries, bookings and website data.",
        keywords: ["privacy policy", "Currumbin Valley Hideaway"],
      }),
      "terms-conditions": seoPack({
        title: "Terms & Conditions | Currumbin Valley Hideaway",
        description:
          "Booking terms and conditions for stays at Currumbin Valley Hideaway.",
        keywords: ["terms and conditions", "Hideaway booking terms"],
      }),
    },
  },
  aetherra: {
    id: "cmslklx6t0001l504ncg97377",
    brand: "Aëtherra",
    location: "Australia",
    siteSeo: seoPack({
      title: "Aëtherra | Where Earth Meets Sky Through Sound",
      description:
        "Organic House journeys by Aëtherra — melodic, emotional soundscapes for movement, reflection and atmosphere.",
      keywords: [
        "Aëtherra",
        "Organic House",
        "melodic house",
        "DJ Aëtherra",
        "electronic music",
      ],
    }),
    pages: {
      home: seoPack({
        title: "Aëtherra | Organic House Soundscapes",
        description:
          "Where Earth Meets Sky Through Sound. Explore Aëtherra music, mixes and booking for Organic House journeys.",
        keywords: ["Aëtherra", "Organic House", "electronic music artist"],
      }),
      music: seoPack({
        title: "Music | Aëtherra",
        description:
          "Listen to Aëtherra music — Organic House soundscapes crafted for movement, reflection and emotional space.",
        keywords: ["Aëtherra music", "Organic House tracks"],
      }),
      mixes: seoPack({
        title: "Mixes | Aëtherra",
        description:
          "Aëtherra mixes and journeys through Organic House, melody and atmosphere.",
        keywords: ["Aëtherra mixes", "Organic House DJ mixes"],
      }),
      about: seoPack({
        title: "About Aëtherra",
        description:
          "About Aëtherra — an Organic House project built around melody, emotion and immersive sound.",
        keywords: ["about Aëtherra", "Organic House artist"],
      }),
      contact: seoPack({
        title: "Contact Aëtherra",
        description:
          "Contact Aëtherra for music, collaborations, bookings and enquiries.",
        keywords: ["contact Aëtherra", "book Aëtherra"],
      }),
      "book-aetherra": seoPack({
        title: "Book Aëtherra | Events & Sets",
        description:
          "Book Aëtherra for events, sets and Organic House performances.",
        keywords: ["book Aëtherra", "DJ booking", "Organic House DJ"],
      }),
      "terms-conditions": seoPack({
        title: "Terms & Conditions | Aëtherra",
        description: "Website terms and conditions for Aëtherra.",
        keywords: ["terms", "Aëtherra"],
      }),
      "artist-disclaimer": seoPack({
        title: "Artist Disclaimer | Aëtherra",
        description: "Artist disclaimer for Aëtherra content and bookings.",
        keywords: ["artist disclaimer", "Aëtherra"],
      }),
      "copyright-notice": seoPack({
        title: "Copyright Notice | Aëtherra",
        description:
          "Copyright notice for Aëtherra music, mixes and website content.",
        keywords: ["copyright", "Aëtherra"],
      }),
    },
  },
  digitalgate: {
    id: "cmskwz6zv0001l404cfi1wal4",
    brand: "DigitalGate",
    location: "Australia",
    siteSeo: seoPack({
      title: "DigitalGate | The Gateway to Your Digital World™",
      description:
        "AI-powered Business Operating Platform connecting websites, CRM, automation, marketing and industry apps in one system.",
      keywords: [
        "DigitalGate",
        "Business Operating Platform",
        "AI business platform",
        "CRM automation",
        "agency platform Australia",
      ],
    }),
    pages: {
      home: seoPack({
        title: "DigitalGate | Business Operating Platform",
        description:
          "Connect your website, CRM, AI, automation and digital tools in one Business Operating Platform. Book a strategy session.",
        keywords: [
          "DigitalGate",
          "Business Operating Platform",
          "AI CRM",
          "business automation",
        ],
      }),
      pricing: seoPack({
        title: "Pricing | DigitalGate Platform",
        description:
          "DigitalGate platform pricing for modern businesses — website, CRM, marketing, AI and industry apps in one system.",
        keywords: ["DigitalGate pricing", "business platform pricing"],
      }),
      about: seoPack({
        title: "About DigitalGate",
        description:
          "About DigitalGate — an AI-powered Business Operating Platform founded to simplify digital systems for growing businesses.",
        keywords: ["about DigitalGate", "Ben Roe DigitalGate"],
      }),
      contact: seoPack({
        title: "Contact DigitalGate | Strategy Session",
        description:
          "Book a free DigitalGate strategy session or contact the team about platform, apps and implementation.",
        keywords: [
          "contact DigitalGate",
          "book strategy session",
          "platform consultation",
        ],
      }),
    },
  },
};

function humanizePageTitle(rawTitle, brand) {
  const t = decodeEntities(rawTitle);
  if (!t) return brand;
  if (t.toLowerCase().includes(brand.toLowerCase())) return clamp(t, 60);
  // Blog-style titles already long — keep and append brand if room
  if (t.length >= 40) return clamp(`${t} | ${brand}`, 60);
  return clamp(`${t} | ${brand}`, 60);
}

function generatePageSeo(siteKey, page) {
  const cfg = SITES[siteKey];
  if (cfg.pages[page.slug]) return cfg.pages[page.slug];

  const brand = cfg.brand;
  const loc = cfg.location;
  const slug = page.slug;
  const baseTitle = decodeEntities(page.title) || titleCaseSlug(slug);

  // Property detail pages
  if (slug.startsWith("property/")) {
    const address = baseTitle.replace(/\s*\|\s*.*$/, "");
    return seoPack({
      title: `${address} | ${brand}`,
      description: `Property details for ${address}. View photos, specs and enquire with ${brand} on the ${loc}.`,
      keywords: [address, brand, `${loc} property`, "real estate listing"],
    });
  }

  // Appraisal locality pages
  if (slug.startsWith("property-appraisal-")) {
    const area = titleCaseSlug(slug.replace(/^property-appraisal-/, ""));
    return seoPack({
      title: `Property Appraisal ${area} | ${brand}`,
      description: `Book a free property appraisal in ${area} with ${brand}. Local market advice for vendors on the ${loc}.`,
      keywords: [
        `property appraisal ${area}`,
        `${area} real estate agent`,
        brand,
        "free appraisal",
      ],
    });
  }

  // Agent locality pages
  if (slug.startsWith("real-estate-agent-")) {
    const area = titleCaseSlug(slug.replace(/^real-estate-agent-/, ""));
    return seoPack({
      title: `Real Estate Agent ${area} | ${brand}`,
      description: `Looking for a real estate agent in ${area}? ${brand} helps vendors and buyers with clear local strategy.`,
      keywords: [
        `real estate agent ${area}`,
        `${area} property expert`,
        brand,
      ],
    });
  }

  // CVH unit pages
  if (
    [
      "garden-studio",
      "private-studio",
      "tiny-home",
      "the-shed",
      "starlight-dome",
      "rainforest-dome",
      "canopy-dome",
      "sanctuary-dome",
    ].includes(slug) ||
    slug.startsWith("accommodation/")
  ) {
    const unit = titleCaseSlug(slug.replace(/^accommodation\//, ""));
    return seoPack({
      title: `${unit} | Currumbin Valley Hideaway`,
      description: `Stay in the ${unit} at Currumbin Valley Hideaway — luxury eco accommodation in the Currumbin Valley rainforest.`,
      keywords: [
        unit,
        "Currumbin Valley accommodation",
        "Currumbin Valley Hideaway",
        "eco stay",
      ],
    });
  }

  // Skip utility/card pages lightly
  if (slug === "card") {
    return seoPack({
      title: `${brand} | Digital Card`,
      description: `${brand} digital contact card and quick links.`,
      keywords: [brand, "contact card"],
    });
  }

  // Blog / insights style
  if (
    /market|seo|ai |chatgpt|gemini|guide|how-|why-|best-|tips|report|prices|sell|buy|weekend|gems|waterfalls|romantic|guests|things-to-do/i.test(
      slug,
    )
  ) {
    return seoPack({
      title: humanizePageTitle(baseTitle, brand),
      description: clamp(
        `${baseTitle}. Practical insights from ${brand}${loc ? ` in ${loc}` : ""}.`,
        155,
      ),
      keywords: [
        brand,
        ...baseTitle
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 3)
          .slice(0, 6),
      ],
    });
  }

  return seoPack({
    title: humanizePageTitle(baseTitle, brand),
    description: clamp(
      `${baseTitle} — ${brand}${loc ? `, ${loc}` : ""}. Learn more and get in touch today.`,
      155,
    ),
    keywords: [brand, baseTitle, loc].filter(Boolean),
  });
}

async function main() {
  const summary = {};
  for (const [siteKey, cfg] of Object.entries(SITES)) {
    const site = await prisma.website.findUnique({ where: { id: cfg.id } });
    if (!site) {
      summary[siteKey] = { error: "site missing" };
      continue;
    }
    await prisma.website.update({
      where: { id: cfg.id },
      data: {
        seo: {
          ...(site.seo && typeof site.seo === "object" ? site.seo : {}),
          ...cfg.siteSeo,
        },
      },
    });

    const pages = await prisma.websitePage.findMany({
      where: { websiteId: cfg.id },
      select: { id: true, slug: true, title: true, seo: true },
    });
    let updated = 0;
    for (const page of pages) {
      const next = generatePageSeo(siteKey, page);
      await prisma.websitePage.update({
        where: { id: page.id },
        data: {
          seo: {
            ...(page.seo && typeof page.seo === "object" ? page.seo : {}),
            ...next,
          },
        },
      });
      updated += 1;
    }
    summary[siteKey] = { pages: updated, siteTitle: cfg.siteSeo.title };
  }
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
