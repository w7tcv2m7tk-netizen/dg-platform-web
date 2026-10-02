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
  return value.replace(/&amp;/gi, "&").replace(/&#64;|&commat;/gi, "@").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
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
function extractCandidates(html: string, sourceUrl: string): DecisionMakerCandidate[] {
  const headings = headingCandidates(html);
  const candidates: DecisionMakerCandidate[] = [];
  const emailMatches = [...html.matchAll(/href=["']mailto:([^"'?#\s>]+)["']/gi)];

  for (const match of emailMatches) {
    const index = match.index ?? 0;
    const email = validEmail(decodeEntities(match[1] || ""));
    if (!email) continue;
    const windowStart = Math.max(0, index - 2500);
    const windowEnd = Math.min(html.length, index + 1800);
    const windowHtml = html.slice(windowStart, windowEnd);
    const windowText = cleanText(windowHtml);
    const name = nearestHeading(headings, index);
    if (!name) continue;
    const role = nearestRole(windowText);
    const phoneMatches = [...windowHtml.matchAll(/href=["']tel:([^"'?#>]+)["']/gi)];
    const phone = validPhone(phoneMatches[0]?.[1] ?? null);
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
  return candidates;
}
export async function researchProspectDecisionMaker(websiteUrl: string | null | undefined) {
  if (!websiteUrl) return { candidates: [] as DecisionMakerCandidate[], searched: [] as string[], note: "No website is recorded." };
  const base = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
  const searched: string[] = [];
  const candidates: DecisionMakerCandidate[] = [];
  const seen = new Set<string>();
  const queue = [base];

  for (let i = 0; i < queue.length && i < 5; i++) {
    const url = queue[i]!;
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7_000);
      const res = await safeExternalFetch(url, { signal: controller.signal, headers: { "user-agent": "DigitalGate-ProspectResearch/1.0 (+https://digitalgate.com.au)", accept: "text/html,application/xhtml+xml" } });
      clearTimeout(timer);
      searched.push(res.url || url);
      if (!res.ok) continue;
      const type = res.headers.get("content-type") || "";
      if (!type.includes("html")) continue;
      const html = (await res.text()).slice(0, 300_000);
      for (const candidate of extractCandidates(html, res.url || url)) {
        const existing = candidates.find((x) => x.name?.toLowerCase() === candidate.name?.toLowerCase());
        if (!existing) candidates.push(candidate);
        else if (candidate.rank > existing.rank) Object.assign(existing, candidate);
      }
      if (i === 0) {
        for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
          const href = match[1] || "";
          if (!/(about|team|people|agents?|leadership|contact)/i.test(href)) continue;
          const absolute = absoluteUrl(href, res.url || url);
          if (absolute && new URL(absolute).host === new URL(res.url || url).host && !queue.includes(absolute)) queue.push(absolute);
          if (queue.length >= 8) break;
        }
      }
    } catch { searched.push(url); }
  }
  candidates.sort((a,b) => b.rank-a.rank);
  return { candidates: candidates.slice(0, 5), searched, note: candidates.length ? null : "No verified decision-maker candidate was found on the public business website. Use manual research as the fallback." };
}
