/**
 * Apply AI (or heuristic) SEO fixes from a Page Audit to the org's Studio site.
 * Writes title / meta description / Open Graph. Domain, DNS, analytics stay manual.
 */

import { createActivity } from "../activities";
import { llmChat, llmConfigured } from "../ai/llm";
import type { ProspectAuditFinding } from "../command-centre/growth-engine/types";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { listWebsitesWithPages, updateWebsite, updateWebsitePage } from "../websites/crud";
import type { WebsiteSeo } from "../websites/types";

/** Subset of OrgSeoAuditProbes used for metadata decisions (avoids circular import). */
type SeoFixProbes = {
  title: string | null;
  hasMetaDescription: boolean;
  hasOpenGraph: boolean;
};

export type SeoFixItemStatus = "fixed" | "skipped" | "manual";

export type SeoFixItem = {
  id: string;
  label: string;
  status: SeoFixItemStatus;
  detail: string;
};

export type FixOrgSeoResult = {
  applied: boolean;
  source: "llm" | "heuristic" | "none";
  websiteId: string | null;
  pageId: string | null;
  pageSlug: string | null;
  seo: WebsiteSeo | null;
  items: SeoFixItem[];
  message: string;
};

type GeneratedSeoCopy = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
};

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function needsTitle(probes: SeoFixProbes | null | undefined, seo: WebsiteSeo | null): boolean {
  if (probes && !probes.title) return true;
  return !seo?.title?.trim();
}

function needsDescription(
  probes: SeoFixProbes | null | undefined,
  seo: WebsiteSeo | null,
): boolean {
  if (probes && !probes.hasMetaDescription) return true;
  return !seo?.description?.trim();
}

function needsOpenGraph(
  probes: SeoFixProbes | null | undefined,
  seo: WebsiteSeo | null,
): boolean {
  if (probes && !probes.hasOpenGraph) return true;
  return !seo?.ogTitle?.trim() && !seo?.ogDescription?.trim();
}

function heuristicSeoCopy(input: {
  businessName: string;
  industry?: string | null;
  location?: string | null;
  brief?: string | null;
}): GeneratedSeoCopy {
  const biz = input.businessName.trim() || "Business";
  const industry = input.industry?.trim();
  const location = input.location?.trim();
  const where = location ? ` in ${location}` : "";
  const what = industry ? ` — ${industry}` : "";
  const title = clip(`${biz}${what}${where}`, 60);
  const description = clip(
    input.brief?.trim() ||
      `${biz} helps businesses grow with clear digital systems${where}. Explore services, get in touch, and start with a conversation.`,
    155,
  );
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    keywords: [biz, industry, location, "Australia"]
      .filter((k): k is string => Boolean(k && k.trim()))
      .map((k) => k.toLowerCase())
      .slice(0, 8),
  };
}

async function llmSeoCopy(input: {
  businessName: string;
  industry?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  brief?: string | null;
  findings: ProspectAuditFinding[];
  current: WebsiteSeo | null;
}): Promise<GeneratedSeoCopy | null> {
  if (!llmConfigured()) return null;
  try {
    const result = await llmChat({
      maxTokens: 800,
      tier: "standard",
      messages: [
        {
          role: "system",
          content: [
            "You write SEO metadata for Australian businesses.",
            "Return ONLY JSON:",
            '{ "title": string, "description": string, "ogTitle": string, "ogDescription": string, "keywords": string[] }',
            "title ≤ 60 chars. description ≤ 155 chars. Australian English.",
            "No HTML. No markdown fences. Make title and description unique and commercial.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            businessName: input.businessName,
            industry: input.industry,
            location: input.location,
            websiteUrl: input.websiteUrl,
            brief: input.brief,
            currentSeo: input.current,
            auditFindings: input.findings.slice(0, 12).map((f) => ({
              severity: f.severity,
              title: f.title,
              detail: f.detail,
            })),
          }),
        },
      ],
    });
    const text = result.text.trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = fenced?.[1]?.trim() ?? text;
    const parsed = JSON.parse(jsonText) as Partial<GeneratedSeoCopy>;
    if (!parsed.title || !parsed.description) return null;
    return {
      title: clip(String(parsed.title), 60),
      description: clip(String(parsed.description), 155),
      ogTitle: clip(String(parsed.ogTitle || parsed.title), 60),
      ogDescription: clip(String(parsed.ogDescription || parsed.description), 155),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).filter(Boolean).slice(0, 12)
        : [],
    };
  } catch {
    return null;
  }
}

