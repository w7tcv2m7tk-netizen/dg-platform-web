/**
 * Prospect digital presence audit — observable signals only (URL fetch + HTML).
 * Does not invent SEO/AI scores; scores reflect what we can verify today.
 *
 * Public acquisition surface: DigitalGate Business Audit™ /
 * DigitalGate Business Health Score™ pillars.
 */

import { safeExternalFetch } from "./ssrf-guard";
import { inferBusinessModel, type BusinessModelAssessment } from "./business-model";
import type { ProspectAuditFinding, ProspectAuditScores } from "./types";

export type PresenceAuditResult = {
  scores: ProspectAuditScores;
  findings: ProspectAuditFinding[];
  industryPack: PresenceIndustryPack;
  strengths: string[];
  industryInsights: Array<{ title: string; detail: string; recommendedAction: string }>;
  businessModel: BusinessModelAssessment;
  probes: {
    websiteUrl: string | null;
    reachable: boolean | null;
    contentAccessible: boolean | null;
    https: boolean | null;
    statusCode: number | null;
    finalUrl: string | null;
    title: string | null;
    hasMetaDescription: boolean;
    hasViewport: boolean;
    hasOpenGraph: boolean;
    hasJsonLd: boolean;
    hasH1: boolean;
    hasTelLink: boolean;
    hasMailto: boolean;
    hasForm: boolean;
    hasCtaLanguage: boolean;
    hasMapsOrGbpHint: boolean;
    hasReviewHint: boolean;
    hasAnalyticsHint: boolean;
    socialProfiles: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string; tiktok?: string };
    appraisalSignals: { hasAppraisalCta: boolean; hasAppraisalForm: boolean; suburbMentions: number };
    pages: Array<{ url: string; statusCode: number | null; title: string | null; hasH1: boolean; hasForm: boolean; hasPhoneLink: boolean; hasEmailLink: boolean; hasBookingLanguage: boolean; hasPricingLanguage: boolean; hasTrialLanguage: boolean; hasServiceLanguage: boolean; wordCount: number }>;
    error?: string;
  };
};

export type PresenceAuditOptions = {
  businessName: string;
  websiteUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Skip CRM-only findings (missing contact/location) for public preview. */
  publicPreview?: boolean;
};

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type PresenceIndustryPack =
  | "accommodation"
  | "real_estate"
  | "trades"
  | "music_artist"
  | "general";

export function resolvePresenceIndustryPack(
  industry?: string | null,
): PresenceIndustryPack {
  const s = (industry || "").toLowerCase();
  if (
    /hospitality|tourism|accommodation|hotel|motel|resort|retreat|lodge|bnb|airbnb|glamping|stay|eco/.test(
      s,
    )
  ) {
    return "accommodation";
  }
  // Finance has a dedicated report pack but no separate presence pack; use
  // general public-evidence guidance rather than inheriting Real Estate rules.
  if (/finance|mortgage|lending|accounting|insurance|wealth|capital|broking/.test(s)) {
    return "general";
  }
  if (/music|artist|musician|dj|producer|band|singer|creative|entertainment|record label/.test(s)) {
    return "music_artist";
  }
  if (/real\s*estate|realtor|buyers agency|realty|property (?:agency|management|group|sales)/.test(s)) {
    return "real_estate";
  }
  if (
    /trad|plumb|electr|build|hvac|landscap|paint|roof|carpenter|handyman|cleaner|service area/.test(
      s,
    )
  ) {
    return "trades";
  }
  return "general";
}

function schemaRecommendation(pack: PresenceIndustryPack): string {
  switch (pack) {
    case "accommodation":
      return "Implement appropriate Organisation / LocalBusiness / accommodation schema and strengthen your machine-readable business information.";
    case "real_estate":
      return "Implement Organisation / RealEstateAgent (or LocalBusiness) schema and strengthen agent, suburb and listing entity signals.";
    case "music_artist":
      return "Implement appropriate MusicGroup or Person schema with official artist profiles, releases, booking details and verified links.";
    case "trades":
      return "Implement LocalBusiness / Service schema with clear service-area signals and machine-readable contact details.";
    default:
      return "Implement appropriate Organisation / LocalBusiness schema and strengthen your machine-readable business information.";
  }
}

function conversionRecommendation(pack: PresenceIndustryPack): string {
  switch (pack) {
    case "accommodation":
      return "Introduce a prominent enquiry or booking pathway, particularly around high-intent sections of the homepage.";
    case "real_estate":
      return "Make appraisal and buyer-enquiry pathways unmistakable on high-intent pages.";
    case "music_artist":
      return "Make the booking, collaboration and event-enquiry path explicit, with a clear response expectation.";
    case "trades":
      return "Make call, quote and enquiry pathways unmistakable above the fold and on service pages.";
    default:
      return "Introduce a prominent enquiry pathway, particularly around high-intent sections of the homepage.";
  }
}

