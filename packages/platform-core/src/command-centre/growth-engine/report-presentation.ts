import { INDUSTRY_TAXONOMY, type IndustryGroup } from "../../apps/industry-taxonomy";

export type ReportIndustryKey = "real_estate" | "hospitality_accommodation" | "finance" | "trades_services" | "retail_ecommerce" | "music_creative" | "music_artist" | "technology_marketing" | "general";
export type ReportEvidenceStatus = "observed" | "confirmed_gap" | "limited" | "unavailable";

export type ReportPresentationFinding = {
  title?: string;
  detail?: string;
  observed?: string;
  interpretation?: string;
  recommendedAction?: string;
  category?: string;
  domain?: string;
  severity?: string;
  evidenceStatus?: ReportEvidenceStatus;
  confidence?: "high" | "medium" | "low";
  source?: string;
  observedAt?: string;
};

export type ReportPriority = {
  title: string;
  meaning: string;
  action: string;
  evidenceStatus: ReportEvidenceStatus;
  evidenceLabel: string;
  source: string;
  freshness: string | null;
  framework: boolean;
};

export type ReportPillar = {
  key: "website" | "seo" | "ai" | "reputation" | "conversion" | "growth";
  label: string;
  description: string;
  value: number | null;
};

export type ReportPack = {
  key: ReportIndustryKey;
  label: string;
  canonicalGroup: string;
  executiveFocus: string;
  fallbackPriorities: readonly { title: string; meaning: string; action: string }[];
  roadmap: readonly { period: string; title: string; action: string }[];
  fallbackInsights: readonly { title: string; detail: string; recommendedAction: string }[];
};

