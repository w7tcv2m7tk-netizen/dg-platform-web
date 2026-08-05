/**
 * Platform Gen 2 roadmap — single source for progress UI and coming-soon placeholders.
 * Update status here as features ship.
 */

export type RoadmapStatus = "done" | "in_progress" | "scaffold" | "planned";

export type RoadmapPriority = "high" | "medium" | "low";

export interface RoadmapItem {
  id: string;
  area: string;
  label: string;
  description: string;
  status: RoadmapStatus;
  priority?: RoadmapPriority;
  href?: string;
  appId?: string;
}

const STATUS_WEIGHT: Record<RoadmapStatus, number> = {
  done: 1,
  in_progress: 0.65,
  scaffold: 0.35,
  planned: 0.05,
};

export const PLATFORM_ROADMAP: RoadmapItem[] = [
  // —— Platform ——
  {
    id: "platform.auth",
    area: "Platform",
    label: "Auth & org provisioning",
    description: "Clerk sign-in, Postgres orgs, team members",
    status: "done",
    href: "/dashboard",
  },
  {
    id: "platform.setup",
    area: "Platform",
    label: "Setup checklist",
    description: "Onboarding progress tracked in Postgres",
    status: "done",
    href: "/dashboard",
  },
  {
    id: "platform.apps",
    area: "Platform",
    label: "Apps registry & navigation",
    description: "Manifest-driven apps, tiers, and sidebar nav",
    status: "done",
    href: "/dashboard/apps",
  },
  {
    id: "platform.roadmap",
    area: "Platform",
    label: "Roadmap & progress UI",
    description: "Overview progress bar and coming-soon placeholders",
    status: "done",
    href: "/dashboard",
  },

  // —— CRM ——
  {
    id: "crm.contacts",
    area: "CRM",
    label: "Contacts",
    description: "Create, view, and manage contacts",
    status: "done",
    appId: "crm",
    href: "/apps/crm/contacts",
  },
  {
    id: "crm.companies",
    area: "CRM",
    label: "Companies",
    description: "Company records linked to contacts",
    status: "planned",
    appId: "crm",
    href: "/apps/crm/companies",
  },
  {
    id: "crm.timeline",
    area: "CRM",
    label: "Unified timeline",
    description: "Cross-entity activity feed",
    status: "scaffold",
    appId: "crm",
  },
  {
    id: "crm.import",
    area: "CRM",
    label: "Import & export",
    description: "CSV import and bulk export",
    status: "planned",
    appId: "crm",
  },

  // —— Real Estate ——
  {
    id: "re.vendor_leads",
    area: "Real Estate",
    label: "Vendor leads pipeline",
    description: "Kanban stages, WordPress sync, lead detail",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/vendor-leads",
  },
  {
    id: "re.properties",
    area: "Real Estate",
    label: "Properties & appraisals",
    description: "Property records, geocoding, status workflow",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/properties",
  },
  {
    id: "re.pipeline_sync",
    area: "Real Estate",
    label: "Lead ↔ property sync",
    description: "Bidirectional stage/status sync and WP upsert",
    status: "done",
    priority: "high",
    appId: "real-estate",
  },
  {
    id: "re.buyers",
    area: "Real Estate",
    label: "Buyer leads",
    description: "Buyer pipeline and matching",
    status: "planned",
    appId: "real-estate",
  },
  {
    id: "re.settlements",
    area: "Real Estate",
    label: "Settlements",
    description: "Settlement checklist and conveyancing handoff",
    status: "planned",
    appId: "real-estate",
  },

  // —— Commerce ——
  {
    id: "commerce.payments",
    area: "Commerce",
    label: "Payment requests & Stripe checkout",
    description: "Checkout links on vendor leads, webhook + success fallback",
    status: "in_progress",
    priority: "high",
    appId: "commerce",
    href: "/apps/commerce/payments",
  },
  {
    id: "commerce.payment_history",
    area: "Commerce",
    label: "Payment history UI",
    description: "Per-lead payment request list and status",
    status: "done",
    appId: "commerce",
    href: "/apps/re/vendor-leads",
  },
  {
    id: "commerce.quotes",
    area: "Commerce",
    label: "Quotes",
    description: "Quote engine, API, and list view",
    status: "scaffold",
    priority: "medium",
    appId: "commerce",
    href: "/apps/commerce/quotes",
  },
  {
    id: "commerce.invoices",
    area: "Commerce",
    label: "Invoices",
    description: "Invoice engine, send flow, and list view",
    status: "scaffold",
    priority: "medium",
    appId: "commerce",
    href: "/apps/commerce/invoices",
  },
  {
    id: "commerce.financial_health",
    area: "Commerce",
    label: "Twin financial health",
    description: "Revenue MTD/YTD, AR, overdue snapshot",
    status: "scaffold",
    appId: "commerce",
    href: "/apps/commerce",
  },
  {
    id: "commerce.products",
    area: "Commerce",
    label: "Products & catalog",
    description: "Product catalogue for quotes and checkout",
    status: "planned",
    appId: "commerce",
    href: "/apps/commerce/products",
  },
  {
    id: "commerce.subscriptions",
    area: "Commerce",
    label: "Subscriptions & MRR",
    description: "Recurring billing and subscription management",
    status: "planned",
    appId: "commerce",
    href: "/apps/commerce/subscriptions",
  },

  // —— Websites ——
  {
    id: "websites.health",
    area: "Websites",
    label: "Website Health Centre",
    description: "WordPress health score, PageSpeed, SSL checks",
    status: "done",
    priority: "medium",
    appId: "websites",
    href: "/apps/websites/health",
  },
  {
    id: "websites.multi_site",
    area: "Websites",
    label: "Multi-site health",
    description: "Site picker and DG_WP_HEALTH_SITES config",
    status: "scaffold",
    appId: "websites",
    href: "/apps/websites/health",
  },
  {
    id: "websites.studio",
    area: "Websites",
    label: "AI Website Studio",
    description: "Generate sites, pages, and copy with AI",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/studio",
  },
  {
    id: "websites.content",
    area: "Websites",
    label: "Content Studio",
    description: "Blog, suburb pages, and social content",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/content",
  },
  {
    id: "websites.funnels",
    area: "Websites",
    label: "Funnel Builder",
    description: "Landing pages and conversion funnels",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/funnels",
  },
  {
    id: "websites.sites",
    area: "Websites",
    label: "Sites manager",
    description: "Connected sites, domains, and publish status",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/sites",
  },

  // —— Automation ——
  {
    id: "automation.engine",
    area: "Automation",
    label: "Automation engine",
    description: "In-process rules, triggers from app manifests",
    status: "scaffold",
    priority: "low",
  },
  {
    id: "automation.ui",
    area: "Automation",
    label: "Automation builder UI",
    description: "Visual trigger → action rules per org",
    status: "planned",
  },
  {
    id: "automation.commerce_rules",
    area: "Automation",
    label: "Commerce automations",
    description: "Payment completed, quote accepted, invoice overdue",
    status: "scaffold",
  },

  // —— AI Communications ——
  {
    id: "comms.stub",
    area: "AI Communications",
    label: "Messages API stub",
    description: "Queued send intent — providers not wired",
    status: "scaffold",
    appId: "ai-communications",
  },
  {
    id: "comms.inbox",
    area: "AI Communications",
    label: "Unified inbox",
    description: "Email, SMS, and chat threads",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/inbox",
  },
  {
    id: "comms.voice",
    area: "AI Communications",
    label: "Voice agents",
    description: "Inbound/outbound AI voice",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/voice",
  },
  {
    id: "comms.agents",
    area: "AI Communications",
    label: "Agent builder",
    description: "Configure AI agents and knowledge",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/agents",
  },

  // —— Growth ——
  {
    id: "seo.audit",
    area: "SEO & Visibility",
    label: "SEO page audit",
    description: "On-page and technical SEO scoring",
    status: "planned",
    appId: "seo",
    href: "/apps/seo/audit",
  },
  {
    id: "ai_vis.dashboard",
    area: "SEO & Visibility",
    label: "AI Visibility dashboard",
    description: "Brand presence across AI platforms",
    status: "planned",
    appId: "ai-visibility",
    href: "/apps/ai-visibility",
  },

  // —— Infrastructure ——
  {
    id: "infra.domains",
    area: "Infrastructure",
    label: "Domains",
    description: "Domain registration and renewal",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/domains",
  },
  {
    id: "infra.dns",
    area: "Infrastructure",
    label: "DNS management",
    description: "DNS records and propagation checks",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/dns",
  },
  {
    id: "infra.monitoring",
    area: "Infrastructure",
    label: "Monitoring",
    description: "Uptime and performance monitoring",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/monitoring",
  },
];

