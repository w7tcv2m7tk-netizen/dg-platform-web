import { safeExternalFetch } from "./ssrf-guard";

export type DecisionMakerCandidate = {
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  sourceUrl: string;
  evidence: string;
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
function extractCandidate(html: string, sourceUrl: string): DecisionMakerCandidate | null {
  const email = html.match(/mailto:([^"'?#\s>]+)/i)?.[1]?.trim() ?? null;
  const phoneRaw = html.match(/tel:([^"'?#\s>]+)/i)?.[1] ?? null;
  const phone = phoneRaw ? decodeURIComponent(phoneRaw).replace(/\s+/g, " ").trim() : null;
  const text = cleanText(html).slice(0, 80_000);
  const leadership = text.match(/\b(?:principal|director|owner|founder|managing director|licensee|agency principal)\b.{0,100}/i)?.[0] ?? null;
  const personJson = validPersonName(html.match(/"@type"\s*:\s*"Person"[\s\S]{0,1500}?"name"\s*:\s*"([^"]+)"/i)?.[1] ?? null);
  const roleJson = html.match(/"@type"\s*:\s*"Person"[\s\S]{0,1500}?"jobTitle"\s*:\s*"([^"]+)"/i)?.[1]?.trim() ?? null;
  // A generic phone/email is not a decision-maker candidate. Require a named
  // person or explicit leadership evidence before surfacing anything.
  if (!personJson && !leadership) return null;
  return {
    name: personJson,
    role: roleJson,
    email: personJson ? email : null,
    phone: personJson ? phone : null,
    sourceUrl,
    evidence: leadership || "Named Person structured data found on the business website.",
  };
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
      const candidate = extractCandidate(html, res.url || url);
      if (candidate && !candidates.some((x) => x.name === candidate.name && x.email === candidate.email && x.phone === candidate.phone)) candidates.push(candidate);
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
  return { candidates: candidates.slice(0, 5), searched, note: candidates.length ? null : "No verified decision-maker candidate was found on the public business website. Use manual research as the fallback." };
}
