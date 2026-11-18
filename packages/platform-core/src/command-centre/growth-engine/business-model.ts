import type { PresenceAuditResult } from "./presence-audit";

export type BusinessModelType =
  | "music_artist"
  | "real_estate_agency"
  | "accommodation"
  | "finance"
  | "trades_services"
  | "retail_ecommerce"
  | "technology_marketing"
  | "general";

export type BusinessModelAssessment = {
  type: BusinessModelType;
  subtype: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  offering: string;
  audiences: string[];
  marketOrientation: "local" | "national" | "international" | "mixed" | "unknown";
  conversionPaths: string[];
  discoveryChannels: string[];
  successIndicators: string[];
  isLocationBased: boolean;
};

type Probes = PresenceAuditResult["probes"];
type Input = { businessName?: string; industry?: string | null; location?: string | null; probes: Probes };

const pageText = (probes: Probes) => [
  probes.title || "",
  ...probes.pages.map((page) => `${page.url} ${page.title || ""}`),
].join(" ").toLowerCase();

export function inferBusinessModel(input: Input): BusinessModelAssessment {
  const industry = (input.industry || "").toLowerCase();
  const text = `${input.businessName || ""} ${industry} ${pageText(input.probes)}`.toLowerCase();
  const pages = input.probes.pages;
  const bookingPage = pages.some((page) => /book|event|dj|hire|enquir|contact/i.test(`${page.url} ${page.title || ""}`));
  const contactForm = pages.some((page) => page.hasForm) || input.probes.hasForm;
  const booking = pages.some((page) => page.hasBookingLanguage) || bookingPage;
  const pricing = pages.some((page) => page.hasPricingLanguage);
  const trial = pages.some((page) => page.hasTrialLanguage);
  const servicePage = pages.some((page) => page.hasServiceLanguage);
  const socialCount = Object.values(input.probes.socialProfiles).filter(Boolean).length;
  const music = /music|artist|musician|dj|producer|band|singer|creative|entertainment|record label/.test(`${industry} ${text}`)
    || /\/dj|booking|mixes|releases|epk|events/.test(text);
  const realEstate = /real estate|realty|property agency|realtor|buyers agent/.test(`${industry} ${text}`);
  const accommodation = /accommodation|hospitality|hotel|motel|resort|retreat|stay|guest|airbnb/.test(`${industry} ${text}`);
  const finance = /finance|mortgage|lending|accounting|insurance|wealth|capital|broking/.test(`${industry} ${text}`);
  const trades = /trade|plumb|electr|build|hvac|landscap|paint|roof|clean|maintenance|service area/.test(`${industry} ${text}`);
  const retail = /retail|ecommerce|e-commerce|shop|store|product|wholesale/.test(`${industry} ${text}`);
  const technology = /technology|software|marketing|digital|web|saas|consult|it services/.test(`${industry} ${text}`);

  const evidence: string[] = [];
  if (music) evidence.push("Industry and page language indicate a music/creative offering.");
  if (realEstate) evidence.push("Industry language indicates a real-estate agency model.");
  if (accommodation) evidence.push("Industry and page language indicate accommodation.");
  if (finance) evidence.push("Industry language indicates a finance/advice model.");
  if (trades) evidence.push("Industry and page language indicate a service-area business.");
  if (retail) evidence.push("Industry and page language indicate product commerce.");
  if (technology) evidence.push("Industry language indicates technology or marketing services.");
  if (bookingPage) evidence.push("A booking, event or contact-oriented page was observed.");
  if (contactForm) evidence.push("An enquiry form was observed on the website.");
  if (pricing) evidence.push("Pricing or package language was observed.");
  if (trial) evidence.push("Trial, demo or get-started language was observed.");
  if (socialCount) evidence.push(`${socialCount} public social profiles were linked from the website.`);
  if (!evidence.length) evidence.push("Only limited public website signals were available.");

  let type: BusinessModelType = "general";
  if (music) type = "music_artist";
  else if (realEstate) type = "real_estate_agency";
  else if (accommodation) type = "accommodation";
  else if (finance) type = "finance";
  else if (trades) type = "trades_services";
  else if (retail) type = "retail_ecommerce";
  else if (technology) type = "technology_marketing";

  const config: Record<BusinessModelType, { subtype: string; offering: string; audiences: string[]; market: BusinessModelAssessment["marketOrientation"]; conversion: string[]; discovery: string[]; outcomes: string[]; local: boolean }> = {
    music_artist: { subtype: "DJ / recording artist / creative performer", offering: "Music experiences, releases, mixes and event bookings", audiences: ["Event promoters", "Venues", "Music listeners", "Creative collaborators"], market: input.location ? "mixed" : "international", conversion: ["Event booking enquiry", "Contact form", "Social/artist profile connection"], discovery: ["Artist profiles", "Music platforms", "Social discovery", "Referrals and promoter relationships"], outcomes: ["Qualified booking enquiries", "Artist-profile consistency", "Release and audience discovery", "Repeat promoter relationships"], local: false },
    real_estate_agency: { subtype: "Residential or commercial agency", offering: "Property sales, appraisals, buyer representation and local advice", audiences: ["Property sellers", "Buyers", "Investors", "Local residents"], market: "local", conversion: ["Appraisal request", "Property enquiry", "Phone or email contact"], discovery: ["Local search", "Listings", "Referrals", "Google Business Profile"], outcomes: ["Appraisal enquiries", "Qualified buyer/seller conversations", "Listing engagement"], local: true },
    accommodation: { subtype: "Hotel, retreat, lodge or short-stay operator", offering: "Guest stays and direct booking experiences", audiences: ["Leisure guests", "Couples", "Travellers", "Event or retreat guests"], market: "mixed", conversion: ["Direct booking", "Availability enquiry", "Contact form"], discovery: ["Google/local search", "OTA listings", "Reviews", "Social content"], outcomes: ["Direct bookings", "Qualified guest enquiries", "Repeat stays"], local: true },
    finance: { subtype: "Broker, adviser or finance practice", offering: "Qualified financial advice or finance facilitation", audiences: ["Borrowers", "Investors", "Business owners", "Referral partners"], market: "national", conversion: ["Qualified consultation", "Enquiry form", "Phone contact"], discovery: ["Trust-led search", "Referrals", "Credentials", "Professional networks"], outcomes: ["Qualified consultations", "Compliant enquiries", "Referral conversion"], local: false },
    trades_services: { subtype: "Service-area trade or maintenance business", offering: "Service delivery, quotations and scheduled work", audiences: ["Homeowners", "Property managers", "Local businesses"], market: "local", conversion: ["Call", "Quote request", "Booking or scheduling"], discovery: ["Local search", "Google Business Profile", "Referrals", "Service-area pages"], outcomes: ["Qualified quote requests", "Booked jobs", "Response-time consistency"], local: true },
    retail_ecommerce: { subtype: "Product retailer or commerce business", offering: "Products and purchase experiences", audiences: ["Online shoppers", "Repeat customers", "Wholesale buyers"], market: "national", conversion: ["Product purchase", "Cart/checkout", "Concierge enquiry"], discovery: ["Search", "Marketplaces", "Social content", "Email"], outcomes: ["Completed purchases", "Repeat purchase", "Product discovery"], local: false },
    technology_marketing: { subtype: "Technology, software or marketing services", offering: "Digital services, platforms or growth programmes", audiences: ["Business owners", "Marketing leaders", "Operations teams"], market: "national", conversion: ["Demo or trial", "Discovery call", "Proposal or subscription"], discovery: ["Search", "Referrals", "Thought leadership", "Partner networks"], outcomes: ["Qualified demos", "Trial-to-paid conversion", "Retained subscriptions"], local: false },
    general: { subtype: "General business", offering: "Products or services described by the business", audiences: ["Prospective customers"], market: input.location ? "local" : "unknown", conversion: ["Enquiry", "Contact"], discovery: ["Search", "Referrals", "Social"], outcomes: ["Qualified enquiries"], local: Boolean(input.location) },
  };
  const selected = config[type];
  const confidence: BusinessModelAssessment["confidence"] = type === "general" ? "low" : evidence.length >= 3 && (booking || servicePage || pricing || socialCount > 0) ? "high" : "medium";
  return { type, subtype: selected.subtype, confidence, evidence: evidence.slice(0, 6), offering: selected.offering, audiences: selected.audiences, marketOrientation: selected.market, conversionPaths: selected.conversion, discoveryChannels: selected.discovery, successIndicators: selected.outcomes, isLocationBased: selected.local };
}
