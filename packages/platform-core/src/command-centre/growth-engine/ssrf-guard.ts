/**
 * SSRF guard for outbound audit probes.
 *
 * `runPresenceAudit` fetches a caller-supplied website URL, and it is reachable
 * unauthenticated through the public business-audit funnel
 * (`POST /api/public/business-audit`, action `probe`). Validation only checked
 * that the scheme was http/https, so an attacker could point the probe at cloud
 * instance metadata (169.254.169.254), localhost, or private RFC1918 addresses
 * and infer internal state from the returned status, timing and final URL.
 *
 * This blocks hostnames that resolve to non-public space. Public DNS names that
 * resolve to private addresses (DNS rebinding) are also caught because
 * resolution happens here before the request is made.
 */

/**
 * Node built-ins are imported lazily inside the functions that need them.
 * This module is reachable from modules that also appear in the client graph
 * (e.g. property helpers), and a static `node:dns` / `node:net` import breaks
 * the client bundle. The same dynamic-import idiom is used for `@dg/database`
 * elsewhere in platform-core.
 */

export type SsrfCheckResult =
  | { allowed: true; hostname: string }
  | { allowed: false; reason: string };

/** Hostnames that must never be probed regardless of resolution. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // "this" network
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalised = ip.toLowerCase();
  if (normalised === "::" || normalised === "::1") return true; // unspecified, loopback
  if (normalised.startsWith("fe80")) return true; // link-local
  if (normalised.startsWith("fc") || normalised.startsWith("fd")) return true; // unique local
  // IPv4-mapped (::ffff:a.b.c.d) — evaluate the embedded address.
  const mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/** Minimal IP-family detection so this module needs no static node:net import. */
function ipFamily(value: string): 4 | 6 | 0 {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((p) => Number(p) >= 0 && Number(p) <= 255) ? 4 : 0;
  }
  if (value.includes(":")) return 6;
  return 0;
}

export function isBlockedIpAddress(ip: string): boolean {
  const family = ipFamily(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

/**
 * Resolve the URL's host and refuse anything that is not public.
 *
 * Fails closed: an unresolvable host is refused rather than probed.
 */
export async function assertPublicHttpTarget(
  rawUrl: string,
): Promise<SsrfCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "invalid_url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: "unsupported_scheme" };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!hostname) return { allowed: false, reason: "missing_host" };
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { allowed: false, reason: "blocked_hostname" };
  }
  if (hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
    return { allowed: false, reason: "blocked_hostname" };
  }

  // Literal IP in the URL — check directly, no DNS needed.
  if (ipFamily(hostname) !== 0) {
    return isBlockedIpAddress(hostname)
      ? { allowed: false, reason: "private_address" }
      : { allowed: true, hostname };
  }

  try {
    const { lookup } = await import("node:dns/promises");
    const results = await lookup(hostname, { all: true });
    if (!results.length) return { allowed: false, reason: "unresolvable_host" };
    if (results.some((r) => isBlockedIpAddress(r.address))) {
      return { allowed: false, reason: "private_address" };
    }
    return { allowed: true, hostname };
  } catch {
    return { allowed: false, reason: "unresolvable_host" };
  }
}

export class BlockedTargetError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`blocked_target:${reason}`);
    this.name = "BlockedTargetError";
    this.reason = reason;
  }
}

const MAX_REDIRECTS = 5;

/**
 * Fetch a user-supplied URL with the SSRF guard applied to EVERY hop.
 *
 * Validating only the initial URL is not sufficient: with `redirect: "follow"`
 * the runtime follows 3xx responses itself, so a public URL that redirects to
 * 169.254.169.254 or an RFC1918 address defeats the check entirely. Redirects
 * are therefore handled manually here, re-validating each Location before
 * following it.
 *
 * Throws BlockedTargetError when any hop is not public, so callers can
 * distinguish a refusal from an ordinary network failure.
 */
export async function safeExternalFetch(
  rawUrl: string,
  init: Omit<RequestInit, "redirect"> = {},
): Promise<Response> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const target = await assertPublicHttpTarget(currentUrl);
    if (!target.allowed) throw new BlockedTargetError(target.reason);

    const res = await fetch(currentUrl, { ...init, redirect: "manual" });

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get("location");
    if (!location) return res;

    // Resolve relative redirects against the current URL before re-checking.
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new BlockedTargetError("too_many_redirects");
}
