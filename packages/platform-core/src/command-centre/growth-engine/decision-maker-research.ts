import { safeExternalFetch } from "./ssrf-guard";

export type DecisionMakerCandidate = {
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  sourceUrl: string;
  evidence: string;
  imageUrl: string | null;
  confidence: "high" | "medium";
  rank: number;
};

function cleanText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function validEmail(value: string | null) {
  if (!value) return null;
  const decoded = decodeURIComponent(value).trim();
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(decoded) ? decoded : null;
}
function validPhone(value: string | null) {
  if (!value) return null;
  const decoded = decodeURIComponent(value).replace(/\s+/g, " ").trim();
  if (/[A-Za-z{};:=!]/.test(decoded)) return null;
  const digits = decoded.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return /^[+()\d .-]+$/.test(decoded) ? decoded : null;
}
function validPersonName(value: string | null) {
  if (!value) return null;
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 80 || /[@{};:=!<>]/.test(name) || /\d/.test(name)) return null;
  return name;
}
function absoluteUrl(href: string, base: string) {
  try {
    const url = new URL(href, base);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}
function leadershipRank(role: string | null) {
  if (!role) return 0;
  const value = role.toLowerCase();
  if (/\b(?:principal|agency principal|owner|founder|co-founder|managing director|licensee(?: in charge)?|chief executive|ceo)\b/.test(value)) return 100;
  if (/\bdirector\b/.test(value)) return 90;
  if (/\b(?:general manager|head of|partner)\b/.test(value)) return 70;
  return 0;
}
function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2f;|&#47;/gi, "/")
    .replace(/&#x3a;|&#58;/gi, ":");
}
function decodeHref(value: string) {
  return decodeEntities(value).trim();
}
function headingCandidates(html: string) {
  return [...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map((match) => ({ index: match.index ?? 0, value: validPersonName(cleanText(match[1] || "")) }))
    .filter((item): item is { index: number; value: string } => Boolean(item.value));
}
function nearestHeading(headings: Array<{ index: number; value: string }>, index: number) {
  return headings.filter((item) => item.index <= index).sort((a,b) => b.index-a.index)[0]?.value ?? null;
}
function nearestRole(text: string) {
  const rolePattern = /\b(?:agency principal|principal|managing director|director|owner|founder|co-founder|licensee(?: in charge)?|chief executive(?: officer)?|ceo|general manager|head of [A-Za-z &-]+|partner)\b/i;
  return text.match(rolePattern)?.[0] ?? null;
}
function candidateImage(html: string, index: number, sourceUrl: string) {
  const before = html.slice(Math.max(0,index-5000), index);
  const matches = [...before.matchAll(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)];
  for (const match of matches.reverse()) {
    const src = match[1] || "";
    if (!src || /(?:logo|icon|sprite|placeholder|data:image)/i.test(src)) continue;
    const absolute = absoluteUrl(decodeEntities(src), sourceUrl);
    if (absolute) return absolute;
  }
  return null;
}
function decodeText(value: string) {
  return decodeEntities(cleanText(value));
}
function leadershipRoleFromText(text: string) {
  const value = decodeText(text);
  const patterns = [
    /\bAgency Principal\b/i, /\bPrincipal\b/i, /\bManaging Director\b/i,
    /\bDirector\b/i, /\bOwner\b/i, /\bFounder\b/i, /\bCo-Founder\b/i,
    /\bLicensee(?: in Charge)?\b/i, /\bChief Executive(?: Officer)?\b/i,
    /\bCEO\b/i, /\bGeneral Manager\b/i, /\bHead of [A-Za-z &-]+\b/i, /\bPartner\b/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return null;
}
function decodeCloudflareEmail(encoded: string | null | undefined): string | null {
  if (!encoded || !/^[0-9a-f]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2 !== 0) return null;
  try {
    const key = parseInt(encoded.slice(0, 2), 16);
    let value = "";
    for (let i = 2; i < encoded.length; i += 2) value += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
    return validEmail(value);
  } catch {
    return null;
  }
}

function expandProtectedEmails(html: string): string {
  return html.replace(
    /<a\b([^>]*?)href=["'][^"']*\/cdn-cgi\/l\/email-protection[^"']*["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, before, after) => {
      const attrs = `${before} ${after}`;
      const encoded = attrs.match(/data-cfemail=["']([0-9a-f]+)["']/i)?.[1] ?? null;
      const email = decodeCloudflareEmail(encoded);
      return email ? `<a href="mailto:${email}">${email}</a>` : full;
    }
  );
}

function cardCandidates(html: string, sourceUrl: string): DecisionMakerCandidate[] {
  const out: DecisionMakerCandidate[] = [];
  // Team sites vary wildly in markup. Normalise visible public emails into
  // mailto anchors for extraction as some CMS templates render the address as
  // text rather than a clickable link.
  const normalisedHtml = expandProtectedEmails(html).replace(
    /(?<!mailto:)(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/gi,
    '<a href="mailto:$1">$1</a>'
  );
  // Anchor each candidate on a direct public email, then inspect the containing
  // card/list/article or a bounded local block.
  for (const emailMatch of normalisedHtml.matchAll(/href=["']\s*mailto:([^"'?#>]+)["']/gi)) {
    const emailIndex = emailMatch.index ?? 0;
    const email = validEmail(decodeHref(emailMatch[1] || ""));
    if (!email) continue;

    const openTags = [...normalisedHtml.slice(Math.max(0, emailIndex - 9000), emailIndex).matchAll(/<(article|li|section|div)\b[^>]*>/gi)];
    let blockStart = Math.max(0, emailIndex - 3500);
    let blockEnd = Math.min(normalisedHtml.length, emailIndex + 1800);
    for (const tag of openTags.reverse()) {
      const tagName = (tag[1] || "").toLowerCase();
      const absoluteStart = Math.max(0, emailIndex - 9000) + (tag.index ?? 0);
      const close = normalisedHtml.indexOf(`</${tagName}>`, emailIndex);
      if (close > emailIndex && close - absoluteStart <= 12000) {
        blockStart = absoluteStart;
        blockEnd = close + tagName.length + 3;
        break;
      }
    }
    const block = normalisedHtml.slice(blockStart, blockEnd);
    const text = decodeText(block);
    const role = leadershipRoleFromText(text);
    const rank = leadershipRank(role);
    if (!rank) continue;

    const names = [...block.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
      .map(m => validPersonName(decodeText(m[1] || ""))).filter(Boolean) as string[];
    if (!names.length) {
      for (const m of block.matchAll(/<(?:strong|b|span|a)\b[^>]*>([\s\S]{2,100}?)<\/(?:strong|b|span|a)>/gi)) {
        const maybe = validPersonName(decodeText(m[1] || ""));
        if (maybe && /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3}$/.test(maybe)) names.push(maybe);
      }
    }
    const name = names.find(n => !leadershipRank(n) && !/^(view profile|read more|contact|email|phone)$/i.test(n)) ?? null;
    if (!name) continue;

    const phoneMatch = block.match(/href=["']\s*tel:([^"'?#>]+)["']/i);
    const phone = validPhone(phoneMatch ? decodeHref(phoneMatch[1] || "") : null);
    const imgMatches = [...block.matchAll(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)];
    let imageUrl: string | null = null;
    for (const img of imgMatches) {
      const src = img[1] || "";
      if (!src || /(?:logo|icon|sprite|placeholder|data:image)/i.test(src)) continue;
      imageUrl = absoluteUrl(decodeEntities(src), sourceUrl);
      if (imageUrl) break;
    }
    out.push({
      name, role, email, phone, sourceUrl,
      evidence: `${name} is identified as ${role} on the business's public team/profile page with direct contact details.`,
      imageUrl,
      confidence: rank >= 90 && Boolean(email || phone) ? "high" : "medium",
      rank: rank + (email ? 5 : 0) + (phone ? 5 : 0),
    });
  }
  return out;
}

function profilePageCandidate(html: string, sourceUrl: string): DecisionMakerCandidate | null {
  const top = html.slice(0, 300_000);
  const headings = [...top.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map(m => decodeText(m[1] || "")).filter(Boolean);
  const role = leadershipRoleFromText(top);
  const heading = headings
    .map(value => validPersonName(value))
    .find(value => value &&
      /^[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}$/.test(value) &&
      !/^(meet our team|our team|the team|about us|contact us|our people|leadership team|management team)$/i.test(value) &&
      !leadershipRank(value)
    ) ?? null;
  const rank = leadershipRank(role);
  if (!heading || !role || !rank) return null;

  // Scope contact extraction around the person's name/role rather than taking the
  // first site-wide header/footer contact. This avoids pairing a principal with
  // the office 1300 number.
  const plain = decodeText(top);
  const nameAt = plain.toLowerCase().indexOf(heading.toLowerCase());
  const roleAt = plain.toLowerCase().indexOf(role.toLowerCase(), Math.max(0, nameAt));
  const anchorTextAt = Math.max(nameAt, roleAt, 0);
  const rawNameAt = top.toLowerCase().indexOf(heading.toLowerCase());
  const rawRoleAt = top.toLowerCase().indexOf(role.toLowerCase(), Math.max(0, rawNameAt));
  const rawAnchor = Math.max(rawNameAt, rawRoleAt, 0);
  // Decode public email-protection markup on the individual profile itself
  // before extracting local contact details. The profile path is authoritative
  // for this candidate and may use Cloudflare obfuscation independently of the
  // team listing.
  const expandedTop = expandProtectedEmails(top);
  const expandedRawNameAt = expandedTop.toLowerCase().indexOf(heading.toLowerCase());
  const expandedRawRoleAt = expandedTop.toLowerCase().indexOf(role.toLowerCase(), Math.max(0, expandedRawNameAt));
  const expandedAnchor = Math.max(expandedRawNameAt, expandedRawRoleAt, 0);
  const local = expandedTop.slice(Math.max(0, expandedAnchor - 2500), Math.min(expandedTop.length, expandedAnchor + 9000));

  const localEmails = [...local.matchAll(/href=["']\s*mailto:([^"'?#>]+)["']/gi)]
    .map(m => validEmail(decodeHref(m[1] || ""))).filter(Boolean) as string[];
  const localTels = [...local.matchAll(/href=["']\s*tel:([^"'?#>]+)["']/gi)]
    .map(m => validPhone(decodeHref(m[1] || ""))).filter(Boolean) as string[];
  const localText = decodeText(local);
  const labelledMobile = localText.match(/(?:Mobile|Phone|Direct|M)\s*:?\s*(\+?\d[\d ()-]{7,20}\d)/i)?.[1] ?? null;
  const visibleMobiles = [...localText.matchAll(/(?:\+?61\s?4|04)\d(?:[\s()-]*\d){7,9}/g)]
    .map(m => validPhone(m[0])).filter(Boolean) as string[];
  const genericPhone = /^(?:1300|1800)/;
  const phone = validPhone(labelledMobile)
    ?? visibleMobiles[0]
    ?? localTels.find(value => !genericPhone.test(value.replace(/\D/g, "")))
    ?? null;
  const localVisibleEmails = [...localText.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)]
    .map(m => validEmail(m[0])).filter(Boolean) as string[];
  const decodedProfile = decodeEntities(expandedTop)
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/\s+(?:\[at\]|\(at\))\s+/gi, "@")
    .replace(/\s+(?:\[dot\]|\(dot\))\s+/gi, ".");
  const profileVisibleEmails = [...decodedProfile.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)]
    .map(m => validEmail(m[0])).filter(Boolean) as string[];
  const isGenericEmail = (value: string) => /^(info|admin|support|hello|office|sales|rentals?)@/i.test(value);
  const email = [...localEmails, ...localVisibleEmails, ...profileVisibleEmails]
    .find(value => !isGenericEmail(value)) ?? null;
  if (!email && !phone) return null;

  const localImages = [...local.matchAll(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi)]
    .map(m => m[1] || "").filter(src => src && !/(?:logo|icon|sprite|placeholder|data:image)/i.test(src));
  const image = localImages[0] ?? null;
  return {
    name: heading, role, email, phone, sourceUrl,
    evidence: `${heading} is identified as ${role} on a public individual profile page with direct contact details.`,
    imageUrl: image ? absoluteUrl(decodeEntities(image), sourceUrl) : null,
    confidence: "high",
    rank: rank + (email ? 5 : 0) + (phone ? 5 : 0) + 10,
  };
}
function extractCandidates(html: string, sourceUrl: string): DecisionMakerCandidate[] {
  const cardResults = cardCandidates(html, sourceUrl);
  const profileResult = profilePageCandidate(html, sourceUrl);
  if (profileResult) cardResults.push(profileResult);
  const headings = headingCandidates(html);
  const candidates: DecisionMakerCandidate[] = [];
  const emailMatches = [...html.matchAll(/href=["\']\s*mailto:([^"\'?#>]+)["\']/gi)];

  for (const match of emailMatches) {
    const index = match.index ?? 0;
    const email = validEmail(decodeHref(match[1] || ""));
    if (!email) continue;
    const windowStart = Math.max(0, index - 2500);
    const windowEnd = Math.min(html.length, index + 1800);
    const windowHtml = html.slice(windowStart, windowEnd);
    const windowText = cleanText(windowHtml);
    const name = nearestHeading(headings, index);
    if (!name) continue;
    const role = nearestRole(windowText);
    const phoneMatches = [...windowHtml.matchAll(/href=["\']\s*tel:([^"\'?#>]+)["\']/gi)];
    const phone = validPhone(phoneMatches[0] ? decodeHref(phoneMatches[0][1] || "") : null);
    const rank = leadershipRank(role);
    if (!rank) continue;
    candidates.push({
      name, role, email, phone, sourceUrl,
      evidence: `${name} is identified as ${role} on the business website with direct public contact details.`,
      imageUrl: candidateImage(html, index, sourceUrl),
      confidence: rank >= 90 && (phone || email) ? "high" : "medium",
      rank: rank + (email ? 5 : 0) + (phone ? 5 : 0),
    });
  }

  // Structured Person data remains a useful fallback when the page does not expose
  // a conventional team card.
  for (const block of html.matchAll(/"@type"\s*:\s*"Person"[\s\S]{0,2500}/gi)) {
    const raw = block[0] || "";
    const name = validPersonName(raw.match(/"name"\s*:\s*"([^"]+)"/i)?.[1] ?? null);
    const role = raw.match(/"jobTitle"\s*:\s*"([^"]+)"/i)?.[1]?.trim() ?? null;
    const rank = leadershipRank(role);
    if (!name || !rank) continue;
    const email = validEmail(raw.match(/"email"\s*:\s*"([^"]+)"/i)?.[1] ?? null);
    const phone = validPhone(raw.match(/"telephone"\s*:\s*"([^"]+)"/i)?.[1] ?? null);
    const imageRaw = raw.match(/"image"\s*:\s*"([^"]+)"/i)?.[1] ?? null;
    candidates.push({
      name, role, email, phone, sourceUrl,
      evidence: `${name} is identified as ${role} in Person structured data on the business website.`,
      imageUrl: imageRaw ? absoluteUrl(decodeEntities(imageRaw), sourceUrl) : null,
      confidence: rank >= 90 ? "high" : "medium",
      rank: rank + (email ? 5 : 0) + (phone ? 5 : 0),
    });
  }
  for (const candidate of cardResults) {
    const existing = candidates.find(x => x.name?.toLowerCase() === candidate.name?.toLowerCase());
    if (!existing) {
      candidates.push(candidate);
      continue;
    }
    // Evidence for the same person can be split across a team card and an
    // individual profile. Keep the strongest identity/ranking evidence without
    // allowing a higher-ranked source with a missing field to erase verified
    // direct contact details discovered elsewhere.
    const preferred = candidate.rank > existing.rank ? candidate : existing;
    const supporting = preferred === candidate ? existing : candidate;
    Object.assign(existing, preferred, {
      email: preferred.email ?? supporting.email ?? null,
      phone: preferred.phone ?? supporting.phone ?? null,
      imageUrl: preferred.imageUrl ?? supporting.imageUrl ?? null,
      role: preferred.role ?? supporting.role ?? null,
      confidence: preferred.confidence === "high" || supporting.confidence === "high" ? "high" : preferred.confidence,
      rank: Math.max(existing.rank, candidate.rank),
    });
  }
  return candidates;
}
export async function researchProspectDecisionMaker(websiteUrl: string | null | undefined) {
  if (!websiteUrl) return { candidates: [] as DecisionMakerCandidate[], searched: [] as string[], note: "No website is recorded." };
  const base = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
  const searched: string[] = [];
  const diagnostics: Array<{
    url: string;
    status: number | null;
    protectedEmailMarkers: number;
    protectedEmailsDecoded: number;
    validEmailsFound: number;
    candidateFields: Array<{ name: string | null; hasEmail: boolean; hasPhone: boolean; hasImage: boolean }>;
    error?: string;
  }> = [];
  const candidates: DecisionMakerCandidate[] = [];
  const seen = new Set<string>();
  const queue = [base];
  // Common public people/team routes are worth probing directly. Many modern sites
  // expose staff cards here but do not link them in the first 300 KB of homepage HTML.
  for (const pathname of ["/meet-our-team", "/our-team", "/team", "/about", "/about-us", "/people", "/agents", "/contact"]) {
    const candidate = absoluteUrl(pathname, base);
    if (candidate && !queue.includes(candidate)) queue.push(candidate);
  }

  for (let i = 0; i < queue.length && i < 10; i++) {
    const url = queue[i]!;
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7_000);
      const res = await safeExternalFetch(url, { signal: controller.signal, headers: { "user-agent": "DigitalGate-ProspectResearch/1.0 (+https://digitalgate.com.au)", accept: "text/html,application/xhtml+xml" } });
      clearTimeout(timer);
      searched.push(res.url || url);
      if (!res.ok) {
        diagnostics.push({ url: res.url || url, status: res.status, protectedEmailMarkers: 0, protectedEmailsDecoded: 0, validEmailsFound: 0, candidateFields: [] });
        continue;
      }
      const type = res.headers.get("content-type") || "";
      if (!type.includes("html")) {
        diagnostics.push({ url: res.url || url, status: res.status, protectedEmailMarkers: 0, protectedEmailsDecoded: 0, validEmailsFound: 0, candidateFields: [] });
        continue;
      }
      const html = (await res.text()).slice(0, 1_000_000);
      const expandedHtml = expandProtectedEmails(html);
      const pageCandidates = extractCandidates(html, res.url || url);
      const protectedEmailMarkers = [...html.matchAll(/data-cfemail=["'][0-9a-f]+["']/gi)].length;
      const protectedEmailsDecoded = Math.max(0, [...expandedHtml.matchAll(/href=["']mailto:/gi)].length - [...html.matchAll(/href=["']mailto:/gi)].length);
      const validEmailsFound = [...decodeText(expandedHtml).matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)]
        .map(match => validEmail(match[0])).filter(Boolean).length;
      diagnostics.push({
        url: res.url || url,
        status: res.status,
        protectedEmailMarkers,
        protectedEmailsDecoded,
        validEmailsFound,
        candidateFields: pageCandidates.map(candidate => ({
          name: candidate.name,
          hasEmail: Boolean(candidate.email),
          hasPhone: Boolean(candidate.phone),
          hasImage: Boolean(candidate.imageUrl),
        })),
      });
      for (const candidate of pageCandidates) {
        const existing = candidates.find((x) => x.name?.toLowerCase() === candidate.name?.toLowerCase());
        if (!existing) {
          candidates.push(candidate);
          continue;
        }
        // The same person can be evidenced across separate crawled pages (for
        // example a team listing may expose email while an individual profile
        // provides stronger identity, mobile and photo evidence). Preserve
        // complementary verified fields across pages instead of allowing the
        // higher-ranked page to erase fields it does not contain.
        const preferred = candidate.rank > existing.rank ? candidate : existing;
        const supporting = preferred === candidate ? existing : candidate;
        Object.assign(existing, preferred, {
          email: preferred.email ?? supporting.email ?? null,
          phone: preferred.phone ?? supporting.phone ?? null,
          imageUrl: preferred.imageUrl ?? supporting.imageUrl ?? null,
          role: preferred.role ?? supporting.role ?? null,
          confidence: preferred.confidence === "high" || supporting.confidence === "high" ? "high" : preferred.confidence,
          rank: Math.max(existing.rank, candidate.rank),
        });
      }
      if (i === 0) {
        for (const match of html.matchAll(/href=["\']([^"\']+)["\']/gi)) {
          const href = decodeHref(match[1] || "");
          if (!/(about|team|people|agents?|leadership|contact)/i.test(href)) continue;
          const absolute = absoluteUrl(href, res.url || url);
          if (absolute && new URL(absolute).host === new URL(res.url || url).host && !queue.includes(absolute)) queue.push(absolute);
          if (queue.length >= 16) break;
        }
      }
    } catch (error) {
      searched.push(url);
      diagnostics.push({
        url,
        status: null,
        protectedEmailMarkers: 0,
        protectedEmailsDecoded: 0,
        validEmailsFound: 0,
        candidateFields: [],
        error: error instanceof Error ? error.name : "fetch_failed",
      });
    }
  }
  candidates.sort((a,b) => b.rank-a.rank);
  return {
    candidates: candidates.slice(0, 5),
    searched,
    diagnostics,
    note: candidates.length ? null : "No verified decision-maker candidate was found on the public business website. Use manual research as the fallback.",
  };
}
