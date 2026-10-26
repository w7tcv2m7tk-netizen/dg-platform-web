/** API namespaces that serve data owned by paid Industry Apps. */
export function industryAppForProtectedApiPath(pathname: string): string | null {
  if (/^\/api\/v1\/(?:accommodation|migrations\/wordpress\/accommodation)(?:\/|$)/.test(pathname)) return "accommodation";
  if (/^\/api\/v1\/(?:re|properties|migrations\/wordpress\/real-estate)(?:\/|$)/.test(pathname)) return "real-estate";
  if (/^\/api\/v1\/connectors\/(?:rea|corelogic)(?:\/|$)/.test(pathname)) return "real-estate";
  return null;
}

/** API namespaces whose route handlers serve separately paid Growth apps. */
export function paidAppForProtectedApiPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/v1\/(advertising|marketing|prospecting|ai-visibility|seo|automation|analytics|social)(?:\/|$)/);
  return match?.[1] ?? null;
}
