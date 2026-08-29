/**
 * One-shot SEO optimiser for Gen 2 marketing sites.
 * Rewrites site + page title / description / keywords / OG fields.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

function decode(s = "") {
  return String(s)
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s, max) {
  const t = decode(s).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function seo(title, description, keywords = []) {
  const t = clip(title, 60);
  const d = clip(description, 155);
  return {
    title: t,
    description: d,
    keywords: keywords.filter(Boolean).slice(0, 12),
    ogTitle: t,
    ogDescription: d,
  };
}

function suburbFromSlug(slug, prefix) {
  const raw = slug.replace(prefix, "").replace(/-/g, " ");
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @type {Record<string, { site: ReturnType<typeof seo>, pages: Record<string, ReturnType<typeof seo>>, fallback: (slug: string, title: string) => ReturnType<typeof seo> }>} */
const PLANS = {
  "cmst2cykf000r09gj6rhixvii": {
    brand: "Roe Realty",
    site: seo(
      "Roe Realty | Gold Coast Real Estate Agent",
      "Independent Gold Coast real estate agent helping vendors sell with stronger buyer demand. Free appraisals, local market insight, and clear advice.",
      [
        "roe realty",
        "gold coast real estate agent",
        "property appraisal gold coast",
        "sell house gold coast",
        "currumbin real estate",
      ],
    ),
    pages: {
      home: seo(
        "Roe Realty | Gold Coast Real Estate Agent",
        "More buyer demand and stronger sale outcomes. Roe Realty is an independent Gold Coast agency for vendors and buyers across Currumbin, Palm Beach and surrounds.",
        ["roe realty", "gold coast real estate", "sell property gold coast"],
      ),
      sell: seo(
        "Sell Your Property | Roe Realty Gold Coast",
        "Strategic marketing and local expertise to attract qualified buyers and improve sale results. Book a free property appraisal with Roe Realty.",
        ["sell house gold coast", "sell property gold coast", "property appraisal"],
      ),
      buy: seo(
        "Buy With Confidence | Roe Realty Gold Coast",
        "Clear advice, local insight and practical buyer support on the southern Gold Coast. Book a free buyer consultation with Roe Realty.",
        ["buy property gold coast", "buyer agent gold coast", "roe realty buy"],
      ),
      about: seo(
        "About Ben Roe | Roe Realty Gold Coast",
        "Meet Ben Roe — an independent Gold Coast real estate agent focused on local knowledge, honest advice and marketing that delivers results.",
        ["ben roe", "about roe realty", "gold coast realtor"],
      ),
      contact: seo(
        "Contact Roe Realty | Gold Coast",
        "Speak with Ben Roe about selling, buying or a free property appraisal. Contact Roe Realty on the southern Gold Coast.",
        ["contact roe realty", "ben roe phone", "gold coast real estate contact"],
      ),
      property: seo(
        "Properties | Roe Realty Listings",
        "Browse Roe Realty property listings and recent sales across the Gold Coast and surrounds. Enquire for comparable sales and appraisals.",
        ["roe realty listings", "gold coast properties for sale", "sold properties"],
      ),
      "property-report": seo(
        "Free Property Report | Roe Realty",
        "Request an instant property report with local buyer-demand insights. Get clarity on value and next steps from Roe Realty.",
        ["property report gold coast", "property valuation", "buyer demand report"],
      ),
      "property-appraisal": seo(
        "Free Property Appraisal | Roe Realty Gold Coast",
        "Book a free 30-minute property appraisal with Roe Realty. Accurate market valuation, comparable sales and no-obligation advice.",
        ["free property appraisal", "property valuation gold coast", "home appraisal"],
      ),
      "property-appraisal-gold-coast": seo(
        "Property Appraisal Gold Coast | Roe Realty",
        "Free Gold Coast property appraisal from an independent local agent. Market value, comps and clear selling advice — no obligation.",
        ["property appraisal gold coast", "gold coast home valuation"],
      ),
      agents: seo(
        "Our Agent | Ben Roe — Roe Realty",
        "Work directly with Ben Roe at Roe Realty — personal service, local Gold Coast expertise and marketing built for buyer demand.",
        ["ben roe agent", "roe realty agent"],
      ),
      insights: seo(
        "Property Insights | Roe Realty Gold Coast",
        "Gold Coast market updates, suburb guides and practical selling advice from Roe Realty.",
        ["gold coast property insights", "real estate blog gold coast"],
      ),
      "buyer-consultation": seo(
        "Free Buyer Consultation | Roe Realty",
        "Book a free buyer consultation with Roe Realty. Local insight and practical support for Gold Coast property purchases.",
        ["buyer consultation gold coast", "buy with roe realty"],
      ),
      "privacy-policy": seo(
        "Privacy Policy | Roe Realty",
        "How Roe Realty collects, uses and protects personal information in Queensland, Australia.",
        ["roe realty privacy"],
      ),
      "terms-conditions": seo(
        "Terms & Conditions | Roe Realty",
        "Website terms and conditions for Roe Realty online services and content.",
        ["roe realty terms"],
      ),
      "legal-notice": seo(
        "Legal Notice | Roe Realty",
        "Legal notices and disclosures for Roe Realty website content and listings.",
        ["roe realty legal"],
      ),
      "agent-disclaimer": seo(
        "Agent Disclaimer | Roe Realty",
        "Important disclaimer information relating to Roe Realty agency services and marketing content.",
        ["roe realty disclaimer"],
      ),
      card: seo(
        "Digital Card | Roe Realty",
        "Ben Roe digital business card — contact details for Roe Realty on the Gold Coast.",
        ["ben roe contact card"],
      ),
      "sell-my-house-gold-coast": seo(
        "Sell My House Gold Coast | Roe Realty",
        "Ready to sell your Gold Coast home? Roe Realty combines local expertise with demand-focused marketing for stronger outcomes.",
        ["sell my house gold coast", "sell home gold coast"],
      ),
      "selling-property-gold-coast": seo(
        "Selling Property Gold Coast | Roe Realty",
        "A practical guide to selling property on the Gold Coast with Roe Realty — appraisals, marketing and negotiation support.",
        ["selling property gold coast"],
      ),
      "gold-coast-real-estate-agent": seo(
        "Gold Coast Real Estate Agent | Roe Realty",
        "Independent Gold Coast real estate agent helping vendors attract qualified buyers and achieve better sale results.",
        ["gold coast real estate agent", "roe realty"],
      ),
      "independent-real-estate-agent-gold-coast": seo(
        "Independent Real Estate Agent Gold Coast",
        "Work with an independent Gold Coast agent — direct access to Ben Roe, clear advice and marketing that drives buyer demand.",
        ["independent real estate agent gold coast"],
      ),
      "local-real-estate-agent-gold-coast": seo(
        "Local Real Estate Agent Gold Coast | Roe Realty",
        "Local Gold Coast real estate advice from Roe Realty — suburb knowledge, appraisals and seller representation you can trust.",
        ["local real estate agent gold coast"],
      ),
      "how-property-appraisals-work": seo(
        "How Property Appraisals Work | Roe Realty",
        "Learn how a property appraisal works on the Gold Coast — what we review, how value is estimated, and what happens next.",
        ["how property appraisals work", "home appraisal process"],
      ),
      "preparing-your-home-for-sale": seo(
        "Preparing Your Home for Sale | Roe Realty",
        "Practical steps to prepare your Gold Coast home for sale — presentation, pricing strategy and marketing readiness.",
        ["preparing home for sale", "home staging gold coast"],
      ),
      "should-i-sell-before-i-buy": seo(
        "Should I Sell Before I Buy? | Roe Realty",
        "Sell-first vs buy-first on the Gold Coast — clear guidance to help you choose the right sequence for your situation.",
        ["sell before buy", "gold coast property strategy"],
      ),
      "costs-of-selling-in-queensland": seo(
        "Costs of Selling in Queensland | Roe Realty",
        "Understand typical costs of selling property in Queensland — fees, marketing and what to budget for with Roe Realty.",
        ["costs of selling queensland", "selling costs qld"],
      ),
      "best-time-to-sell-property-gold-coast": seo(
        "Best Time to Sell Property Gold Coast",
        "When is the best time to sell on the Gold Coast? Seasonal patterns, buyer demand and timing tips from Roe Realty.",
        ["best time to sell gold coast"],
      ),
      "how-long-does-it-take-to-sell-a-house-on-the-gold-coast": seo(
        "How Long to Sell a House on the Gold Coast",
        "Typical Gold Coast selling timeframes and what influences days-on-market — insights from Roe Realty.",
        ["how long to sell house gold coast", "days on market"],
      ),
      "gold-coast-property-prices": seo(
        "Gold Coast Property Prices | Roe Realty",
        "Gold Coast property price trends and local context to help vendors and buyers make informed decisions.",
        ["gold coast property prices", "gold coast house prices"],
      ),
      "gold-coast-property-market-report": seo(
        "Gold Coast Property Market Report | Roe Realty",
        "Gold Coast property market report with demand, pricing and suburb insights from Roe Realty.",
        ["gold coast property market report"],
      ),
      "gold-coast-property-market-update": seo(
        "Gold Coast Property Market Update | Roe Realty",
        "Latest Gold Coast property market update — buyer demand, pricing movement and what it means for sellers.",
        ["gold coast property market update"],
      ),
      "currumbin-property-market-report": seo(
        "Currumbin Property Market Report | Roe Realty",
        "Currumbin property market report with local sales context and selling insights from Roe Realty.",
        ["currumbin property market", "currumbin real estate"],
      ),
      "palm-beach-property-market-report": seo(
        "Palm Beach Property Market Report | Roe Realty",
        "Palm Beach Gold Coast property market report — local trends and appraisal insights from Roe Realty.",
        ["palm beach property market", "palm beach real estate"],
      ),
      "burleigh-heads-property-market-report": seo(
        "Burleigh Heads Property Market Report",
        "Burleigh Heads property market report with local pricing and demand insights from Roe Realty.",
        ["burleigh heads property market"],
      ),
      "currumbin-valley-market-trends": seo(
        "Living in Currumbin Valley | Prices & Lifestyle",
        "Currumbin Valley property prices, lifestyle and market trends for 2026 — local insight from Roe Realty.",
        ["currumbin valley property", "currumbin valley lifestyle"],
      ),
    },
    fallback(slug, title) {
      const clean = decode(title) || slug;
      if (slug.startsWith("property-appraisal-")) {
        const suburb = suburbFromSlug(slug, "property-appraisal-");
        return seo(
          `Property Appraisal ${suburb} | Roe Realty`,
          `Book a free property appraisal in ${suburb}. Local market valuation and no-obligation advice from Roe Realty on the Gold Coast.`,
          [`property appraisal ${suburb.toLowerCase()}`, "free property appraisal gold coast"],
        );
      }
      if (slug.startsWith("real-estate-agent-")) {
        const suburb = suburbFromSlug(slug, "real-estate-agent-");
        return seo(
          `Real Estate Agent ${suburb} | Roe Realty`,
          `Looking for a real estate agent in ${suburb}? Roe Realty offers local expertise, free appraisals and seller-focused marketing.`,
          [`real estate agent ${suburb.toLowerCase()}`, "roe realty"],
        );
      }
      if (slug.startsWith("property/")) {
        return seo(
          `${clean} | Roe Realty`,
          `${clean} — property details, photos and enquiry options via Roe Realty. Ask about comparable sales or a free appraisal in this area.`,
          [clean.toLowerCase(), "roe realty listing"],
        );
      }
      return seo(
        `${clean} | Roe Realty`,
        `${clean} — Gold Coast real estate guidance from Roe Realty. Appraisals, selling strategy and local market insight.`,
        [clean.toLowerCase(), "roe realty"],
      );
    },
  },

  "cmst2d41i003509gj0nuocwqw": {
    brand: "Currumbin Valley Hideaway",
    site: seo(
      "Currumbin Valley Hideaway | Eco Stay Gold Coast",
      "Luxury eco accommodation in Currumbin Valley — rainforest domes, tiny home and private studio for rest, nature and romantic escapes.",
      [
        "currumbin valley hideaway",
        "currumbin valley accommodation",
        "eco retreat gold coast",
        "rainforest dome stay",
      ],
    ),
    pages: {
      home: seo(
        "Currumbin Valley Hideaway | Luxury Eco Retreat",
        "Retreat into the rainforest. Luxury eco accommodation in Currumbin Valley designed for rest, stillness and reconnection with nature.",
        ["currumbin valley hideaway", "eco accommodation currumbin"],
      ),
      stay: seo(
        "Stay | Domes, Studio & Tiny Home — CVH",
        "Choose your Currumbin Valley stay — rainforest domes, Garden Studio, Tiny Home or The Shed. Book your eco retreat on the Gold Coast hinterland.",
        ["currumbin valley stay", "book currumbin valley hideaway"],
      ),
      gallery: seo(
        "Gallery | Currumbin Valley Hideaway",
        "Explore photos of Currumbin Valley Hideaway — rainforest settings, eco domes, wildlife and peaceful moments in the hinterland.",
        ["currumbin valley hideaway photos", "eco dome gallery"],
      ),
      experiences: seo(
        "Experiences & Nature | Currumbin Valley",
        "Rainforest walks, swimming holes, cafes and hidden gems near Currumbin Valley Hideaway — make the most of your stay.",
        ["currumbin valley experiences", "things to do currumbin valley"],
      ),
      contact: seo(
        "Contact | Currumbin Valley Hideaway",
        "Questions about availability or booking? Contact Currumbin Valley Hideaway — we'd love to help plan your rainforest stay.",
        ["contact currumbin valley hideaway", "book hideaway"],
      ),
      about: seo(
        "About | Currumbin Valley Hideaway",
        "Discover the story behind Currumbin Valley Hideaway — a luxury eco retreat created for rest and reconnection in the rainforest.",
        ["about currumbin valley hideaway"],
      ),
      reviews: seo(
        "Guest Reviews | Currumbin Valley Hideaway",
        "Read why guests love staying at Currumbin Valley Hideaway — peaceful eco accommodation in the Gold Coast hinterland.",
        ["currumbin valley hideaway reviews"],
      ),
      insights: seo(
        "Guides & Insights | Currumbin Valley",
        "Local guides to Currumbin Valley — waterfalls, romantic getaways, weekend escapes and tips for your Hideaway stay.",
        ["currumbin valley guide", "gold coast hinterland blog"],
      ),
      "privacy-policy": seo(
        "Privacy Policy | Currumbin Valley Hideaway",
        "Privacy policy for Currumbin Valley Hideaway bookings and website enquiries.",
        ["cvh privacy"],
      ),
      "terms-conditions": seo(
        "Terms & Conditions | Currumbin Valley Hideaway",
        "Booking and website terms for Currumbin Valley Hideaway.",
        ["cvh terms"],
      ),
      "legal-notice": seo(
        "Legal Notice | Currumbin Valley Hideaway",
        "Legal notices for Currumbin Valley Hideaway website content.",
        ["cvh legal"],
      ),
      "booking-confirmed": seo(
        "Booking Confirmed | Currumbin Valley Hideaway",
        "Your Currumbin Valley Hideaway booking is confirmed. We look forward to welcoming you to the rainforest.",
        ["booking confirmed"],
      ),
      card: seo(
        "Digital Card | Currumbin Valley Hideaway",
        "Currumbin Valley Hideaway digital contact card.",
        ["cvh contact"],
      ),
      "currumbin-valley-guide": seo(
        "Currumbin Valley Guide | Local Tips & Stays",
        "Your guide to Currumbin Valley — nature, food, swimming holes and where to stay at Currumbin Valley Hideaway.",
        ["currumbin valley guide"],
      ),
      "currumbin-eco-village": seo(
        "Currumbin Eco Village | Near the Hideaway",
        "Visit Currumbin Eco Village near Currumbin Valley Hideaway — community, nature and hinterland experiences.",
        ["currumbin eco village"],
      ),
      "currumbin-valley-harvest": seo(
        "Currumbin Valley Harvest | Local Produce",
        "Discover Currumbin Valley Harvest and local produce experiences near your Hideaway stay.",
        ["currumbin valley harvest"],
      ),
      "cougal-cascades": seo(
        "Cougal Cascades | Near Currumbin Valley Hideaway",
        "Visit Cougal Cascades during your Currumbin Valley stay — rainforest walks and waterfalls close to the Hideaway.",
        ["cougal cascades", "currumbin valley waterfalls"],
      ),
      "currumbin-rock-pools": seo(
        "Currumbin Rock Pools | Swimming Near CVH",
        "Find Currumbin rock pools and swimming spots near Currumbin Valley Hideaway for a refreshing nature escape.",
        ["currumbin rock pools"],
      ),
    },
    fallback(slug, title) {
      const clean = decode(title) || slug;
      const unit = slug
        .replace(/^accommodation\//, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (
        /dome|studio|tiny-home|the-shed|garden-studio|private-studio|canopy|rainforest|sanctuary|starlight/.test(
          slug,
        )
      ) {
        return seo(
          `${clean} | Currumbin Valley Hideaway`,
          `Stay in ${clean} at Currumbin Valley Hideaway — eco accommodation surrounded by rainforest on the Gold Coast hinterland.`,
          [`${unit.toLowerCase()} currumbin valley`, "currumbin valley hideaway"],
        );
      }
      return seo(
        `${clean} | Currumbin Valley Hideaway`,
        `${clean} — local guides and inspiration for your stay at Currumbin Valley Hideaway on the Gold Coast hinterland.`,
        [clean.toLowerCase(), "currumbin valley"],
      );
    },
  },

  cmslklx6t0001l504ncg97377: {
    brand: "Aëtherra",
    site: seo(
      "Aëtherra | Organic House & Sound Journeys",
      "Where Earth meets sky through sound. Organic House journeys crafted from melody, emotion and natural rhythm by Aëtherra.",
      ["aëtherra", "aetherra", "organic house", "dj aetherra"],
    ),
    pages: {
      home: seo(
        "Aëtherra | Where Earth Meets Sky Through Sound",
        "Organic House journeys crafted from melody, emotion and natural rhythm. Listen to Aëtherra and enquire about bookings.",
        ["aëtherra", "organic house music", "aetherra dj"],
      ),
      music: seo(
        "Music | Aëtherra Soundscapes",
        "Aëtherra music for movement, reflection and emotional space — Organic House releases and featured journeys.",
        ["aëtherra music", "organic house tracks"],
      ),
      mixes: seo(
        "Mixes | Aëtherra DJ Journeys",
        "Listen to Aëtherra mixes — journeys through Organic House, melody and atmosphere.",
        ["aëtherra mixes", "organic house mix"],
      ),
      about: seo(
        "About Aëtherra | Sound & Atmosphere",
        "The story of Aëtherra — where sound becomes atmosphere, and atmosphere becomes emotion.",
        ["about aëtherra", "aetherra artist"],
      ),
      contact: seo(
        "Contact Aëtherra | Bookings & Press",
        "Book Aëtherra for DJ sets, curated events and collaborations. Press and booking enquiries welcome.",
        ["book aëtherra", "aetherra bookings"],
      ),
      "book-aetherra": seo(
        "Book Aëtherra | DJ & Event Bookings",
        "Book Aëtherra for events and curated DJ experiences. Organic House journeys for atmosphere-led spaces.",
        ["book aëtherra dj", "hire organic house dj"],
      ),
      "privacy-policy": seo(
        "Privacy Policy | Aëtherra",
        "Privacy policy for Aëtherra website enquiries and communications.",
        ["aëtherra privacy"],
      ),
      "terms-conditions": seo(
        "Terms & Conditions | Aëtherra",
        "Website terms and conditions for Aëtherra online content and bookings.",
        ["aëtherra terms"],
      ),
      "copyright-notice": seo(
        "Copyright Notice | Aëtherra",
        "Copyright and usage notice for Aëtherra music, mixes and brand assets.",
        ["aëtherra copyright"],
      ),
      "artist-disclaimer": seo(
        "Artist Disclaimer | Aëtherra",
        "Artist disclaimer for Aëtherra performances, content and collaborations.",
        ["aëtherra disclaimer"],
      ),
      card: seo(
        "Digital Card | Aëtherra",
        "Aëtherra digital contact card for bookings and collaborations.",
        ["aëtherra contact"],
      ),
    },
    fallback(slug, title) {
      const clean = decode(title) || slug;
      return seo(
        `${clean} | Aëtherra`,
        `${clean} — Organic House sound journeys from Aëtherra.`,
        [clean.toLowerCase(), "aëtherra"],
      );
    },
  },

  cmskwz6zv0001l404cfi1wal4: {
    brand: "DigitalGate",
    site: seo(
      "DigitalGate | The Gateway to Your Digital World™",
      "AI-powered Business Operating Platform. Connect website, CRM, AI, automation and industry apps in one intelligent system.",
      [
        "digitalgate",
        "business operating platform",
        "ai business platform",
        "crm automation australia",
      ],
    ),
    pages: {
      home: seo(
        "DigitalGate | The Gateway to Your Digital World™",
        "AI-powered Business Operating Platform. Connect your business, customers, AI, automation and digital systems. One login. One source of truth.",
        ["digitalgate", "business operating platform", "ai platform australia"],
      ),
      pricing: seo(
        "Pricing | DigitalGate Business Platform",
        "Platform from $99/mo. Industry Apps $99 with 1 Template included; extra Templates +$29. Website Build from $1,997.",
        ["digitalgate pricing", "industry app pricing", "website build"],
      ),
      insights: seo(
        "Insights | DigitalGate",
        "Practical thinking on AI visibility, search, lead generation and connected business from DigitalGate.",
        ["digitalgate insights", "ai visibility blog"],
      ),
      about: seo(
        "About DigitalGate | Ben Roe, Founder",
        "DigitalGate is an AI-powered Business Operating Platform founded by Ben Roe — connecting websites, CRM, AI and industry systems.",
        ["about digitalgate", "ben roe digitalgate"],
      ),
      "privacy-policy": seo(
        "Privacy Policy | DigitalGate",
        "How DigitalGate collects, uses and protects personal information for visitors, Platform users and Professional Services.",
        ["digitalgate privacy"],
      ),
      "terms-conditions": seo(
        "Terms & Conditions | DigitalGate",
        "Terms for DigitalGate Platform subscriptions, Apps, Founding Customer Programme and Professional Services.",
        ["digitalgate terms"],
      ),
      contact: seo(
        "Contact DigitalGate | Founding Customers",
        "Join the DigitalGate Founding Customer Programme. Book a discovery session for the AI-powered Business Operating Platform.",
        ["contact digitalgate", "founding customers"],
      ),
      "founding-customers": seo(
        "Founding 10 Programme | DigitalGate",
        "Founding 10 — limited access for the first 10 businesses at standard published pricing. Early access, priority onboarding and influence. Open now.",
        ["digitalgate founding customers", "founding 10"],
      ),
      apps: seo(
        "DigitalGate Apps | Core, Infrastructure, Industry, Growth",
        "Apps on an operating system — Core, Infrastructure, Industry Apps with Templates, and Growth. Not a tool catalogue.",
        ["digitalgate apps", "industry apps", "property industry app"],
      ),
      "apps/industry": seo(
        "Industry Apps | DigitalGate",
        "Twelve Industry Apps. Property and Services available. Templates specialise each vertical — 1 included, +$29 each extra.",
        ["industry apps", "property app", "hospitality accommodation"],
      ),
      "apps/industry/property": seo(
        "Property Industry App | DigitalGate",
        "One Property Industry App ($99/mo). Real Estate Template included. Add PM, Commercial and more at +$29/mo each.",
        ["property industry app", "real estate template", "digitalgate property"],
      ),
      "apps/industry/hospitality-accommodation": seo(
        "Hospitality & Accommodation | DigitalGate",
        "Hospitality & Accommodation Industry App — short-stay and venues. Accommodation is a Template here, not under Property.",
        ["hospitality app", "accommodation template", "short stay crm"],
      ),
      "apps/industry/real-estate": seo(
        "Real Estate Template | Property | DigitalGate",
        "Real Estate Template under the Property Industry App — vendors, buyers, appraisals and listings on DigitalGate.",
        ["real estate template", "property crm", "vendor pipeline"],
      ),
      "apps/industry/services": seo(
        "Services Industry App | DigitalGate",
        "Services Industry App for trades and field work — one App with Templates like Cleaning, Electrical and Maintenance.",
        ["services industry app", "trades crm", "digitalgate services"],
      ),
      "apps/industry/accommodation": seo(
        "Accommodation Template | Hospitality | DigitalGate",
        "Short-Stay / Accommodation Template under Hospitality & Accommodation — bookings, guests and operations.",
        ["accommodation template", "short stay", "hospitality crm"],
      ),
      "appraisal-magnet-system": seo(
        "Appraisal Magnet System™ | DigitalGate",
        "Vendor acquisition system on the DigitalGate Property Industry App — appraisal magnets that feed your pipeline.",
        ["appraisal magnet", "vendor leads", "real estate acquisition"],
      ),
      "listing-pipeline-framework": seo(
        "Listing Pipeline Framework™ | DigitalGate",
        "Listing conversion methodology on the Property Industry App — from appraisal to listing inside DigitalGate.",
        ["listing pipeline", "real estate listing", "digitalgate framework"],
      ),
      "vendor-velocity-system": seo(
        "Vendor Velocity System™ | DigitalGate",
        "Improve response time and pipeline movement for vendor opportunities inside the Property Industry App.",
        ["vendor velocity", "real estate follow up", "pipeline speed"],
      ),
      "ai-visibility-framework": seo(
        "AI Visibility Framework™ | DigitalGate",
        "How businesses get found and recommended in Google and AI search — the DigitalGate AI Visibility Framework™.",
        ["ai visibility framework", "ai search", "digitalgate"],
      ),
      "strategy-session": seo(
        "Platform Consultation | DigitalGate",
        "Book a DigitalGate platform consultation — map your systems, apps and roadmap to one intelligent operating platform.",
        ["digitalgate consultation", "platform strategy session"],
      ),
      discover: seo(
        "AI Platform Discovery | DigitalGate",
        "Start AI Platform Discovery with DigitalGate — maturity snapshot, recommended tier and suggested apps for your business.",
        ["ai platform discovery", "digitalgate discover"],
      ),
      beta: seo(
        "Beta Programme | DigitalGate",
        "Join the DigitalGate beta programme and help shape the AI-powered Business Operating Platform.",
        ["digitalgate beta"],
      ),
      onboarding: seo(
        "Client Onboarding | DigitalGate",
        "DigitalGate client onboarding — get your organisation, apps and website studio set up for launch.",
        ["digitalgate onboarding"],
      ),
      "founding-customer-terms": seo(
        "Founding Customer Terms | DigitalGate",
        "Terms and conditions for the DigitalGate Founding Customer Programme.",
        ["founding customer terms"],
      ),
      "legal-notice": seo(
        "Legal Notice | DigitalGate",
        "Legal notices for DigitalGate websites and platform content.",
        ["digitalgate legal"],
      ),
      card: seo(
        "Digital Business Card | DigitalGate",
        "DigitalGate digital business card and contact details.",
        ["digitalgate contact card"],
      ),
    },
    fallback(slug, title) {
      const clean = decode(title) || slug;
      return seo(
        `${clip(clean, 48)} | DigitalGate`,
        `${clean} — practical guidance from DigitalGate on AI search, visibility and modern business platforms.`,
        [clean.toLowerCase().slice(0, 40), "digitalgate"],
      );
    },
  },
};

async function main() {
  const summary = [];
  for (const [websiteId, plan] of Object.entries(PLANS)) {
    await prisma.website.update({
      where: { id: websiteId },
      data: { seo: plan.site },
    });
    const pages = await prisma.websitePage.findMany({
      where: { websiteId },
      select: { id: true, slug: true, title: true, seo: true },
    });
    let updated = 0;
    for (const page of pages) {
      const next = plan.pages[page.slug] || plan.fallback(page.slug, page.title);
      await prisma.websitePage.update({
        where: { id: page.id },
        data: { seo: next },
      });
      updated += 1;
    }
    summary.push({ websiteId, brand: plan.brand, pages: updated });
  }
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
