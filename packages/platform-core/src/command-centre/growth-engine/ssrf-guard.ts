/**
 * SSRF guard for outbound, caller/tenant-controlled fetches.
 *
 * Two surfaces fetch a URL that an untrusted caller controls:
 *   - `runPresenceAudit` (growth engine) probes a caller-supplied website URL
 *     and is reachable UNAUTHENTICATED through the public business-audit funnel
 *     (`POST /api/public/business-audit`, action `probe`).
 *   - `fetchIcalFeed` (accommodation) fetches a tenant-supplied OTA iCal URL.
 *
 * Previously validation only checked the scheme was http/https, so a caller
 * could point the fetch at cloud instance metadata (169.254.169.254),
 * localhost, or private RFC1918 space and infer internal state from the
 * returned status, timing and final URL.
 *
 * This module resolves the hostname and refuses anything that is not public.
 * Because resolution happens here before the request is made, public DNS names
 * that resolve to private addresses (a DNS-rebinding attempt) are also caught.
 * Every redirect hop is re-validated — checking only the initial URL is
 * bypassable with a public redirector pointing at internal space.
 *
 * Residual limitation: the platform `fetch` (undici) performs its own DNS
 * resolution when it connects, so a name that resolves to a public address
 * during validation and a private address at connect time (a fast-flip DNS
 * rebind) is not fully eliminated without a custom pinned-IP dispatcher. That
 * is intentionally out of scope here to keep the change small and framework
 * compatible; pre-resolution + per-hop revalidation closes the practical cases.
 */

import { lookup } from "node:dns/promises";
import net from "node:net";

export type SsrfCheckResult =
  | { allowed: true; hostname: string }
  | { allowed: false; reason: string };

/** Minimal DNS resolver shape (subset of node:dns lookup with `{ all: true }`). */
export type HostLookup = (hostname: string) => Promise<Array<{ address: string }>>;

/**
 * Test-only injection seam. Production callers pass nothing, so the real
 * `node:dns/promises` lookup and global `fetch` are used unchanged. Injecting a
 * resolver/fetch lets tests exercise DNS and redirect behaviour fully offline
 * without touching real networks or metadata services.
 */
export type SsrfDeps = {
  lookup?: HostLookup;
  fetchImpl?: typeof fetch;
};

const defaultLookup: HostLookup = (hostname) => lookup(hostname, { all: true });

/** Hostnames that must never be fetched regardless of resolution. */
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

  if (a === 0) return true; // "this" network (0.0.0.0/8)
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback (127.0.0.0/8)
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / shared address space (100.64.0.0/10)
  if (a === 192 && b === 0) return true; // IETF protocol assignments (192.0.0.0/24, 192.0.2.0/24)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking (198.18.0.0/15)
  if (a >= 224) return true; // multicast + reserved (224.0.0.0/3)
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  // Drop any zone id (fe80::1%eth0) before classifying.
  const normalised = ip.toLowerCase().split("%")[0];
  if (normalised === "::" || normalised === "::1") return true; // unspecified, loopback
  if (normalised.startsWith("fe80")) return true; // link-local
  if (normalised.startsWith("fc") || normalised.startsWith("fd")) return true; // unique local (fc00::/7)
  // IPv4-mapped (::ffff:a.b.c.d) — evaluate the embedded address.
  const mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/** True when an IP literal is loopback/private/link-local/metadata/reserved. Fails closed. */
export function isBlockedIpAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return true; // not a parseable IP → blocked
}

/**
 * Resolve the URL's host and refuse anything that is not public.
 *
 * Fails closed: an unresolvable host is refused rather than fetched.
 */
export async function assertPublicHttpTarget(
  rawUrl: string,
  deps: Pick<SsrfDeps, "lookup"> = {},
): Promise<SsrfCheckResult> {
  const resolveHost = deps.lookup ?? defaultLookup;
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
  if (net.isIP(hostname)) {
    return isBlockedIpAddress(hostname)
      ? { allowed: false, reason: "private_address" }
      : { allowed: true, hostname };
  }

  try {
    const results = await resolveHost(hostname);
    if (!results.length) return { allowed: false, reason: "unresolvable_host" };
    if (results.some((r) => isBlockedIpAddress(r.address))) {
      return { allowed: false, reason: "private_address" };
    }
    return { allowed: true, hostname };
  } catch {
    return { allowed: false, reason: "unresolvable_host" };
  }
}

/** Thrown when any hop of a guarded fetch resolves to a non-public target. */
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
 * Fetch a caller-supplied URL with the SSRF guard applied to EVERY hop.
 *
 * Validating only the initial URL is not sufficient: with `redirect: "follow"`
 * the runtime follows 3xx responses itself, so a public URL that redirects to
 * 169.254.169.254 or an RFC1918 address defeats the check entirely. Redirects
 * are therefore handled manually here, re-validating each Location before
 * following it.
 *
 * Throws BlockedTargetError when any hop is not public (or on redirect
 * exhaustion), so callers can distinguish a refusal from a network failure.
 */
export async function safeExternalFetch(
  rawUrl: string,
  init: Omit<RequestInit, "redirect"> = {},
  deps: SsrfDeps = {},
): Promise<Response> {
  const doFetch = deps.fetchImpl ?? fetch;
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const target = await assertPublicHttpTarget(currentUrl, deps);
    if (!target.allowed) throw new BlockedTargetError(target.reason);

    const res = await doFetch(currentUrl, { ...init, redirect: "manual" });

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get("location");
    if (!location) return res;

    // Resolve relative redirects against the current URL before re-checking.
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new BlockedTargetError("too_many_redirects");
}
