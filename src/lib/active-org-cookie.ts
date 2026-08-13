export const ACTIVE_ORG_COOKIE = "dg_active_org";

export async function readActiveOrganisationId(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const value = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value?.trim();
  return value || undefined;
}

export async function writeActiveOrganisationId(organisationId: string) {
  const { cookies } = await import("next/headers");
  (await cookies()).set(ACTIVE_ORG_COOKIE, organisationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
