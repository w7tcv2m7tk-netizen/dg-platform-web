function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

function publicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

export function foundingSetupUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${appOrigin()}/founding/setup?invite=${token}`;
}

export function foundingAgreementUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${appOrigin()}/founding/agreement?invite=${token}`;
}

export function foundingOnboardingUrl(inviteToken?: string | null): string {
  const base = `${appOrigin()}/onboarding`;
  const token = inviteToken?.trim();
  return token ? `${base}?invite=${encodeURIComponent(token)}` : base;
}

export function foundingImplementationUrl(): string {
  return `${appOrigin()}/implementation`;
}

/** Personal invitation — public site, not the generic application form. */
export function foundingPersonalInviteUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${publicSiteOrigin()}/founding-customers/invite/${token}`;
}