function manualItemsFromFindings(findings: ProspectAuditFinding[]): SeoFixItem[] {
  const manual: SeoFixItem[] = [];
  const seen = new Set<string>();
  for (const f of findings) {
    const title = f.title.toLowerCase();
    const isMeta =
      title.includes("page title") ||
      title.includes("meta description") ||
      title.includes("open graph") ||
      title.includes("og:");
    if (isMeta) continue;

    const isStudioInfra =
      title.includes("custom domain") ||
      title.includes("dns") ||
      title.includes("ssl") ||
      title.includes("search indexing");
    const isOps =
      title.includes("analytics") ||
      title.includes("enquiry") ||
      title.includes("contact") ||
      title.includes("location") ||
      title.includes("gbp") ||
      title.includes("health score");

    if (!isStudioInfra && !isOps) continue;
    const id = isStudioInfra ? `studio:${title}` : `ops:${title}`;
    if (seen.has(id)) continue;
    seen.add(id);
    manual.push({
      id,
      label: f.title,
      status: "manual",
      detail:
        f.recommendedAction ||
        (isStudioInfra
          ? "Fix in Website Studio → Domains / Publish"
          : "Needs a content or ops change outside AI metadata"),
    });
  }
  return manual;
}

/** Apply AI SEO metadata fixes from Page Audit probes/findings. */
export async function fixOrgSeoFromAudit(input: {
  organisationId: string;
  actorId?: string;
  websiteUrl?: string | null;
  findings?: ProspectAuditFinding[];
  probes?: SeoFixProbes | null;
}): Promise<FixOrgSeoResult> {
  const findings = input.findings ?? [];
  const probes = input.probes ?? null;
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const businessName =
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    "Business";
  const location = profile?.address
    ? [profile.address.city, profile.address.state].filter(Boolean).join(", ")
    : null;

  const sites = await listWebsitesWithPages(input.organisationId);
  const website = sites[0] ?? null;
  if (!website) {
    return {
      applied: false,
      source: "none",
      websiteId: null,
      pageId: null,
      pageSlug: null,
      seo: null,
      items: [
        {
          id: "no-website",
          label: "Studio website required",
          status: "manual",
          detail: "Create or import a website in Design Studio before AI can apply SEO metadata.",
        },
        ...manualItemsFromFindings(findings),
      ],
      message: "No Studio website found — AI SEO fixes need a site to write to.",
    };
  }

  const pages = website.pages ?? [];
  const home =
    pages.find((p) => p.slug === "home" || p.intent === "home") ||
    pages.find((p) => p.slug === "/" || p.sortOrder === 0) ||
    pages[0];

  if (!home) {
    return {
      applied: false,
      source: "none",
      websiteId: website.id,
      pageId: null,
      pageSlug: null,
      seo: null,
      items: [
        {
          id: "no-home",
          label: "Homepage missing",
          status: "manual",
          detail: "Add a homepage in Website Studio, then run Fix SEO again.",
        },
      ],
      message: "Studio site has no pages to update.",
    };
  }

  const current = home.seo ?? website.seo ?? null;
  const fixTitle = needsTitle(probes, current);
  const fixDesc = needsDescription(probes, current);
  const fixOg = needsOpenGraph(probes, current);

  if (!fixTitle && !fixDesc && !fixOg) {
    return {
      applied: false,
      source: "none",
      websiteId: website.id,
      pageId: home.id,
      pageSlug: home.slug,
      seo: current,
      items: [
        {
          id: "metadata-ok",
          label: "Title, description & Open Graph",
          status: "skipped",
          detail: "Studio metadata already present — re-run the audit after publish if probes still fail.",
        },
        ...manualItemsFromFindings(findings),
      ],
      message: "Nothing metadata-related to fix automatically.",
    };
  }

  const context = {
    businessName,
    industry: profile?.industryVertical ?? null,
    location,
    websiteUrl: input.websiteUrl ?? profile?.websiteUrl ?? null,
    brief: website.brief,
    findings,
    current,
  };

  let source: "llm" | "heuristic" = "heuristic";
  let copy = await llmSeoCopy(context);
  if (copy) {
    source = "llm";
  } else {
    copy = heuristicSeoCopy(context);
  }

  const nextSeo: WebsiteSeo = {
    ...(current ?? {}),
    title: fixTitle || !current?.title?.trim() ? copy.title : current!.title,
    description:
      fixDesc || !current?.description?.trim() ? copy.description : current!.description,
    ogTitle: fixOg || !current?.ogTitle?.trim() ? copy.ogTitle : current!.ogTitle,
    ogDescription:
      fixOg || !current?.ogDescription?.trim()
        ? copy.ogDescription
        : current!.ogDescription,
    keywords: current?.keywords?.length ? current.keywords : copy.keywords,
    modifiedAt: new Date().toISOString(),
  };

  await updateWebsitePage({
    organisationId: input.organisationId,
    websiteId: website.id,
    pageId: home.id,
    actorId: input.actorId,
    seo: nextSeo,
  });

  await updateWebsite({
    organisationId: input.organisationId,
    websiteId: website.id,
    actorId: input.actorId,
    seo: {
      ...(website.seo ?? {}),
      title: website.seo?.title?.trim() || nextSeo.title,
      description: website.seo?.description?.trim() || nextSeo.description,
      ogTitle: website.seo?.ogTitle?.trim() || nextSeo.ogTitle,
      ogDescription: website.seo?.ogDescription?.trim() || nextSeo.ogDescription,
      keywords: website.seo?.keywords?.length ? website.seo.keywords : nextSeo.keywords,
    },
  });

  const items: SeoFixItem[] = [];
  if (fixTitle) {
    items.push({
      id: "title",
      label: "Page title",
      status: "fixed",
      detail: nextSeo.title ?? "",
    });
  }
  if (fixDesc) {
    items.push({
      id: "description",
      label: "Meta description",
      status: "fixed",
      detail: nextSeo.description ?? "",
    });
  }
  if (fixOg) {
    items.push({
      id: "open-graph",
      label: "Open Graph tags",
      status: "fixed",
      detail: `${nextSeo.ogTitle} — ${nextSeo.ogDescription}`,
    });
  }
  items.push(...manualItemsFromFindings(findings));

  await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Website",
    entityId: website.id,
    activityType: "seo.fix_applied",
    title: `SEO fix applied · ${source}`,
    body: `Updated homepage SEO metadata (${home.slug})`,
    sourceApp: "seo",
    metadata: {
      source,
      pageId: home.id,
      pageSlug: home.slug,
      seo: nextSeo,
      items,
    },
  });

  const fixedCount = items.filter((i) => i.status === "fixed").length;
  const manualCount = items.filter((i) => i.status === "manual").length;

  return {
    applied: true,
    source,
    websiteId: website.id,
    pageId: home.id,
    pageSlug: home.slug,
    seo: nextSeo,
    items,
    message:
      manualCount > 0
        ? `Applied ${fixedCount} SEO metadata fix${fixedCount === 1 ? "" : "es"}. ${manualCount} item${manualCount === 1 ? "" : "s"} still need manual follow-up.`
        : `Applied ${fixedCount} SEO metadata fix${fixedCount === 1 ? "" : "es"}. Re-run the audit to confirm.`,
  };
}
