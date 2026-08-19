import { DEMO_ORG_SLUG, parseDemoSettings, type DemoAccess } from "./types";

export async function getOrganisationDemoState(organisationId: string): Promise<{
  isDemo: boolean;
  slug: string | null;
} | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { slug: true, status: true, settings: true },
  });
  if (!org) return null;
  const demo = parseDemoSettings(org.settings);
  return {
    isDemo: org.status === "demo" || org.slug === DEMO_ORG_SLUG || Boolean(demo?.enabled),
    slug: org.slug,
  };
}

export function demoAccessFromRole(role: string): DemoAccess {
  if (role === "dg:staff" || role === "owner") return "staff";
  if (role === "demo:partner") return "partner";
  return "customer";
}

export async function isDemoOrganisationId(organisationId: string): Promise<boolean> {
  const state = await getOrganisationDemoState(organisationId);
  return Boolean(state?.isDemo);
}