const packs: Record<ReportIndustryKey, ReportPack> = {
  real_estate: {
    key: "real_estate",
    label: "Real Estate",
    canonicalGroup: "Property",
    executiveFocus: "local trust, appraisal intent and a measurable owner-follow-up path",
    fallbackPriorities: [
      { title: "Make appraisal intent a clear path", meaning: "Seller intent should move from local research to one obvious next step.", action: "Review the highest-intent seller pages and establish one appraisal action with a response expectation." },
      { title: "Build durable local authority", meaning: "Local relevance should be evidenced, not merely asserted.", action: "Create a repeatable suburb proof structure with recent evidence and clear coverage." },
      { title: "Connect enquiry to pipeline", meaning: "Listing and appraisal interest should become a visible relationship, not a lost anonymous visit.", action: "Connect enquiry capture to owner follow-up and commercial reporting." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the seller signal", action: "Create one appraisal path, one primary action and a visible response expectation." },
      { period: "31–60 days", title: "Prove the local position", action: "Publish durable local evidence and connect discovery to enquiry." },
      { period: "61–90 days", title: "Systemise owner follow-up", action: "Make owner follow-up, ownership and commercial results measurable." },
    ],
    fallbackInsights: [
      { title: "Appraisal pathway", detail: "The seller journey should make the appraisal next step explicit and evidence-backed.", recommendedAction: "Review the appraisal path and response expectation." },
      { title: "Local authority", detail: "Suburb relevance is strongest when supported by durable local evidence.", recommendedAction: "Build a repeatable local proof structure." },
      { title: "Listing to pipeline", detail: "Listing interest becomes commercially useful when it enters a measured follow-up path.", recommendedAction: "Connect listing interest to CRM follow-up." },
    ],
  },
  hospitality_accommodation: {
    key: "hospitality_accommodation",
    label: "Hospitality & Accommodation",
    canonicalGroup: "Hospitality & Accommodation",
    executiveFocus: "direct-booking clarity, guest trust and a measurable enquiry path",
    fallbackPriorities: [
      { title: "Make direct booking the obvious path", meaning: "A guest should not have to choose between competing secondary actions.", action: "Review the booking journey, availability prominence and competing links." },
      { title: "Make guest evidence easy to verify", meaning: "Reviews, amenities and location proof should support the booking decision.", action: "Surface verified guest proof and the information needed to choose with confidence." },
      { title: "Connect guest intent to follow-up", meaning: "An enquiry or booking intent should become a relationship record.", action: "Connect guest enquiries to a measured response and follow-up path." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the booking signal", action: "Make availability and the primary booking action visually dominant." },
      { period: "31–60 days", title: "Strengthen guest proof", action: "Improve review, amenity and location evidence across the decision path." },
      { period: "61–90 days", title: "Systemise guest follow-up", action: "Connect enquiries, booking intent and repeat-guest communication to measurable operations." },
    ],
    fallbackInsights: [
      { title: "Direct booking journey", detail: "The path from property interest to a direct booking should be unambiguous.", recommendedAction: "Review booking prominence and competing actions." },
      { title: "Guest trust evidence", detail: "Verified reviews and accurate amenity information reduce decision friction.", recommendedAction: "Strengthen visible guest proof." },
    ],
  },
  finance: {
    key: "finance",
    label: "Finance",
    canonicalGroup: "Finance",
    executiveFocus: "trust, suitability evidence and a qualified conversation path",
    fallbackPriorities: [
      { title: "Make the advice audience explicit", meaning: "A visitor should immediately understand who the service is for and what decision it supports.", action: "Clarify the audience, advice category and next step in the primary page hierarchy." },
      { title: "Make trust and process verifiable", meaning: "Credentials, process and client safeguards should be easy to check.", action: "Add verifiable credential, process and responsible-practice evidence." },
      { title: "Create a qualified conversation path", meaning: "The next step should be a privacy-aware conversation, not an unexplained form.", action: "Design a clear qualification path with an explicit response expectation." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify suitability", action: "Make audience, advice category and the conversation next step explicit." },
      { period: "31–60 days", title: "Strengthen trust proof", action: "Surface credentials, process and responsible-practice evidence." },
      { period: "61–90 days", title: "Systemise qualification", action: "Connect qualified conversations to CRM follow-up and outcome reporting." },
    ],
    fallbackInsights: [
      { title: "Trust and suitability evidence", detail: "Professional trust is stronger when the process, audience and safeguards are visible.", recommendedAction: "Make suitability and process evidence verifiable." },
      { title: "Qualified conversation", detail: "A clear conversation path reduces ambiguity around the next step.", recommendedAction: "Review the qualification and response path." },
    ],
  },
  trades_services: {
    key: "trades_services",
    label: "Trades & Services",
    canonicalGroup: "Services",
    executiveFocus: "service-area clarity, urgent response and quote follow-up",
    fallbackPriorities: [
      { title: "Separate urgent and planned work", meaning: "Urgent response and planned quotes need different paths and expectations.", action: "Clarify urgent response, planned quoting and the booking action." },
      { title: "Make service coverage verifiable", meaning: "Service-area claims should be supported by clear coverage and response information.", action: "Publish service-area, response-time and relevant proof content." },
      { title: "Connect quotes to follow-up", meaning: "A quote request should enter a visible follow-up process.", action: "Connect quote requests to response ownership and follow-up." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the service signal", action: "Separate urgent and planned work with one clear booking path." },
      { period: "31–60 days", title: "Prove service coverage", action: "Publish service-area, response and relevant proof content." },
      { period: "61–90 days", title: "Systemise quote follow-up", action: "Connect quote requests to measurable follow-up and completed work." },
    ],
    fallbackInsights: [
      { title: "Service-area lead generation", detail: "Coverage, response and booking should read as one service promise.", recommendedAction: "Review service-area and response evidence." },
      { title: "Quote follow-up", detail: "Quote interest is most valuable when it enters a measured follow-up path.", recommendedAction: "Connect quote requests to follow-up." },
    ],
  },
  retail_ecommerce: {
    key: "retail_ecommerce",
    label: "Retail & E-commerce",
    canonicalGroup: "Retail & Commerce",
    executiveFocus: "product discovery, purchase confidence and consented follow-up",
    fallbackPriorities: [
      { title: "Clarify the product discovery path", meaning: "A shopper should quickly understand the category, audience and purchase path.", action: "Clarify category hierarchy, product discovery and the primary purchase action." },
      { title: "Make purchase confidence visible", meaning: "Delivery, returns and verified reviews should sit near the purchase decision.", action: "Surface accurate delivery, returns and review evidence without inventing outcomes." },
      { title: "Connect consent to follow-up", meaning: "Browse and cart intent should only be used through an approved consent path.", action: "Connect consented intent to a measured follow-up workflow." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify product discovery", action: "Clarify category hierarchy and the primary purchase action." },
      { period: "31–60 days", title: "Strengthen purchase confidence", action: "Surface accurate delivery, returns and verified review evidence." },
      { period: "61–90 days", title: "Systemise consented follow-up", action: "Connect consented intent to measurable lifecycle follow-up." },
    ],
    fallbackInsights: [
      { title: "Product discovery to purchase", detail: "A clear category and purchase path reduces avoidable decision friction.", recommendedAction: "Review category hierarchy and purchase prominence." },
      { title: "Purchase confidence", detail: "Delivery, returns and verified reviews should support the purchase decision.", recommendedAction: "Strengthen purchase evidence." },
    ],
  },
  music_artist: {
    key: "music_artist",
    label: "Music & Artists",
    canonicalGroup: "Creator & Media",
    executiveFocus: "artist identity, music discovery and a credible booking or collaboration path",
    fallbackPriorities: [
      { title: "Make artist identity unmistakable", meaning: "A promoter, collaborator or listener should understand the artist, genre and offer quickly.", action: "Clarify the artist positioning, music evidence and the primary next step in the page hierarchy." },
      { title: "Make booking easy to verify", meaning: "Booking interest should move into a clear enquiry with a response expectation.", action: "Create a visible booking/event-enquiry route with relevant context and availability expectations." },
      { title: "Strengthen artist discovery", meaning: "Releases, mixes and official profiles should support a coherent discovery journey.", action: "Connect artist profiles, releases or mixes and structured artist information." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the artist signal", action: "Make identity, genre, music evidence and booking action explicit." },
      { period: "31–60 days", title: "Strengthen discovery proof", action: "Connect releases, mixes and official profiles into one journey." },
      { period: "61–90 days", title: "Systemise booking follow-up", action: "Connect promoter enquiries to a measured response and follow-up path." },
    ],
    fallbackInsights: [
      { title: "Artist identity", detail: "Music discovery starts with a coherent artist entity, genre and body of work.", recommendedAction: "Strengthen artist identity and profile consistency." },
      { title: "Booking pathway", detail: "Promoters need a credible, direct route to discuss an event or collaboration.", recommendedAction: "Create a clear booking and response path." },
    ],
  },
  music_creative: {
    key: "music_creative",
    label: "Music & Creative Industries",
    canonicalGroup: "Creator & Media",
    executiveFocus: "offer clarity, portfolio proof and a booking or licensing path",
    fallbackPriorities: [
      { title: "Make the creative offer explicit", meaning: "The audience, offer and desired outcome should be clear immediately.", action: "Name the creative offer, audience and outcome in the primary page hierarchy." },
      { title: "Make portfolio and audience proof coherent", meaning: "Work, audience evidence and booking information should support one decision.", action: "Create one portfolio-to-booking pathway with verifiable proof." },
      { title: "Connect consented audience interest", meaning: "Audience interest should move into an approved follow-up or booking path.", action: "Connect consented audience interest to booking or release follow-up." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the creative signal", action: "Name the offer, audience and primary outcome." },
      { period: "31–60 days", title: "Strengthen portfolio proof", action: "Create one coherent portfolio-to-booking decision path." },
      { period: "61–90 days", title: "Systemise audience follow-up", action: "Connect consented interest to bookings, releases and measurable relationships." },
    ],
    fallbackInsights: [
      { title: "Audience to booking pathway", detail: "Discovery, proof and the booking or licensing next step should read as one journey.", recommendedAction: "Review the portfolio-to-booking path." },
      { title: "Creative proof", detail: "Audience and work evidence should be easy to verify without inflated claims.", recommendedAction: "Strengthen verifiable portfolio evidence." },
    ],
  },
  technology_marketing: {
    key: "technology_marketing",
    label: "Business Technology & Marketing",
    canonicalGroup: "Technology & Marketing",
    executiveFocus: "clear offer, credible proof and a measurable conversion path",
    fallbackPriorities: [
      { title: "Make the commercial offer concrete", meaning: "A buyer should understand the service, who it is for and the outcome without guessing.", action: "Clarify the service architecture, ideal customer and primary commercial outcome in the website hierarchy." },
      { title: "Make proof easy to verify", meaning: "Technical capability is more persuasive when supported by evidence a buyer can inspect.", action: "Surface relevant work, process, credentials and measurable proof without inventing outcomes." },
      { title: "Connect interest to a qualified conversation", meaning: "A technology or marketing buyer needs a clear next step and a reason to take it.", action: "Create one qualified conversation path with an explicit response expectation." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Sharpen the offer", action: "Clarify service, audience and the primary commercial next step." },
      { period: "31–60 days", title: "Strengthen proof", action: "Make relevant work, process and trust evidence easy to verify." },
      { period: "61–90 days", title: "Systemise qualification", action: "Connect qualified interest to CRM follow-up and measurable outcomes." },
    ],
    fallbackInsights: [
      { title: "Offer clarity", detail: "Technology and marketing services are easier to buy when the audience, scope and outcome are explicit.", recommendedAction: "Review the service architecture and primary offer." },
      { title: "Proof and qualification", detail: "Credible proof should reduce buyer uncertainty before a sales conversation.", recommendedAction: "Connect proof to a qualified next step." },
    ],
  },
  general: {
    key: "general",
    label: "General business",
    canonicalGroup: "General",
    executiveFocus: "discoverability, trust and a clear measured next step",
    fallbackPriorities: [
      { title: "Clarify the primary offer", meaning: "A visitor should understand the business, audience and next step quickly.", action: "Clarify the primary offer, audience and next step in the page hierarchy." },
      { title: "Make trust evidence visible", meaning: "Relevant proof should support the commercial decision.", action: "Surface verifiable trust evidence without inventing claims." },
      { title: "Connect interest to follow-up", meaning: "A visit or enquiry should have a clear, measurable next step.", action: "Connect enquiry intent to a defined response and follow-up path." },
    ],
    roadmap: [
      { period: "0–30 days", title: "Clarify the signal", action: "Make the primary offer and next step explicit." },
      { period: "31–60 days", title: "Strengthen trust and discovery", action: "Improve relevant proof and discoverability." },
      { period: "61–90 days", title: "Systemise follow-up", action: "Connect enquiry intent to measurable follow-up." },
    ],
    fallbackInsights: [
      { title: "Discoverability and trust", detail: "A clear offer and visible proof help a prospect decide whether to continue.", recommendedAction: "Review the primary offer and trust evidence." },
      { title: "Measured next step", detail: "A defined next step makes commercial intent observable.", recommendedAction: "Clarify and measure the enquiry path." },
    ],
  },
};

const groupToKey: Record<string, ReportIndustryKey> = {
  property: "real_estate",
  finance: "finance",
  services: "trades_services",
  "accommodation-hospitality": "hospitality_accommodation",
  "retail-commerce": "retail_ecommerce",
  "creator-media": "music_creative",
};

function normalise(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalGroup(industry?: string | null): IndustryGroup | undefined {
  const value = normalise(industry);
  if (!value) return undefined;
  return INDUSTRY_TAXONOMY.find((group) =>
    normalise(group.name) === value ||
    normalise(group.id) === value ||
    group.subIndustries.some((sub) => normalise(sub.name) === value || normalise(sub.id) === value)
  );
}

export function resolveReportIndustry(input: { industry?: string | null; industryPack?: string | null; businessModel?: { type?: string } | null }): { key: ReportIndustryKey; pack: ReportPack; canonicalGroup: IndustryGroup | undefined } {
  const modelKey: ReportIndustryKey | undefined = input.businessModel?.type === "music_artist" ? "music_artist"
    : input.businessModel?.type === "real_estate_agency" ? "real_estate"
      : input.businessModel?.type === "accommodation" ? "hospitality_accommodation"
        : input.businessModel?.type === "finance" ? "finance"
          : input.businessModel?.type === "trades_services" ? "trades_services"
            : input.businessModel?.type === "retail_ecommerce" ? "retail_ecommerce"
              : input.businessModel?.type === "technology_marketing" ? "technology_marketing" : undefined;
  const group = canonicalGroup(input.industry);
  const existing = normalise(input.industryPack);
  const existingKey = existing === "real estate" ? "real_estate"
    : existing === "accommodation" ? "hospitality_accommodation"
      : existing === "trades" ? "trades_services" : undefined;
  const value = normalise(input.industry);
  const keywordKey: ReportIndustryKey | undefined =
    // Finance before property: "Property Finance" is a finance business, not an agency.
    /(?:finance|mortgage|lending|accounting|insurance|wealth|capital|broking)/.test(value) ? "finance"
      : /(?:hospitality|accommodation|hotel|motel|resort|tourism|venue|restaurant|cafe|bar)/.test(value) ? "hospitality_accommodation"
        : /(?:real estate|realtor|buyers agency|realty|property (?:agency|management|group|sales))/.test(value) ? "real_estate"
          : /(?:trade|plumb|electr|build|hvac|landscap|paint|clean|maintenance|service area)/.test(value) ? "trades_services"
            : /(?:retail|commerce|ecommerce|e commerce|shop|store|wholesale|product)/.test(value) ? "retail_ecommerce"
              : /(?:music|artist|creative|media|publish|production|influencer|content)/.test(value) ? "music_creative"
        : /(?:technology|software|marketing|digital|web|saas|it |information technology|consult)/.test(value) ? "technology_marketing" : undefined;
  const key = modelKey ?? existingKey ?? (group ? groupToKey[group.id] : undefined) ?? keywordKey ?? "general";
  return { key, pack: packs[key], canonicalGroup: group ?? INDUSTRY_TAXONOMY.find((candidate) => candidate.name === packs[key].canonicalGroup) };
}

export function evidenceStatusLabel(status: ReportEvidenceStatus): string {
  return status === "observed" ? "Observed" : status === "confirmed_gap" ? "Confirmed gap" : status === "limited" ? "Limited evidence" : "Unavailable";
}

export function evidenceForFinding(finding: ReportPresentationFinding, auditedAt?: Date | string | null): { status: ReportEvidenceStatus; source: string; freshness: string | null } {
  const text = `${finding.observed ?? ""} ${finding.detail ?? ""} ${finding.interpretation ?? ""}`.toLowerCase();
  const hasEvidence = Boolean(finding.observed || finding.detail);
  const explicit = finding.evidenceStatus;
  const absence = /(?:^|\b)(?:no|not|without|lacks?|missing|absent|only\s+\d+)\b|not (?:observed|detected|assessed|present)|unavailable|unknown/.test(text);
  const status: ReportEvidenceStatus = explicit ?? (!hasEvidence ? "unavailable"
    : finding.confidence === "low" ? "limited"
      : absence ? "confirmed_gap" : "observed");
  const source = finding.source || (finding.domain ? `${finding.domain.replace(/_/g, " ")} observation` : "DigitalGate audit observation");
  const freshness = finding.observedAt ?? (auditedAt ? new Date(auditedAt).toISOString() : null);
  return { status, source, freshness };
}

export function buildReportPillars(audit: { websiteHealth?: number | null; seoScore?: number | null; aiVisibility?: number | null } | null | undefined, scorecard: Record<string, unknown>): ReportPillar[] {
  const value = (key: string): number | null => typeof scorecard[key] === "number" && Number.isFinite(scorecard[key]) ? scorecard[key] as number : null;
  return [
    { key: "website", label: "Website Health", description: "Technical and on-page foundations", value: audit?.websiteHealth ?? null },
    { key: "seo", label: "SEO", description: "Organic search foundations", value: audit?.seoScore ?? null },
    { key: "ai", label: "AI Discoverability Readiness", description: "Technical readiness only; not an observed AI search ranking", value: audit?.aiVisibility ?? null },
    { key: "reputation", label: "Reputation", description: "Public review and trust signals", value: value("reputation") },
    { key: "conversion", label: "Conversion", description: "How clearly interest becomes an enquiry", value: value("conversionReadiness") },
    { key: "growth", label: "Growth signals", description: "Observable public growth infrastructure and conversion signals; not demand", value: value("growthSignals") },
  ];
}

export function commercialHeadlineFor(finding: ReportPresentationFinding): string {
  const title = (finding.title || "").toLowerCase();
  if (/analytics|tracking/.test(title)) return "Verify analytics and conversion tracking coverage";
  if (/structured data|schema/.test(title)) return "Help Google and AI platforms better understand your business";
  if (/h1|heading|primary page topic/.test(title)) return "Make your primary offer immediately clear";
  if (/primary action|call.to.action|cta|enquir/.test(title)) return "Turn interest into a clear next step";
  if (/open graph|social sharing/.test(title)) return "Make shared links present your business professionally";
  if (/review|reputation/.test(title)) return "Give buyers more confidence before they enquire";
  if (/form|lead capture/.test(title)) return "Make it easier for interested buyers to raise their hand";
  if (/local|suburb|service.area/.test(title)) return "Make your local relevance easier to verify";
  if (/speed|performance/.test(title)) return "Make the experience faster and easier to use";
  if (/accessib|mobile/.test(title)) return "Make the experience work for more visitors";
  if (/missing|not detected|no .*detected/.test(title)) return "Close a visible gap in the buying journey";
  return finding.title || "A practical digital opportunity";
}

function isPositiveFinding(finding: ReportPresentationFinding): boolean {
  const text = `${finding.title || ""} ${finding.observed || ""} ${finding.detail || ""}`.trim().toLowerCase();
  if (/(?:^|\b)(?:no|not|without|missing|absent|lacks?)\b/.test(text)) return false;
  return /(?:present|observed|visible|supports?|foundation|linked|detected|available|working)/.test(text);
}

export function buildReportPriorities(findings: ReportPresentationFinding[], pack: ReportPack, auditedAt: Date | string | null): ReportPriority[] {
  const ranked = findings.filter((finding) => !isPositiveFinding(finding)).sort((a, b) => commercialRank(b) - commercialRank(a));
  const priorities = ranked.slice(0, 3).map((finding) => {
    const evidence = evidenceForFinding(finding, auditedAt);
    return {
      title: commercialHeadlineFor(finding),
      meaning: finding.interpretation || finding.detail || finding.observed || "The audit recorded an opportunity to review.",
      action: finding.recommendedAction || "Review this opportunity against the observed evidence.",
      evidenceStatus: evidence.status,
      evidenceLabel: evidenceStatusLabel(evidence.status),
      source: evidence.source,
      freshness: evidence.freshness,
      framework: false,
    };
  });
  for (const fallback of pack.fallbackPriorities) {
    if (priorities.length >= 3) break;
    priorities.push({ ...fallback, evidenceStatus: "unavailable", evidenceLabel: "Framework guidance", source: "Not observed in this snapshot", freshness: null, framework: true });
  }
  return priorities.slice(0, 3);
}

export function buildReportRoadmap(pack: ReportPack, priorities: ReportPriority[]) {
  return pack.roadmap.map((phase, index) => ({
    ...phase,
    title: priorities[index]?.framework === false ? priorities[index].title : phase.title,
    action: priorities[index]?.framework === false ? priorities[index].action : phase.action,
    evidenceLed: priorities[index]?.framework === false,
  }));
}

export function buildReportInsights(provided: unknown, pack: ReportPack) {
  const items = Array.isArray(provided) ? provided.filter((item): item is { title?: string; detail?: string; recommendedAction?: string } => Boolean(item && typeof item === "object")) : [];
  if (items.length) return items.slice(0, 3).map((item) => ({ ...item, framework: true }));
  return pack.fallbackInsights.map((item) => ({ ...item, framework: true }));
}

export function buildExecutiveVerdict(input: {
  businessHealth?: number | null;
  pillars: ReportPillar[];
  priorities: ReportPriority[];
  pack: ReportPack;
  auditedAt?: Date | string | null;
  hasAudit: boolean;
}): string {
  if (!input.hasAudit) return "This snapshot does not contain enough evidence for a commercial verdict. No score or recommendation is inferred.";
  const assessed = input.pillars.filter((pillar) => pillar.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  if (!assessed.length) return "This snapshot does not contain enough assessed public evidence to produce a score, confirm a strength or confirm a weakness. The next step is to complete evidence collection before drawing a commercial conclusion.";
  const strongest = assessed[0];
  const weakest = assessed[assessed.length - 1];
  const first = input.priorities[0];
  const scoreText = typeof input.businessHealth === "number" ? ` The directional Business Health score is ${input.businessHealth}/100.` : "";
  const strengthText = strongest ? ` The clearest observed strength is ${strongest.label.toLowerCase()}.` : "";
  const weakText = weakest ? ` The largest observed gap is ${weakest.label.toLowerCase()}.` : "";
  const focus = first?.framework ? input.pack.executiveFocus : first ? first.title.toLowerCase() : input.pack.executiveFocus;
  return `The current digital position is mixed but actionable.${scoreText}${strengthText}${weakText} The most useful commercial focus is ${focus}. Recommendations remain limited to the public signals captured for this snapshot.`;
}

export function buildSourceStatus(value: unknown, industryKey?: ReportIndustryKey): { label: string; status: string; note: string }[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const labels: Record<string, string> = {
    website: "Website", abr: "ABR identity", google: "Google Places", googleBusinessProfile: "Google Business Profile",
    businessIdentity: "ABR", socialProfiles: "Website-linked social profiles", marketplace: "Marketplace",
    propertyMarket: "Property market", propertyMarketIntelligence: "Property market (Cotality)",
    domainMarketplace: "Domain", reaMarketplace: "REA Partner Platform", industryCredentials: "Industry credentials",
  };
  const realEstateOnly = new Set(["propertyMarket", "propertyMarketIntelligence", "domainMarketplace", "reaMarketplace", "industryCredentials"]);
  return Object.entries(record).flatMap(([key, raw]) => {
    if (industryKey !== "real_estate" && realEstateOnly.has(key)) return [];
    if (!raw || typeof raw !== "object") return [];
    const item = raw as { status?: unknown; note?: unknown };
    if (typeof item.status !== "string") return [];
    const safeStatus = item.status === "unavailable" ? "not available"
      : item.status === "no_confident_match" ? "no confident match"
        : item.status === "planned" ? "not included"
          : item.status === "provider_error" ? "temporarily unavailable"
            : item.status.replace(/_/g, " ");
    const rawNote = typeof item.note === "string" ? item.note : "";
    const note = /(?:GOOGLE_|ABR_|API_KEY|credentials?|configured|environment|OAuth|provider)/i.test(rawNote)
      ? "Not available from the public evidence included in this snapshot."
      : rawNote;
    return [{ label: labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), status: safeStatus, note }];
  });
}

export function businessMeaningFor(finding: ReportPresentationFinding): string {
  const title = (finding.title || "").toLowerCase();
  if (title.includes("h1")) return "A clearer primary page topic can help search engines and visitors understand what the page is about.";
  if (title.includes("open graph")) return "Improved social sharing metadata helps links present more professionally when customers share or encounter the business online.";
  if (title.includes("structured data") || title.includes("schema")) return "Structured information can make it easier for Google and AI systems to understand the organisation, services, location and entity relationships.";
  return finding.interpretation || "This finding represents a practical opportunity to strengthen digital visibility, customer experience or conversion.";
}

function commercialRank(finding: ReportPresentationFinding): number {
  const haystack = `${finding.category || ""} ${finding.domain || ""} ${finding.title || ""}`.toLowerCase();
  let score = finding.severity === "critical" ? 40 : finding.severity === "warning" ? 25 : 15;
  if (/vendor|appraisal|conversion|lead|reputation|local authority|google|crm|follow-up|booking|product|quote|audience/.test(haystack)) score += 45;
  if (/ai.visibility|structured|schema|seo/.test(haystack)) score += 25;
  if (/open graph|h1/.test(haystack)) score -= 10;
  return score;
}

export function reportPillarValue(pillar: ReportPillar): string {
  return pillar.value == null ? "Not assessed" : `${pillar.value}/100`;
}
