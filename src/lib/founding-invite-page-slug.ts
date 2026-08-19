/** Server-safe parser for public Founding 10 invite URLs (by-host page query). */
export function parseFoundingInvitePageSlug(pageSlug?: string): string | null {
  const match = (pageSlug || "").trim().match(/^founding-customers\/invite\/([^/]+)$/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
