#!/usr/bin/env node
/**
 * Ensure dedicated product funnel subdomains:
 *   audit.digitalgate.com.au  → DigitalGate Business Audit™
 *   report.roerealty.com.au   → Roe Realty Property Report™
 *
 * Usage:
 *   node --env-file=.env.local scripts/ensure-product-funnel-subdomains.mjs
 *   node --env-file=.env.local scripts/ensure-product-funnel-subdomains.mjs --vercel
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const attachVercel = process.argv.includes("--vercel");

const FUNNELS = [
  {
    template: "business_audit",
    preferredSlug: "digitalgate-audit",
    hostname: "audit.digitalgate.com.au",
    displayName: "DigitalGate",
    match: (hay) => hay.includes("digitalgate") || hay.includes("digital gate"),
    theme: {
      primaryColor: "#3B82F6",
      accentColor: "#10B981",
      backgroundColor: "#0A0E17",
      businessName: "DigitalGate",
    },
    seo: {
      title: "Free DigitalGate Business Audit™ | DigitalGate",
      description:
        "Free DigitalGate Business Audit™ — website health, search, AI visibility, reputation and conversion readiness.",
      ogTitle: "See how your business performs across the digital world",
      ogDescription:
        "Get an instant snapshot of your website, search presence, AI visibility and digital foundations.",
    },
    pageTitle: "Free Digital Business Audit™",
    capturePath: "gen2_public_business_audit",
    leadSource: "free_audit",
  },
  {
    template: "property_report",
    preferredSlug: "roe-realty-report",
    hostname: "report.roerealty.com.au",
    displayName: "Roe Realty",
    match: (hay) =>
      hay.includes("roe realty") ||
      hay.includes("roerealty") ||
      hay.includes("roe-realty"),
    theme: {
      primaryColor: "#C9A46C",
      accentColor: "#1C2B2A",
      backgroundColor: "#1C2B2A",
      businessName: "Roe Realty",
    },
    seo: {
      title: "Free Property Report | Roe Realty",
      description:
        "Get your free Roe Realty Property Report™ — value range, buyer demand and comparable sales.",
      ogTitle: "Find Out What Buyers Would Pay for Your Property Right Now",
      ogDescription:
        "Receive a value range, recent comparable sales, and buyer demand insights in minutes.",
    },
    pageTitle: "Free Instant Property Report",
    capturePath: "gen2_public_property_report",
    leadSource: "property_report",
  },
];

async function attachVercelDomain(hostname) {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token || !projectId) {
    console.log(
      `  ⚠ Vercel skip ${hostname} — set VERCEL_TOKEN + VERCEL_PROJECT_ID`,
    );
    return;
  }
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${qs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: hostname }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok || /already|conflict/i.test(JSON.stringify(json))) {
    console.log(`  ✓ Vercel domain ${hostname}`);
  } else {
    console.log(`  ⚠ Vercel ${hostname}: ${res.status}`, json);
  }
}

async function main() {
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, settings: true },
    take: 200,
  });

  for (const funnel of FUNNELS) {
    const org = orgs.find((o) => {
      const hay = `${o.name || ""} ${o.slug || ""}`.toLowerCase();
      return funnel.match(hay);
    });
    if (!org) {
      console.log(`! no org for ${funnel.template}`);
      continue;
    }

    const metadata = {
      kind: "funnel",
      funnelTemplate: funnel.template,
      capturePath: funnel.capturePath,
      productHost: funnel.hostname,
      crm: {
        createsContact: true,
        createsLead: true,
        leadSource: funnel.leadSource,
      },
      generatorSource: "funnel_template",
    };

    const pageSeo = {
      ...funnel.seo,
      showHeader: false,
      showFooter: false,
    };

    let site = await prisma.website.findFirst({
      where: { organisationId: org.id, slug: funnel.preferredSlug },
    });

    if (site) {
      site = await prisma.website.update({
        where: { id: site.id },
        data: {
          name: `${funnel.displayName} — ${funnel.pageTitle}`,
          status: "published",
          theme: funnel.theme,
          seo: funnel.seo,
          metadata,
        },
      });
    } else {
      const clash = await prisma.website.findUnique({
        where: { slug: funnel.preferredSlug },
        select: { id: true },
      });
      const slug = clash
        ? `${funnel.preferredSlug}-${Date.now().toString(36)}`
        : funnel.preferredSlug;
      site = await prisma.website.create({
        data: {
          organisationId: org.id,
          name: `${funnel.displayName} — ${funnel.pageTitle}`,
          slug,
          status: "published",
          theme: funnel.theme,
          seo: funnel.seo,
          metadata,
        },
      });
    }

    const home = await prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: "home" },
    });
    if (home) {
      await prisma.websitePage.update({
        where: { id: home.id },
        data: {
          title: funnel.pageTitle,
          intent: "home",
          status: "published",
          seo: pageSeo,
          components: [],
        },
      });
    } else {
      await prisma.websitePage.create({
        data: {
          websiteId: site.id,
          title: funnel.pageTitle,
          slug: "home",
          intent: "home",
          status: "published",
          sortOrder: 0,
          seo: pageSeo,
          components: [],
        },
      });
    }

    const name = funnel.hostname.toLowerCase();
    let domain = await prisma.infrastructureDomain.findFirst({
      where: { organisationId: org.id, name },
    });
    if (domain) {
      domain = await prisma.infrastructureDomain.update({
        where: { id: domain.id },
        data: {
          websiteId: site.id,
          status: "connected",
          source: "product_funnel",
          managed: false,
        },
      });
    } else {
      domain = await prisma.infrastructureDomain.create({
        data: {
          organisationId: org.id,
          name,
          websiteId: site.id,
          status: "connected",
          source: "product_funnel",
          managed: false,
        },
      });
    }

    const prevMeta =
      site.metadata && typeof site.metadata === "object" ? site.metadata : {};
    await prisma.website.update({
      where: { id: site.id },
      data: {
        metadata: {
          ...prevMeta,
          ...metadata,
          customHostname: name,
          customDomainId: domain.id,
        },
      },
    });

    console.log(
      `✓ ${funnel.hostname} → ${site.slug} (${site.id}) org=${org.name}`,
    );

    if (attachVercel) {
      await attachVercelDomain(funnel.hostname);
    }
  }

  console.log(
    "\nDNS: CNAME audit.digitalgate.com.au + report.roerealty.com.au → cname.vercel-dns.com",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