function localRecommendation(pack: PresenceIndustryPack): string {
  switch (pack) {
    case "accommodation":
      return "Strengthen your location/entity signals across the website and relevant business profiles.";
    case "real_estate":
      return "Strengthen suburb coverage, Google Business Profile and local entity signals across the website.";
    case "trades":
      return "Strengthen service-area pages, Google Business Profile and local entity signals.";
    default:
      return "Strengthen location/entity signals across the website and relevant business profiles.";
  }
}

function normaliseUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractSignals(html: string, localTerms: string[] = []) {
  const lower = html.toLowerCase();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const hasMetaDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const hasOpenGraph = lower.includes('property="og:') || lower.includes("property='og:");
  const hasJsonLd =
    lower.includes("application/ld+json") || lower.includes("schema.org");
  const hasH1 = /<h1[\s>]/i.test(html);
  const hasTelLink = /href=["']tel:/i.test(html);
  const hasMailto = /href=["']mailto:/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  const hasCtaLanguage =
    /\b(contact us|get in touch|book (a |an )?(call|demo|session|stay|now)?|book now|check availability|reserve|request (a )?quote|get a quote|enquire|inquire|free (audit|consult)|start (today|now)|talk to us|get a (free )?appraisal)\b/i.test(
      html,
    );
  const hasMapsOrGbpHint =
    /maps\.google|google\.com\/maps|g\.page\/|business\.google|googleusercontent\.com\/maps/i.test(
      html,
    ) || /itemtype=["'][^"']*localbusiness/i.test(html);
  const hasReviewHint =
    /\b(reviews?|testimonials?|rated|stars?|trustpilot|google reviews?)\b/i.test(html) ||
    /schema\.org\/(aggregaterating|review)/i.test(html);
  const hasAnalyticsHint =
    /gtag\(|google-analytics|googletagmanager|gtm\.js|fbq\(|facebook\.net\/.*fbevents|hotjar|clarity\.ms/i.test(
      html,
    );

  const socialProfiles: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string; tiktok?: string } = {};
  const hrefs = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi), (m) => m[1]);
  for (const href of hrefs) {
    if (!socialProfiles.facebook && /(?:facebook\.com|fb\.com)\//i.test(href)) socialProfiles.facebook = href;
    if (!socialProfiles.instagram && /instagram\.com\//i.test(href)) socialProfiles.instagram = href;
    if (!socialProfiles.linkedin && /linkedin\.com\/(?:company|in)\//i.test(href)) socialProfiles.linkedin = href;
    if (!socialProfiles.youtube && /(?:youtube\.com|youtu\.be)\//i.test(href)) socialProfiles.youtube = href;
    if (!socialProfiles.tiktok && /tiktok\.com\/@/i.test(href)) socialProfiles.tiktok = href;
  }
  const appraisalMatches = html.match(/\b(appraisal|property valuation|what(?:'|’)s my (?:home|property) worth|sell(?:ing)? your (?:home|property))\b/gi) || [];
  const hasAppraisalCta = appraisalMatches.length > 0;
  const hasAppraisalForm = hasForm && hasAppraisalCta;
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const normalisedText = visibleText.toLowerCase();
  const suburbMentions = localTerms.reduce((count, term) => {
    const needle = term.trim().toLowerCase();
    if (!needle || needle.length < 3) return count;
    return count + normalisedText.split(needle).length - 1;
  }, 0);

  return {
    socialProfiles,
    appraisalSignals: { hasAppraisalCta, hasAppraisalForm, suburbMentions },
    title,
    hasMetaDescription,
    hasViewport,
    hasOpenGraph,
    hasJsonLd,
    hasH1,
    hasTelLink,
    hasMailto,
    hasForm,
    hasCtaLanguage,
    hasMapsOrGbpHint,
    hasReviewHint,
    hasAnalyticsHint,
  };
}

function discoverSameOriginPages(html: string, baseUrl: string): string[] {
  let origin: string;
  try { origin = new URL(baseUrl).origin; } catch { return []; }
  const preferred = /(?:contact|about|service|solution|pricing|price|book|booking|enquir|quote|trial|demo|shop|product)/i;
  const seen = new Set<string>();
  const pages: string[] = [];
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], origin);
      if (url.origin !== origin || !/^https?:$/.test(url.protocol)) continue;
      if (!preferred.test(url.pathname)) continue;
      if (/\.(?:jpg|jpeg|png|svg|webp|gif|pdf|css|js|ico)(?:$|\?)/i.test(url.pathname)) continue;
      const clean = `${url.origin}${url.pathname}`.replace(/\/$/, "") || origin;
      if (clean === origin.replace(/\/$/, "") || seen.has(clean)) continue;
      seen.add(clean);
      pages.push(clean);
      if (pages.length >= 3) break;
    } catch { /* ignore malformed links */ }
  }
  return pages;
}

function pageEvidence(url: string, html: string, statusCode: number | null) {
  const signals = extractSignals(html);
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const lower = text.toLowerCase();
  return {
    url,
    statusCode,
    title: signals.title,
    hasH1: signals.hasH1,
    hasForm: signals.hasForm,
    hasPhoneLink: signals.hasTelLink,
    hasEmailLink: signals.hasMailto,
    hasBookingLanguage: /\b(book|booking|availability|reserve|appointment|schedule a call|schedule a time)\b/i.test(text),
    hasPricingLanguage: /\b(pricing|price list|packages?|from \$|starting at|plans?)\b/i.test(text),
    hasTrialLanguage: /\b(free trial|start a trial|start free|request a demo|book a demo|get started)\b/i.test(text),
    hasServiceLanguage: /\b(services?|solutions?|what we do|our work|capabilities)\b/i.test(text),
    wordCount: lower.split(/\s+/).filter(Boolean).length,
  };
}

/** Run a live presence probe against a prospect website (server-side). */
export async function runPresenceAudit(
  input: PresenceAuditOptions,
): Promise<PresenceAuditResult> {
  const findings: ProspectAuditFinding[] = [];
  const websiteUrl = normaliseUrl(input.websiteUrl);
  const pack = resolvePresenceIndustryPack(input.industry);
  const strengths: string[] = [];

  const probes: PresenceAuditResult["probes"] = {
    websiteUrl,
    reachable: null,
    contentAccessible: null,
    https: null,
    statusCode: null,
    finalUrl: null,
    title: null,
    hasMetaDescription: false,
    hasViewport: false,
    hasOpenGraph: false,
    hasJsonLd: false,
    hasH1: false,
    hasTelLink: false,
    hasMailto: false,
    hasForm: false,
    hasCtaLanguage: false,
    hasMapsOrGbpHint: false,
    hasReviewHint: false,
    hasAnalyticsHint: false,
    socialProfiles: {},
    appraisalSignals: { hasAppraisalCta: false, hasAppraisalForm: false, suburbMentions: 0 },
    pages: [],
  };

  let websiteHealth = 20;
  let seo = 15;
  let aiVisibility = 10;
  let reputation = 0;
  let reputationEvidence = false;
  let contentObserved = false;
  let conversionReadiness = 20;
  let growthSignals = 20;

  if (!websiteUrl) {
    findings.push({
      domain: "website",
      severity: "opportunity",
      evidenceStatus: "unavailable",
      confidence: "low",
      title: "Website not identified — evidence unavailable",
      detail: `${input.businessName} has no website identified in the available records, so website, SEO, AI readiness, conversion and reputation performance could not be assessed.`,
      recommendedAction: "Confirm the business website, then re-run the audit. Missing evidence is not treated as poor performance.",
    });
  } else {
    probes.https = websiteUrl.startsWith("https://");

    try {
      // This probe is reachable unauthenticated through the public
      // business-audit funnel. safeExternalFetch resolves the host, refuses
      // private/loopback/link-local/metadata targets, and re-validates every
      // redirect hop — checking only the initial URL is bypassable with a
      // public redirector pointing at metadata or RFC1918 space. A refusal
      // throws (BlockedTargetError) and is handled by the catch branch below.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await safeExternalFetch(websiteUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "user-agent": "DigitalGate-GrowthEngine-Audit/1.0 (+https://digitalgate.com.au)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timer);

      // Any HTTP response proves the host is reachable. Accessibility is
      // separate so bot protection is not misreported as an outage.
      probes.reachable = true;
      probes.contentAccessible = res.ok || (res.status >= 200 && res.status < 400);
      probes.statusCode = res.status;
      probes.finalUrl = res.url;
      probes.https = res.url.startsWith("https://");

      if (!probes.https) {
        findings.push({
          domain: "identity",
          severity: "warning",
          title: "Website is not on HTTPS",
          detail: "The final website URL uses HTTP — browsers and AI crawlers treat this as a trust gap.",
          recommendedAction: "Recommend SSL before any paid digital work.",
        });
        websiteHealth -= 15;
      }

      if (!probes.contentAccessible) {
        findings.push({
          domain: "website",
          severity: "critical",
          title: `Website content blocked the audit probe (HTTP ${res.status})`,
          detail: "The website responded, but its content was not accessible to the audit probe. This can reflect bot protection or access controls rather than a website outage.",
          recommendedAction: "Verify the site in a browser before treating on-page audit signals as missing.",
        });
        websiteHealth = Math.min(websiteHealth, 25);
        conversionReadiness = Math.min(conversionReadiness, 20);
        growthSignals = Math.min(growthSignals, 20);
      } else {
        websiteHealth += 35;
        const contentType = res.headers.get("content-type") ?? "";
        const html = contentType.includes("html")
          ? (await res.text()).slice(0, 1_000_000)
          : "";

        if (html) {
          contentObserved = true;
          const localTerms = (input.location || "")
            .split(",")
            .map((part) => part.replace(/\b(?:qld|nsw|vic|sa|wa|tas|nt|act|australia|\d{4})\b/gi, "").trim())
            .filter((part) => part.length >= 3);
          const signals = extractSignals(html, localTerms);
          probes.title = signals.title;
          probes.hasMetaDescription = signals.hasMetaDescription;
          probes.hasViewport = signals.hasViewport;
          probes.hasOpenGraph = signals.hasOpenGraph;
          probes.hasJsonLd = signals.hasJsonLd;
          probes.hasH1 = signals.hasH1;
          probes.hasTelLink = signals.hasTelLink;
          probes.hasMailto = signals.hasMailto;
          probes.hasForm = signals.hasForm;
          probes.hasCtaLanguage = signals.hasCtaLanguage;
          probes.hasMapsOrGbpHint = signals.hasMapsOrGbpHint;
          probes.hasReviewHint = signals.hasReviewHint;
          probes.hasAnalyticsHint = signals.hasAnalyticsHint;
          probes.socialProfiles = signals.socialProfiles;
          probes.appraisalSignals = signals.appraisalSignals;

          const pageUrls = discoverSameOriginPages(html, probes.finalUrl || websiteUrl || "");
          for (const pageUrl of pageUrls) {
            try {
              const pageRes = await safeExternalFetch(pageUrl, {
                method: "GET",
                signal: AbortSignal.timeout(5_000),
                headers: { "user-agent": "DigitalGate-GrowthEngine-Audit/1.0 (+https://digitalgate.com.au)", accept: "text/html,application/xhtml+xml" },
              });
              const pageHtml = (pageRes.headers.get("content-type") || "").includes("html") ? (await pageRes.text()).slice(0, 1_000_000) : "";
              if (pageHtml) probes.pages.push(pageEvidence(pageUrl, pageHtml, pageRes.status));
            } catch { /* page evidence is optional; homepage evidence remains authoritative */ }
          }

          const socialCount = Object.keys(signals.socialProfiles).length;
          if (socialCount > 0) {
            strengths.push(`The website links to ${socialCount} public social profile${socialCount === 1 ? "" : "s"}, providing a connected public digital footprint.`);
            growthSignals += Math.min(10, socialCount * 3);
          } else {
            findings.push({
              domain: "social",
              severity: "opportunity",
              category: "Digital Footprint",
              title: "Public social footprint is not connected from the website",
              observed: "No Facebook, Instagram, LinkedIn, YouTube or TikTok profile link was detected on the homepage.",
              interpretation: "Disconnected business profiles weaken entity consistency and make it harder to move between the agency's owned and social presence.",
              detail: "No major public social profile links were detected on the homepage.",
              recommendedAction: "Verify the agency's active public profiles and connect them consistently across website, Google and social channels.",
            });
          }

          if (pack === "real_estate") {
            if (signals.appraisalSignals.hasAppraisalCta) {
              strengths.push("Vendor/appraisal intent language is visible, providing a foundation for seller acquisition.");
              conversionReadiness += 10;
            } else {
              findings.push({
                domain: "website",
                severity: "critical",
                category: "Vendor Acquisition",
                title: "Vendor appraisal pathway is not prominent on the homepage",
                observed: "No clear appraisal, valuation or seller-intent language was detected on the homepage.",
                interpretation: "For a real-estate agency, vendor intent is commercially valuable. A weak appraisal pathway can leave high-value seller demand uncaptured.",
                detail: "A prominent vendor/appraisal pathway was not detected.",
                recommendedAction: "Create a prominent appraisal/value pathway and connect every enquiry to CRM follow-up and vendor nurture.",
              });
              conversionReadiness -= 10;
            }
            if (signals.appraisalSignals.suburbMentions >= 3) {
              strengths.push("Multiple local suburb references are visible, supporting geographic authority.");
              seo += 5;
              aiVisibility += 5;
            } else {
              findings.push({
                domain: "seo",
                severity: "warning",
                category: "Local Authority",
                title: "Limited suburb authority signals on the homepage",
                observed: `Only ${signals.appraisalSignals.suburbMentions} target-area suburb references were detected in the homepage HTML.`,
                interpretation: "Real-estate discovery is highly local. Strong suburb and agent entity signals help reinforce where the agency has authority.",
                detail: "Homepage local-area coverage appears limited.",
                recommendedAction: "Strengthen suburb, agent, listing and appraisal content as a connected local-authority strategy.",
              });
            }
          }

          if (signals.title) {
            websiteHealth += 8;
            seo += 10;
            strengths.push("A homepage title is present, giving search engines a basic page-topic signal.");
          } else {
            findings.push({
              domain: "seo",
              severity: "warning",
              title: "Missing page title",
              detail: "No <title> tag detected on the homepage HTML.",
              recommendedAction: "Fix title tags before SEO or AI Visibility work.",
            });
          }

          if (signals.hasMetaDescription) {
            seo += 12;
            strengths.push("A homepage meta description is present, providing a foundation for search-result messaging.");
          } else {
            findings.push({
              domain: "seo",
              severity: "opportunity",
              title: "No meta description",
              detail: "Homepage lacks a meta description — weak SERP and AI snippet control.",
              recommendedAction: "Add unique meta descriptions on key pages.",
            });
          }

          if (signals.hasViewport) {
            websiteHealth += 10;
            strengths.push("Mobile viewport support is present, providing a basic mobile-ready foundation.");
          } else {
            findings.push({
              domain: "website",
              severity: "warning",
              title: "No mobile viewport meta",
              detail: "Missing viewport meta often means poor mobile UX.",
              recommendedAction: "Audit mobile layout and conversion paths.",
            });
          }

          if (signals.hasH1) {
            seo += 8;
            strengths.push("A primary H1 heading is present, supporting clearer content hierarchy.");
          } else {
            findings.push({
              domain: "seo",
              severity: "opportunity",
              title: "No H1 heading detected",
              detail: "Homepage HTML did not include an H1 — content hierarchy may be weak.",
            });
          }

          if (signals.hasOpenGraph) {
            strengths.push("Open Graph metadata is present, supporting stronger social sharing previews.");
            aiVisibility += 15;
            seo += 5;
            growthSignals += 8;
          } else {
            findings.push({
              domain: "social",
              severity: "opportunity",
              title: "Open Graph tags missing",
              detail: "No og:* tags found — weaker share previews and entity hints.",
              recommendedAction: "Add Open Graph + social preview assets.",
            });
          }

          if (signals.hasJsonLd) {
            strengths.push("Structured data is present, helping machines interpret the business and page content.");
            aiVisibility += 25;
            seo += 10;
            growthSignals += 12;
            findings.push({
              domain: "ai_visibility",
              severity: "opportunity",
              category: "AI & Search Visibility",
              title: "Structured data present",
              observed: "JSON-LD or schema.org references detected on the homepage.",
              interpretation:
                "This is a helpful signal that search engines and other systems have machine-readable business information to work with.",
              detail:
                "JSON-LD or schema.org references detected — a helpful structured-data signal.",
            });
          } else {
            findings.push({
              domain: "ai_visibility",
              severity: "opportunity",
              evidenceStatus: "confirmed_gap",
              category: "AI & Search Visibility",
              title: "No structured data detected",
              observed: "No structured data detected",
              interpretation:
                "Your homepage doesn’t currently appear to expose JSON-LD / Schema.org structured data. This can make it harder for search engines and AI systems to clearly understand your business, location, services and entity relationships.",
              detail:
                "Your homepage doesn’t currently appear to expose JSON-LD / Schema.org structured data. This can make it harder for search engines and AI systems to clearly understand your business, location, services and entity relationships.",
              recommendedAction: schemaRecommendation(pack),
            });
            aiVisibility += 5;
          }

          // Conversion readiness
          if (signals.hasForm) {
            strengths.push("An enquiry form is detectable on the homepage, providing a direct conversion path.");
            conversionReadiness += 25;
            growthSignals += 8;
          } else {
            findings.push({
              domain: "website",
              severity: "opportunity",
              category: "Conversion",
              title: "No enquiry form detected on the homepage",
              observed: "No enquiry form detected on the homepage",
              interpretation:
                "Visitors need a clear path to take the next step. Your website should make it obvious what someone can do after deciding they’re interested — whether that is an enquiry form, booking pathway, phone CTA or another conversion mechanism.",
              detail:
                "Visitors need a clear path to take the next step. Your website should make it obvious what someone can do after deciding they’re interested — whether that is an enquiry form, booking pathway, phone CTA or another conversion mechanism.",
              recommendedAction: conversionRecommendation(pack),
            });
          }
          if (signals.hasTelLink) conversionReadiness += 15;
          if (signals.hasMailto) conversionReadiness += 10;
          if (signals.hasCtaLanguage) {
            conversionReadiness += 15;
          } else {
            findings.push({
              domain: "website",
              severity: "opportunity",
              category: "Conversion",
              title: "Weak call-to-action language",
              observed: "Clear call-to-action language was not obvious on the homepage.",
              interpretation:
                "Homepage copy may not clearly invite the next step — contact, booking or enquiry.",
              detail:
                "Homepage copy may not clearly invite contact, booking or enquiry.",
              recommendedAction: "Strengthen primary CTAs and contact pathways.",
            });
          }
          if (!signals.hasTelLink && !signals.hasMailto && !signals.hasForm) {
            findings.push({
              domain: "website",
              severity: "warning",
              category: "Conversion",
              title: "Limited contact pathways",
              observed:
                "No obvious phone, email or form path detected on the homepage.",
              interpretation:
                "Without a clear next step, interested visitors may leave before converting.",
              detail: "No obvious phone, email or form path detected on the homepage.",
              recommendedAction: "Make contact options unmistakable.",
            });
            conversionReadiness = Math.min(conversionReadiness, 35);
          }

          // Reputation & presence
          if (signals.hasMapsOrGbpHint) {
            strengths.push("Local/Google Maps signals are visible on the homepage, supporting local entity confidence.");
            reputationEvidence = true;
            reputation = Math.max(reputation, 25) + 25;
            growthSignals += 10;
          } else {
            findings.push({
              domain: "gbp",
              severity: "opportunity",
              category: "Local & Regional Visibility",
              title: "Location information could not be fully established",
              observed:
                "No clear Google Maps / Business Profile / LocalBusiness hints were detected on the homepage.",
              interpretation:
                pack === "accommodation"
                  ? "Location is particularly important for an accommodation business competing for searches in its region."
                  : pack === "real_estate"
                    ? "Local and suburb signals matter for how buyers and vendors discover an agency online."
                    : "Local entity signals help searchers and AI systems understand where you operate.",
              detail:
                pack === "accommodation"
                  ? "Location is particularly important for an accommodation business competing for searches in its region."
                  : "Local entity signals help searchers and AI systems understand where you operate.",
              recommendedAction: localRecommendation(pack),
            });
          }
          if (signals.hasReviewHint) {
            strengths.push("Review or testimonial signals are visible, supporting online trust.");
            reputationEvidence = true;
            reputation = Math.max(reputation, 20) + 20;
          } else {
            findings.push({
              domain: "gbp",
              severity: "opportunity",
              category: "Reputation",
              title: "Review / reputation signals not obvious",
              observed:
                "Homepage does not clearly surface reviews, ratings or testimonials.",
              interpretation:
                "Social proof helps visitors build trust before they enquire or book.",
              detail:
                "Homepage does not clearly surface reviews, ratings or testimonials.",
              recommendedAction:
                "Feature recent reviews and rating schema where appropriate.",
            });
          }

          if (signals.hasAnalyticsHint) {
            strengths.push("Common analytics/tracking signals are detectable, providing a measurement foundation.");
            growthSignals += 15;
          } else {
            findings.push({
              domain: "website",
              severity: "opportunity",
              category: "Measurement",
              title: "Analytics / tracking not detected",
              observed: "Analytics / tracking not detected",
              interpretation:
                "We couldn’t identify common analytics or tracking signals during the audit.",
              detail:
                "We couldn’t identify common analytics or tracking signals during the audit.",
              recommendedAction:
                "Confirm analytics, Search Console and conversion tracking are correctly implemented so you can measure traffic, enquiries and bookings.",
            });
          }
        } else {
          findings.push({
            domain: "website",
            severity: "warning",
            title: "Non-HTML response",
            detail: `Content-Type was "${contentType || "unknown"}" — could not parse on-page SEO signals.`,
          });
        }
      }
    } catch (err) {
      probes.reachable = false;
      probes.contentAccessible = false;
      probes.error = err instanceof Error ? err.message : "fetch_failed";
      findings.push({
        domain: "website",
        severity: "warning",
        evidenceStatus: "unavailable",
        confidence: "low",
        title: "Website could not be observed",
        detail: `The live probe did not observe the website${probes.error ? ` (${probes.error})` : ""}. This is treated as unavailable evidence, not a confirmed performance failure.`,
        recommendedAction: "Confirm the website is publicly reachable, then re-run the audit.",
      });
    }
  }

  const businessModel = inferBusinessModel({ businessName: input.businessName, industry: input.industry, location: input.location, probes });
  const pageHasContactForm = probes.pages.some((page) => page.hasForm);
  const pageHasBooking = probes.pages.some((page) => page.hasBookingLanguage);
  const pageHasPricing = probes.pages.some((page) => page.hasPricingLanguage);
  const pageHasTrial = probes.pages.some((page) => page.hasTrialLanguage);
  if (pageHasContactForm) {
    strengths.unshift("A separate contact or enquiry page with a detectable form was observed, providing an existing conversion path.");
    conversionReadiness = Math.max(conversionReadiness, 65);
  }
  if (pageHasBooking) {
    strengths.unshift("A booking, event or appointment pathway was observed on a sampled page.");
    conversionReadiness = Math.max(conversionReadiness, 75);
  }
  if (pageHasPricing || pageHasTrial) growthSignals = Math.max(growthSignals, 55);
  if (pageHasContactForm || pageHasBooking) {
    findings.splice(0, findings.length, ...findings.filter((finding) => finding.title !== "No enquiry form detected on the homepage" && finding.title !== "Limited contact pathways"));
  }
  if (businessModel.type === "music_artist") {
    findings.splice(0, findings.length, ...findings.filter((finding) => !/location information|google maps|localbusiness|suburb authority/i.test(`${finding.title} ${finding.category || ""}`)));
    if (!pageHasBooking && !pageHasContactForm) {
      findings.push({ domain: "website", severity: "warning", category: "Artist Conversion", title: "Booking and event-enquiry pathway was not detected", observed: "No booking, event or contact form was detected on the homepage or sampled pages.", detail: "For a music artist, promoter and event-booking intent needs a clear route to a conversation.", recommendedAction: conversionRecommendation(pack) });
    }
    if (!findings.some((finding) => /structured data|schema/i.test(finding.title))) {
      findings.push({ domain: "ai_visibility", severity: "opportunity", category: "Artist Identity", title: "Artist-specific structured information was not detected", observed: "No MusicGroup or Person schema was observed.", detail: "Artist and release information is more useful to search and AI systems when expressed with the appropriate entity type.", recommendedAction: schemaRecommendation(pack) });
    }
  }

  if (!input.publicPreview) {
    if (!input.contactEmail && !input.contactPhone) {
      findings.push({
        domain: "identity",
        severity: "warning",
        title: "No contact details on prospect",
        detail: "Pipeline record is missing email and phone — follow-up will stall.",
        recommendedAction: "Capture a decision-maker contact before sending the report.",
      });
    }

    if (!input.location) {
      findings.push({
        domain: "gbp",
        severity: "opportunity",
        category: "Local & Regional Visibility",
        title: "Prospect location has not been verified",
        observed: "No location was recorded on the prospect record.",
        interpretation:
          "Without a location we cannot fully prioritise Google Business Profile and local search angles yet.",
        detail:
          "Without a location we cannot fully prioritise Google Business Profile and local search angles yet.",
        recommendedAction: localRecommendation(pack),
      });
    }
  }

  const hasWebsite = Boolean(websiteUrl);
  const websiteHealthScore = hasWebsite && (contentObserved || probes.contentAccessible) ? clampScore(websiteHealth) : null;
  const seoScore = contentObserved ? clampScore(seo) : null;
  const aiVisibilityScore = contentObserved ? clampScore(aiVisibility) : null;
  const reputationScore = businessModel.type === "music_artist" ? null : reputationEvidence ? clampScore(reputation) : null;
  const conversionScore = contentObserved ? clampScore(conversionReadiness) : null;
  const growthScore = contentObserved ? clampScore(growthSignals) : null;
  const socialCount = Object.values(probes.socialProfiles).filter(Boolean).length;
  const socialScore = contentObserved ? Math.min(100, socialCount * 20 + (socialCount > 0 ? 20 : 0)) : null;

  const weightedPillars = [
    { key: "website", value: websiteHealthScore, weight: 0.22 },
    { key: "seo", value: seoScore, weight: 0.2 },
    { key: "ai", value: aiVisibilityScore, weight: 0.2 },
    { key: "reputation", value: reputationScore, weight: 0.14 },
    { key: "conversion", value: conversionScore, weight: 0.14 },
    { key: "growth", value: growthScore, weight: 0.1 },
  ];
  const assessedPillars = weightedPillars.filter((pillar) => pillar.value != null);
  const assessedWeight = assessedPillars.reduce((sum, pillar) => sum + pillar.weight, 0);
  const businessHealth = assessedPillars.length >= 2 && assessedWeight >= 0.5
    ? clampScore(assessedPillars.reduce((sum, pillar) => sum + (pillar.value as number) * pillar.weight, 0) / assessedWeight)
    : null;
  const assessment = {
    status: businessHealth == null ? "not_assessed" as const : assessedPillars.length === weightedPillars.length ? "assessed" as const : "partial" as const,
    assessedPillars: assessedPillars.map((pillar) => pillar.key),
    unavailablePillars: weightedPillars.filter((pillar) => pillar.value == null).map((pillar) => pillar.key),
    evidenceCoveragePercent: Math.round(assessedWeight * 100),
    confidence: assessedWeight >= 0.8 ? "high" as const : assessedWeight >= 0.5 ? "medium" as const : "low" as const,
  };

  if (businessHealth != null && businessHealth < 45) {
    findings.unshift({
      domain: "website",
      severity: "warning",
      evidenceStatus: "confirmed_gap",
      title: "Low DigitalGate Business Health Score™",
      detail: `Composite score ${businessHealth}/100 from verified public presence probes; evidence coverage ${assessment.evidenceCoveragePercent}%.`,
      recommendedAction: "Prioritise the weakest verified foundations first, then re-measure the Business Health Score.",
    });
  }

  const industryInsights: PresenceAuditResult["industryInsights"] =
    pack === "real_estate"
      ? [
          {
            title: "Vendor and appraisal acquisition",
            detail: "For a real-estate agency, seller intent is a high-value digital signal. Appraisal pathways should be prominent, measurable and connected to structured follow-up.",
            recommendedAction: "Review appraisal CTAs, suburb landing pages, lead capture and automated vendor nurture as one acquisition journey.",
          },
          {
            title: "Suburb and local authority",
            detail: "Agency visibility depends on strong local entity signals across suburbs, agents, listings, reviews and Google Business Profile presence.",
            recommendedAction: "Build consistent suburb, agent and local-business entity signals that reinforce geographic authority for search and AI discovery.",
          },
          {
            title: "Listing traffic to relationship pipeline",
            detail: "Property and buyer traffic creates first-party intent that can support future seller, buyer and appraisal opportunities when captured and followed up well.",
            recommendedAction: "Connect property enquiries and website conversion points to CRM segmentation, follow-up automation and measurable next actions.",
          },
        ]
      : pack === "accommodation"
        ? [
            {
              title: "Direct enquiry and booking journey",
              detail: "Accommodation visibility is most valuable when guests can move quickly from discovery to availability, trust and booking.",
              recommendedAction: "Review high-intent booking paths, location content, reputation signals and direct enquiry follow-up as one guest journey.",
            },
          ]
        : pack === "music_artist"
          ? [
              { title: "Artist identity and booking", detail: "A music artist or DJ is discovered through a coherent identity, music evidence and a clear booking route rather than generic local-service signals.", recommendedAction: "Connect artist profile, releases or mixes, event proof and booking enquiry into one journey." },
              { title: "Promoter and collaborator relationships", detail: "Bookings and creative opportunities depend on promoters, venues and collaborators being able to verify the artist and start a conversation.", recommendedAction: "Create a clear electronic press kit and booking pathway with a response expectation." },
            ]
        : pack === "trades"
          ? [
              {
                title: "Service-area lead generation",
                detail: "Trades and service businesses benefit from clear service-area authority and frictionless quote/call pathways.",
                recommendedAction: "Connect service-area visibility, quote capture and follow-up into a measurable lead pipeline.",
              },
            ]
          : [
              {
                title: "Lead capture and follow-up",
                detail: "Digital visibility creates value when visitor intent is captured, followed up and measured consistently.",
                recommendedAction: "Connect the strongest website conversion points to CRM, automation and measurable follow-up.",
              },
            ];

  return {
    businessModel,
    industryPack: pack,
    strengths: Array.from(new Set(strengths)).slice(0, 8),
    industryInsights,
    scores: {
      businessHealth,
      assessment,
      websiteHealth: websiteHealthScore,
      seo: seoScore,
      aiVisibility: aiVisibilityScore,
      reputation: reputationScore,
      conversionReadiness: conversionScore,
      growthSignals: growthScore,
      socialPresence: socialScore,
      googleBusinessProfile: reputationScore,
      digitalIdentity: websiteHealthScore,
    },
    findings,
    probes,
  };
}
