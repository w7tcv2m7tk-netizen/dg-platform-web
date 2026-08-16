/**
 * Prospect digital presence audit — observable signals only (URL fetch + HTML).
 * Does not invent SEO/AI scores; scores reflect what we can verify today.
 *
 * Public acquisition surface: DigitalGate Business Audit™ /
 * DigitalGate Business Health Score™ pillars.
 */

import type { ProspectAuditFinding, ProspectAuditScores } from "./types";

export type PresenceAuditResult = {
  scores: ProspectAuditScores;
  findings: ProspectAuditFinding[];
  probes: {
    websiteUrl: string | null;
    reachable: boolean | null;
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

function extractSignals(html: string) {
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
    /\b(contact us|get in touch|book (a |an )?(call|demo|session)|request (a )?quote|get a quote|enquire|inquire|free (audit|consult)|start (today|now)|talk to us)\b/i.test(
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

  return {
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

/** Run a live presence probe against a prospect website (server-side). */
export async function runPresenceAudit(
  input: PresenceAuditOptions,
): Promise<PresenceAuditResult> {
  const findings: ProspectAuditFinding[] = [];
  const websiteUrl = normaliseUrl(input.websiteUrl);

  const probes: PresenceAuditResult["probes"] = {
    websiteUrl,
    reachable: null,
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
  };

  let websiteHealth = 20;
  let seo = 15;
  let aiVisibility = 10;
  let reputation = 25;
  let conversionReadiness = 20;
  let growthSignals = 20;

  if (!websiteUrl) {
    findings.push({
      domain: "website",
      severity: "critical",
      title: "No website URL on file",
      detail: `${input.businessName} has no website recorded — digital presence cannot be measured yet.`,
      recommendedAction: "Add a website URL in Discovery, then re-run the audit.",
    });
    websiteHealth = 8;
    seo = 5;
    aiVisibility = 5;
    reputation = 10;
    conversionReadiness = 8;
    growthSignals = 8;
  } else {
    probes.https = websiteUrl.startsWith("https://");
    if (!probes.https) {
      findings.push({
        domain: "identity",
        severity: "warning",
        title: "Website is not on HTTPS",
        detail: "Prospect URL uses HTTP — browsers and AI crawlers treat this as a trust gap.",
        recommendedAction: "Recommend SSL before any paid digital work.",
      });
      websiteHealth -= 15;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(websiteUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "DigitalGate-GrowthEngine-Audit/1.0 (+https://digitalgate.com.au)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timer);

      probes.reachable = res.ok || (res.status >= 200 && res.status < 400);
      probes.statusCode = res.status;
      probes.finalUrl = res.url;
      probes.https = res.url.startsWith("https://");

      if (!probes.reachable) {
        findings.push({
          domain: "website",
          severity: "critical",
          title: `Website returned HTTP ${res.status}`,
          detail: "The prospect site did not respond successfully during the live probe.",
          recommendedAction: "Confirm the URL or note hosting issues in the opportunity report.",
        });
        websiteHealth = Math.min(websiteHealth, 25);
        conversionReadiness = Math.min(conversionReadiness, 20);
        growthSignals = Math.min(growthSignals, 20);
      } else {
        websiteHealth += 35;
        const contentType = res.headers.get("content-type") ?? "";
        const html = contentType.includes("html")
          ? (await res.text()).slice(0, 250_000)
          : "";

        if (html) {
          const signals = extractSignals(html);
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

          if (signals.title) {
            websiteHealth += 8;
            seo += 10;
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
          } else {
            findings.push({
              domain: "seo",
              severity: "opportunity",
              title: "No H1 heading detected",
              detail: "Homepage HTML did not include an H1 — content hierarchy may be weak.",
            });
          }

          if (signals.hasOpenGraph) {
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
            aiVisibility += 25;
            seo += 10;
            reputation += 10;
            growthSignals += 12;
            findings.push({
              domain: "ai_visibility",
              severity: "opportunity",
              title: "Structured data present",
              detail:
                "JSON-LD or schema.org references detected — a positive AI Visibility signal.",
            });
          } else {
            findings.push({
              domain: "ai_visibility",
              severity: "critical",
              title: "No structured data detected",
              detail:
                "Homepage lacks JSON-LD / schema.org markup — weak entity clarity for AI answer engines.",
              recommendedAction:
                "Prioritise LocalBusiness / Organisation schema and machine-readable business information.",
            });
            aiVisibility += 5;
          }

          // Conversion readiness
          if (signals.hasForm) {
            conversionReadiness += 25;
            growthSignals += 8;
          } else {
            findings.push({
              domain: "website",
              severity: "opportunity",
              title: "No enquiry form detected on homepage",
              detail:
                "We did not find a form — visitors may struggle to convert into leads.",
              recommendedAction: "Add a clear enquiry path above the fold.",
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
              title: "Weak call-to-action language",
              detail:
                "Homepage copy may not clearly invite contact, booking or enquiry.",
              recommendedAction: "Strengthen primary CTAs and contact pathways.",
            });
          }
          if (!signals.hasTelLink && !signals.hasMailto && !signals.hasForm) {
            findings.push({
              domain: "website",
              severity: "warning",
              title: "Limited contact pathways",
              detail: "No obvious phone, email or form path detected on the homepage.",
              recommendedAction: "Make contact options unmistakable.",
            });
            conversionReadiness = Math.min(conversionReadiness, 35);
          }

          // Reputation & presence
          if (signals.hasMapsOrGbpHint) {
            reputation += 25;
            growthSignals += 10;
          } else {
            findings.push({
              domain: "gbp",
              severity: "opportunity",
              title: "Google / local presence signals weak",
              detail:
                "No clear Google Maps / Business Profile / LocalBusiness hints on the homepage.",
              recommendedAction:
                "Strengthen Google Business Profile links and local entity markup.",
            });
          }
          if (signals.hasReviewHint) {
            reputation += 20;
          } else {
            findings.push({
              domain: "gbp",
              severity: "opportunity",
              title: "Review / reputation signals not obvious",
              detail:
                "Homepage does not clearly surface reviews, ratings or testimonials.",
              recommendedAction: "Feature recent reviews and rating schema where appropriate.",
            });
          }

          if (signals.hasAnalyticsHint) {
            growthSignals += 15;
          } else {
            findings.push({
              domain: "website",
              severity: "opportunity",
              title: "Analytics / tracking not detected",
              detail:
                "We did not observe common analytics tags — measurement of visibility and leads may be incomplete.",
              recommendedAction: "Confirm analytics and conversion tracking is installed.",
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
      probes.error = err instanceof Error ? err.message : "fetch_failed";
      findings.push({
        domain: "website",
        severity: "critical",
        title: "Website unreachable",
        detail: `Live probe failed${probes.error ? `: ${probes.error}` : ""}.`,
        recommendedAction: "Verify DNS/hosting before investing in SEO or AI Visibility.",
      });
      websiteHealth = 12;
      seo = 8;
      aiVisibility = 5;
      reputation = 12;
      conversionReadiness = 10;
      growthSignals = 10;
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
        title: "Location not recorded",
        detail: "Without a location we cannot prioritise GBP / local SEO angles yet.",
        recommendedAction: "Add suburb/city so the opportunity report can localise recommendations.",
      });
    }
  }

  const websiteHealthScore = clampScore(websiteHealth);
  const seoScore = clampScore(seo);
  const aiVisibilityScore = clampScore(aiVisibility);
  const reputationScore = clampScore(reputation);
  const conversionScore = clampScore(conversionReadiness);
  const growthScore = clampScore(growthSignals);

  const businessHealth = clampScore(
    websiteHealthScore * 0.22 +
      seoScore * 0.2 +
      aiVisibilityScore * 0.2 +
      reputationScore * 0.14 +
      conversionScore * 0.14 +
      growthScore * 0.1,
  );

  if (businessHealth < 45) {
    findings.unshift({
      domain: "website",
      severity: "critical",
      title: "Low DigitalGate Business Health Score™",
      detail: `Composite score ${businessHealth}/100 from live presence probes — strong opening for a DigitalGate conversation.`,
      recommendedAction: "Lead with Website Health + AI Visibility in the opportunity report.",
    });
  }

  return {
    scores: {
      businessHealth,
      websiteHealth: websiteHealthScore,
      seo: seoScore,
      aiVisibility: aiVisibilityScore,
      reputation: reputationScore,
      conversionReadiness: conversionScore,
      growthSignals: growthScore,
      googleBusinessProfile: reputationScore,
      digitalIdentity: websiteHealthScore,
    },
    findings,
    probes,
  };
}