export function getRoadmapItem(id: string): RoadmapItem | undefined {
  return PLATFORM_ROADMAP.find((item) => item.id === id);
}

export function getRoadmapByArea() {
  const areas = new Map<string, RoadmapItem[]>();
  for (const item of PLATFORM_ROADMAP) {
    const list = areas.get(item.area) ?? [];
    list.push(item);
    areas.set(item.area, list);
  }
  return [...areas.entries()].map(([area, items]) => ({ area, items }));
}

export function getRoadmapForApp(appId: string) {
  return PLATFORM_ROADMAP.filter((item) => item.appId === appId);
}

export interface RoadmapSummary {
  total: number;
  done: number;
  inProgress: number;
  scaffold: number;
  planned: number;
  percentComplete: number;
  label: string;
}

export function getRoadmapSummary(): RoadmapSummary {
  const total = PLATFORM_ROADMAP.length;
  const done = PLATFORM_ROADMAP.filter((i) => i.status === "done").length;
  const inProgress = PLATFORM_ROADMAP.filter((i) => i.status === "in_progress").length;
  const scaffold = PLATFORM_ROADMAP.filter((i) => i.status === "scaffold").length;
  const planned = PLATFORM_ROADMAP.filter((i) => i.status === "planned").length;

  const weighted = PLATFORM_ROADMAP.reduce((sum, item) => sum + STATUS_WEIGHT[item.status], 0);
  const percentComplete = total ? Math.round((weighted / total) * 100) : 0;

  return {
    total,
    done,
    inProgress,
    scaffold,
    planned,
    percentComplete,
    label: `Platform Gen 2 · ${percentComplete}% complete`,
  };
}

export function roadmapStatusLabel(status: RoadmapStatus): string {
  switch (status) {
    case "done":
      return "Done";
    case "in_progress":
      return "In progress";
    case "scaffold":
      return "Scaffold";
    case "planned":
      return "Coming soon";
  }
}
