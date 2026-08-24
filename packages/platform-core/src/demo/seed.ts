import { createActivity } from "../activities";
import { createCompany } from "../companies";
import { createContact } from "../contacts";
import { createOpportunity } from "../opportunities";
import { createTask } from "../tasks";
import { DEMO_ORG_NAME, DEMO_ORG_SLUG, DEMO_SEED_VERSION } from "./types";

const DEMO_APPS = [
  "crm",
  "commerce",
  "documents",
  "communications",
  "websites",
  "opportunities",
  "real-estate",
  "accommodation",
  "reviews",
  "marketing",
  "automation",
  "ai-visibility",
  "seo",
  "analytics",
];

type OrgSettings = {
  demo?: { enabled: boolean; seedVersion: number; seededAt: string };
  apps?: { enabled: string[] };
  featureFlags?: Record<string, boolean>;
};

export async function ensureDemoOrganisation(): Promise<{
  organisationId: string;
  slug: string;
  created: boolean;
}> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.organisation.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (existing) {
    return { organisationId: existing.id, slug: existing.slug, created: false };
  }

  const created = await prisma.organisation.create({
    data: {
      name: DEMO_ORG_NAME,
      slug: DEMO_ORG_SLUG,
      status: "demo",
      industry: "real_estate",
      timezone: "Australia/Brisbane",
      locale: "en-AU",
      currency: "AUD",
      settings: {
        demo: {
          enabled: true,
          seedVersion: 0,
          seededAt: "",
        },
        apps: { enabled: DEMO_APPS },
        featureFlags: {
          "re.beta": true,
          "acc.beta": true,
          "websites.builder": true,
          "billing.platform_exempt": true,
        },
      },
    },
  });

  return { organisationId: created.id, slug: created.slug, created: true };
}

export async function grantDemoAccess(input: {
  clerkUserId: string;
  email?: string;
  displayName?: string;
  access: "customer" | "partner";
}): Promise<{ organisationId: string }> {
  const { organisationId } = await ensureDemoOrganisation();
  await resetDemoOrganisationIfEmpty(organisationId);

  const { prisma } = await import("@dg/database");
  const role = input.access === "partner" ? "demo:partner" : "demo:customer";
  const existing = await prisma.membership.findUnique({
    where: {
      organisationId_clerkUserId: {
        organisationId,
        clerkUserId: input.clerkUserId,
      },
    },
  });
  if (existing) {
    if (existing.role !== "dg:staff" && existing.role !== role) {
      await prisma.membership.update({
        where: { id: existing.id },
        data: { role },
      });
    }
    return { organisationId };
  }

  await prisma.membership.create({
    data: {
      organisationId,
      clerkUserId: input.clerkUserId,
      role,
      status: "active",
      email: input.email ?? null,
      displayName: input.displayName ?? null,
    },
  });
  return { organisationId };
}

async function resetDemoOrganisationIfEmpty(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const count = await prisma.contact.count({ where: { organisationId, deletedAt: null } });
  if (count === 0) await resetDemoOrganisation(organisationId);
}

export async function resetDemoOrganisation(organisationId?: string): Promise<{
  organisationId: string;
  contacts: number;
}> {
  const { prisma } = await import("@dg/database");
  const org =
    organisationId
      ? await prisma.organisation.findUnique({ where: { id: organisationId } })
      : await prisma.organisation.findUnique({ where: { slug: DEMO_ORG_SLUG } });

  const ensured = org ?? (await prisma.organisation.findUnique({
    where: { slug: (await ensureDemoOrganisation()).slug },
  }));
  if (!ensured) {
    const created = await ensureDemoOrganisation();
    return resetDemoOrganisation(created.organisationId);
  }

  const id = ensured.id;

  await prisma.task.deleteMany({ where: { organisationId: id } });
  await prisma.activity.deleteMany({ where: { organisationId: id } });
  await prisma.opportunity.deleteMany({ where: { organisationId: id } });
  await prisma.lead.deleteMany({ where: { organisationId: id } });
  await prisma.contact.deleteMany({ where: { organisationId: id } });
  await prisma.company.deleteMany({ where: { organisationId: id } });

  const company = await createCompany({
    organisationId: id,
    name: "Harbour & Co Property",
    website: "https://harbourandco.example",
    phone: "07 5550 1200",
    email: "hello@harbourandco.example",
    industry: "Real Estate",
  });

  const people = [
    { firstName: "Sarah", lastName: "Nguyen", email: "sarah.nguyen@example.com", phone: "0412 555 101", tags: "vendor,demo" },
    { firstName: "James", lastName: "O'Connor", email: "james.oconnor@example.com", phone: "0413 555 202", tags: "buyer,demo" },
    { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@example.com", phone: "0414 555 303", tags: "landlord,demo" },
    { firstName: "Tom", lastName: "Walsh", email: "tom.walsh@example.com", phone: "0415 555 404", tags: "tenant,demo" },
    { firstName: "Elena", lastName: "Rossi", email: "elena.rossi@example.com", phone: "0416 555 505", tags: "vendor,appraisal,demo" },
  ];

  const contacts = [];
  for (const person of people) {
    contacts.push(
      await createContact({
        organisationId: id,
        ...person,
        source: "demo_seed",
        companyId: company.id,
      }),
    );
  }

  await createOpportunity({
    organisationId: id,
    title: "12 Seaview Terrace — vendor listing",
    stage: "appraisal",
    contactId: contacts[0]?.id,
    companyId: company.id,
    valueCents: 1_250_000_00,
    pipelineId: "real_estate",
    metadata: { demoSeed: true, suburb: "Mermaid Beach" },
  });
  await createOpportunity({
    organisationId: id,
    title: "Buyer enquiry — 3-bed near the light rail",
    stage: "qualified",
    contactId: contacts[1]?.id,
    companyId: company.id,
    valueCents: 890_000_00,
    pipelineId: "real_estate",
    metadata: { demoSeed: true },
  });
  await createOpportunity({
    organisationId: id,
    title: "Holiday let — onboarding new manager",
    stage: "onboarding",
    contactId: contacts[2]?.id,
    companyId: company.id,
    pipelineId: "accommodation",
    metadata: { demoSeed: true },
  });

  await createTask({
    organisationId: id,
    title: "Prepare CMA for 12 Seaview Terrace",
    status: "open",
    entityType: "contact",
    entityId: contacts[0]?.id,
    sourceApp: "real-estate",
  });
  await createTask({
    organisationId: id,
    title: "Follow up buyer after Saturday inspections",
    status: "open",
    entityType: "contact",
    entityId: contacts[1]?.id,
    sourceApp: "crm",
  });

  await createActivity({
    organisationId: id,
    entityType: "organisation",
    entityId: id,
    activityType: "note",
    title: "Demo workspace restored",
    body: "Sample Gold Coast agency data. Safe to explore — Reset Demo restores this state.",
    sourceApp: "demo",
  });

  const prev = (ensured.settings as OrgSettings | null) ?? {};
  await prisma.organisation.update({
    where: { id },
    data: {
      status: "demo",
      name: DEMO_ORG_NAME,
      settings: {
        ...prev,
        demo: {
          enabled: true,
          seedVersion: DEMO_SEED_VERSION,
          seededAt: new Date().toISOString(),
        },
        apps: { enabled: DEMO_APPS },
        featureFlags: {
          ...(prev.featureFlags ?? {}),
          "re.beta": true,
          "acc.beta": true,
          "websites.builder": true,
          "billing.platform_exempt": true,
        },
      },
    },
  });

  return { organisationId: id, contacts: contacts.length };
}
