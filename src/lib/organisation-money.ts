export type OrganisationMoneySettings = {
  currency: string;
  locale: string;
};

export async function getOrganisationMoneySettings(
  organisationId: string,
): Promise<OrganisationMoneySettings> {
  const fallback = { currency: "AUD", locale: "en-AU" };
  if (!process.env.DATABASE_URL) return fallback;

  const { prisma } = await import("@dg/database");
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { currency: true, locale: true },
  });

  return {
    currency: organisation?.currency?.trim().toUpperCase() || fallback.currency,
    locale: organisation?.locale?.trim() || fallback.locale,
  };
}

export function formatMoneyFromCents(
  cents: number | null | undefined,
  settings: OrganisationMoneySettings,
): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  try {
    return new Intl.NumberFormat(settings.locale, {
      style: "currency",
      currency: settings.currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }
}
