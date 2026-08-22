/**
 * Public form spam guard — honeypot, rate limit, lightweight content checks.
 * Used by website contact forms and DigitalGate enquiry capture.
 */

export type FormSpamCheckInput = {
  honeypot?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Client IP for rate limiting (cf-connecting-ip preferred). */
  clientIp?: string;
  /** Site slug or form id bucket for rate limits. */
  siteKey?: string;
};

export type FormSpamVerdict =
  | { allowed: true }
  | { allowed: false; silent: true; reason: string }
  | {
      allowed: false;
      silent: false;
      code: "rate_limited" | "spam_content";
      message: string;
    };

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 6;

const rateBuckets = new Map<string, number[]>();

const SPAM_PATTERNS = [
  /\bviagra\b/i,
  /\bcialis\b/i,
  /\bcasino\b/i,
  /\bbitcoin\b.*\binvest/i,
  /\bcrypto\b.*\bprofit/i,
  /\bseo services\b/i,
  /\bbacklinks?\b/i,
  /\bweb design\b.*\bcheap/i,
  /\bclick here\b/i,
  /\bwork from home\b/i,
  /\bnigerian prince\b/i,
];

function combinedText(input: FormSpamCheckInput): string {
  return [input.name, input.email, input.phone, input.message]
    .filter(Boolean)
    .join("\n");
}

function urlCount(text: string): number {
  const matches = text.match(/https?:\/\/|www\.\S+/gi);
  return matches?.length ?? 0;
}

function looksLikeSpamContent(input: FormSpamCheckInput): string | null {
  const text = combinedText(input);
  if (!text.trim()) return null;

  if ((input.name?.trim().length ?? 0) > 180) {
    return "name too long";
  }

  if (urlCount(text) > 4) {
    return "too many links";
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) return "blocked pattern";
  }

  const message = input.message?.trim() ?? "";
  if (message.length > 40) {
    const letters = message.replace(/[^a-zA-Z]/g, "");
    const upper = message.replace(/[^A-Z]/g, "");
    if (letters.length > 20 && upper.length / letters.length > 0.85) {
      return "shouting message";
    }
  }

  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "invalid email shape";
  }

  return null;
}

function isRateLimited(clientIp: string, siteKey: string): boolean {
  if (!clientIp || clientIp === "unknown") return false;
  const key = `${siteKey}:${clientIp}`;
  const now = Date.now();
  const hits = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  rateBuckets.set(key, hits);
  return false;
}

/** Extract client IP — Cloudflare header first when proxied. */
export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function checkFormSpam(input: FormSpamCheckInput): FormSpamVerdict {
  if (input.honeypot?.trim()) {
    return { allowed: false, silent: true, reason: "honeypot" };
  }

  const siteKey = input.siteKey?.trim() || "global";
  const clientIp = input.clientIp?.trim() || "unknown";
  if (isRateLimited(clientIp, siteKey)) {
    return {
      allowed: false,
      silent: false,
      code: "rate_limited",
      message: "Too many submissions — please wait a few minutes and try again.",
    };
  }

  const spamReason = looksLikeSpamContent(input);
  if (spamReason) {
    return {
      allowed: false,
      silent: false,
      code: "spam_content",
      message: "Your message could not be sent. If this is a mistake, email us directly.",
    };
  }

  return { allowed: true };
}
