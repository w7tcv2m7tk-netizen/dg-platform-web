/**
 * Clerk ↔ Neon environment pairing (Option C).
 *
 * Single source of truth for classification and ALLOW/BLOCK rules.
 * Never logs connection strings, credentials, or secret values.
 *
 * Neon class is derived from DATABASE_URL hostname via a central non-secret
 * endpoint allowlist, then cross-checked against DG_NEON_ENV (declaration only).
 * Disagreement or unknown host → BLOCK.
 *
 * @see docs/foundations/ENVIRONMENT-PARITY.md
 */

/** @typedef {"development" | "preview" | "production"} NeonEnvClass */
/** @typedef {"development" | "production"} ClerkEnvClass */
/** @typedef {"development" | "preview" | "production" | "unknown"} NeonHostClass */
/** @typedef {"development" | "production" | "unknown"} ClerkClass */

/**
 * Non-secret Neon compute endpoint IDs (ep-…) by declared environment.
 * Backup / ad-hoc branches are intentionally omitted → classify as unknown → BLOCK.
 * Ephemeral Vercel preview endpoints: add via DG_NEON_PREVIEW_ENDPOINTS (comma-separated).
 */
export const NEON_ENDPOINT_ALLOWLIST = Object.freeze({
  production: Object.freeze(["ep-bold-tree-a7bny92m"]),
  development: Object.freeze(["ep-round-sunset-a72e5yr8"]),
  preview: Object.freeze([
    // Shared / long-lived preview compute (vercel-dev). Ephemeral PR endpoints use env extension.
    "ep-ancient-shape-a71q6o9p",
  ]),
});

const ALLOWED_DG_NEON_ENV = new Set(["development", "preview", "production"]);

/**
 * @param {string} value
 * @returns {string[]}
 */
function parseEndpointList(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^ep-[a-z0-9-]+$/i.test(s));
}

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ production: string[], development: string[], preview: string[] }}
 */
export function resolveNeonAllowlist(env = process.env) {
  const extraPreview = parseEndpointList(env.DG_NEON_PREVIEW_ENDPOINTS ?? "");
  return {
    production: [...NEON_ENDPOINT_ALLOWLIST.production],
    development: [...NEON_ENDPOINT_ALLOWLIST.development],
    preview: [...NEON_ENDPOINT_ALLOWLIST.preview, ...extraPreview],
  };
}

/**
 * Extract hostname from a postgres connection URL without retaining credentials.
 * @param {string} databaseUrl
 * @returns {string | null}
 */
export function extractDatabaseHostname(databaseUrl) {
  const raw = typeof databaseUrl === "string" ? databaseUrl.trim() : "";
  if (!raw) return null;
  try {
    const normalised = raw.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
    const host = new URL(normalised).hostname;
    return host ? host.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} hostname
 * @param {string} endpointId
 */
function hostnameMatchesEndpoint(hostname, endpointId) {
  const h = hostname.toLowerCase();
  const id = endpointId.toLowerCase();
  if (h === id || h.startsWith(`${id}.`)) return true;
  if (h.startsWith(`${id}-pooler.`)) return true;
  // Neon compute binding hosts: ep-{id}-{binding}[.-pooler].region...
  const re = new RegExp(`^${escapeRegExp(id)}-[a-z0-9]{2,12}(?:-pooler)?\\.`, "i");
  return re.test(h);
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Classify Neon host from DATABASE_URL against the allowlist. Never uses DB name.
 * @param {string} databaseUrl
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ class: NeonHostClass, endpointId: string | null, hostnamePresent: boolean }}
 */
export function classifyNeonHost(databaseUrl, env = process.env) {
  const hostname = extractDatabaseHostname(databaseUrl);
  if (!hostname) {
    return { class: "unknown", endpointId: null, hostnamePresent: false };
  }

  const allowlist = resolveNeonAllowlist(env);
  /** @type {Array<[NeonEnvClass, string[]]>} */
  const order = [
    ["production", allowlist.production],
    ["development", allowlist.development],
    ["preview", allowlist.preview],
  ];

  for (const [neonClass, ids] of order) {
    for (const id of ids) {
      if (hostnameMatchesEndpoint(hostname, id)) {
        return { class: neonClass, endpointId: id, hostnamePresent: true };
      }
    }
  }

  return { class: "unknown", endpointId: null, hostnamePresent: true };
}

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ class: ClerkClass, reason?: string }}
 */
export function classifyClerkEnvironment(env = process.env) {
  const pk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const sk = env.CLERK_SECRET_KEY?.trim() ?? "";

  /** @param {string} key @returns {ClerkEnvClass | null} */
  const fromPublishable = (key) =>
    key.startsWith("pk_test_") ? "development" : key.startsWith("pk_live_") ? "production" : null;
  /** @param {string} key @returns {ClerkEnvClass | null} */
  const fromSecret = (key) =>
    key.startsWith("sk_test_") ? "development" : key.startsWith("sk_live_") ? "production" : null;

  const pkClass = fromPublishable(pk);
  const skClass = fromSecret(sk);

  if (pkClass && skClass && pkClass !== skClass) {
    return { class: "unknown", reason: "Clerk publishable/secret key environments disagree" };
  }

  const clerkClass = pkClass ?? skClass;
  if (!clerkClass) {
    return { class: "unknown", reason: "Clerk keys missing or unrecognised (expected pk_/sk_ test or live)" };
  }
  return { class: clerkClass };
}

/**
 * Approved pairing matrix (Clerk × Neon host class after DG_NEON_ENV agreement).
 * @param {ClerkClass} clerk
 * @param {NeonEnvClass | "unknown"} neon
 */
export function isClerkNeonPairingAllowed(clerk, neon) {
  if (clerk === "development" && (neon === "development" || neon === "preview")) return true;
  if (clerk === "production" && neon === "production") return true;
  return false;
}

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {{
 *   ok: boolean,
 *   skipped: boolean,
 *   errors: string[],
 *   clerk: ClerkClass | null,
 *   neonDeclared: string | null,
 *   neonHost: NeonHostClass | null,
 *   neonEndpointId: string | null,
 * }}
 */
export function evaluateEnvironmentPairing(env = process.env) {
  if (env.DG_LOCAL_CHECKOUT_CERTIFICATION) {
    return evaluateLocalCheckoutCertification(env);
  }
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const hasClerk =
    Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) || Boolean(env.CLERK_SECRET_KEY?.trim());

  // Incomplete tooling / build context: nothing to pair yet.
  if (!databaseUrl && !hasClerk) {
    return {
      ok: true,
      skipped: true,
      errors: [],
      clerk: null,
      neonDeclared: null,
      neonHost: null,
      neonEndpointId: null,
    };
  }

  const errors = [];
  const clerkResult = classifyClerkEnvironment(env);
  const declaredRaw = env.DG_NEON_ENV?.trim().toLowerCase() ?? "";
  const neonDeclared = declaredRaw || null;

  if (!databaseUrl) {
    errors.push("DATABASE_URL missing — cannot classify Neon host for pairing");
  }

  if (!hasClerk) {
    errors.push("Clerk keys missing — cannot classify Clerk environment for pairing");
  } else if (clerkResult.class === "unknown") {
    errors.push(clerkResult.reason ?? "Clerk environment unknown");
  }

  if (!declaredRaw) {
    errors.push("DG_NEON_ENV missing — must explicitly declare development, preview, or production");
  } else if (!ALLOWED_DG_NEON_ENV.has(declaredRaw)) {
    errors.push(`DG_NEON_ENV invalid (${declaredRaw}) — expected development, preview, or production`);
  }

  const hostResult = databaseUrl
    ? classifyNeonHost(databaseUrl, env)
    : { class: /** @type {NeonHostClass} */ ("unknown"), endpointId: null, hostnamePresent: false };

  if (databaseUrl && !hostResult.hostnamePresent) {
    errors.push("DATABASE_URL host could not be parsed — pairing blocked");
  } else if (hostResult.class === "unknown") {
    errors.push(
      "Neon host is unknown (not on the central allowlist) — pairing blocked (no guessing; backup/other hosts are denied)",
    );
  }

  if (
    declaredRaw &&
    ALLOWED_DG_NEON_ENV.has(declaredRaw) &&
    hostResult.class !== "unknown" &&
    declaredRaw !== hostResult.class
  ) {
    errors.push(
      `DG_NEON_ENV (${declaredRaw}) disagrees with Neon host classification (${hostResult.class}) — pairing blocked`,
    );
  }

  const neonEffective =
    declaredRaw &&
    ALLOWED_DG_NEON_ENV.has(declaredRaw) &&
    hostResult.class !== "unknown" &&
    declaredRaw === hostResult.class
      ? /** @type {NeonEnvClass} */ (declaredRaw)
      : /** @type {"unknown"} */ ("unknown");

  if (
    errors.length === 0 &&
    clerkResult.class !== "unknown" &&
    neonEffective !== "unknown" &&
    !isClerkNeonPairingAllowed(clerkResult.class, neonEffective)
  ) {
    errors.push(
      `Clerk (${clerkResult.class}) × Neon (${neonEffective}) pairing is not allowed`,
    );
  }

  // If we already have classification errors, still surface matrix denial when classes are known.
  if (
    errors.length > 0 &&
    clerkResult.class !== "unknown" &&
    neonEffective !== "unknown" &&
    !isClerkNeonPairingAllowed(clerkResult.class, neonEffective)
  ) {
    const msg = `Clerk (${clerkResult.class}) × Neon (${neonEffective}) pairing is not allowed`;
    if (!errors.includes(msg)) errors.push(msg);
  }

  // Production Clerk with unknown Neon must explicitly cite the matrix denial.
  if (clerkResult.class === "production" && neonEffective === "unknown") {
    const msg = "Clerk (production) × Neon (unknown/non-prod) pairing is not allowed";
    if (!errors.some((e) => e.includes("Clerk (production)"))) errors.push(msg);
  }
  if (clerkResult.class === "development" && neonEffective === "unknown") {
    const msg = "Clerk (development) × Neon (unknown/backup/other) pairing is not allowed";
    if (!errors.some((e) => e.includes("Clerk (development)") && e.includes("unknown"))) {
      errors.push(msg);
    }
  }

  return {
    ok: errors.length === 0,
    skipped: false,
    errors,
    clerk: clerkResult.class,
    neonDeclared,
    neonHost: hostResult.class,
    neonEndpointId: hostResult.endpointId,
  };
}

/**
 * Fail-closed runtime assertion. Safe messages only — never includes URLs or secrets.
 * @param {Record<string, string | undefined>} [env]
 */
export function assertEnvironmentPairingOrThrow(env = process.env) {
  const result = evaluateEnvironmentPairing(env);
  if (result.skipped || result.ok) return result;
  const detail = result.errors.join("; ");
  throw new Error(`Environment pairing blocked: ${detail}`);
}


/** Explicit local test authority; this is never a Neon endpoint classification.
 * Runtime instrumentation must additionally verify the database's ownership nonce.
 * @param {Record<string, string | undefined>} env
 */
export function evaluateLocalCheckoutCertification(env) {
  const errors = [];
  if (env.DG_LOCAL_CHECKOUT_CERTIFICATION !== "authorised-disposable") errors.push("Local certification authorisation is invalid");
  if (env.NODE_ENV !== "development" || env.VERCEL || env.VERCEL_ENV || env.VERCEL_TARGET_ENV || env.VERCEL_URL || env.CI) errors.push("Local certification is prohibited outside an unhosted development runtime");
  if (env.DG_NEON_ENV !== "development") errors.push("Local certification requires the development declaration");
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_test_") || !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) errors.push("Local certification requires both Clerk Development keys");
  if (env.STRIPE_SECRET_KEY && !/^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)) errors.push("Local certification rejects live Stripe credentials");
  if (!/^[a-f0-9]{64}$/.test(env.DG_CHECKOUT_CERTIFICATION_NONCE ?? "")) errors.push("Disposable database ownership nonce is missing or invalid");
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    if (db.protocol !== "postgresql:" || db.hostname !== "127.0.0.1" || !db.port || Number(db.port) < 1024 || db.port === "5432" || !/^\/dg_checkout_certification_[a-f0-9]{12}$/.test(db.pathname)) throw new Error();
    if (env.DATABASE_URL_UNPOOLED !== env.DATABASE_URL) throw new Error();
    const expected = { connect_timeout: "3", pool_timeout: "1", socket_timeout: "5", connection_limit: "4" };
    if ([...db.searchParams].length !== Object.keys(expected).length || Object.entries(expected).some(([k,v]) => db.searchParams.get(k) !== v)) throw new Error();
  } catch { errors.push("Disposable database targets or bounded connection settings do not match"); }
  try {
    const origin = new URL(env.NEXT_PUBLIC_APP_URL ?? "");
    if (origin.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(origin.hostname) || !origin.port || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error();
    if (env.NEXT_PUBLIC_PLATFORM_URL && new URL(env.NEXT_PUBLIC_PLATFORM_URL).origin !== origin.origin) throw new Error();
    if (env.CLERK_PROXY_URL || env.CLERK_FAPI_URL) throw new Error();
  } catch { errors.push("Local certification application origin or authentication routing is invalid"); }
  return { ok: errors.length === 0, skipped: false, errors, clerk: "development", neonDeclared: env.DG_NEON_ENV ?? null,
    neonHost: "unknown", neonEndpointId: null, localCertification: true };
}

/** Must complete before the development server can accept requests.
 * The reader uses the application's own Prisma pool; it creates no separate pool.
 * @param {Record<string, string | undefined>} env
 * @param {() => Promise<Array<{nonce: string | null, database: string, address: string | null, port: number}>>} readIdentity
 */
export async function verifyLocalCheckoutCertificationDatabase(env, readIdentity) {
  const result = evaluateLocalCheckoutCertification(env);
  if (!result.ok) throw new Error("Local certification configuration rejected");
  let rows;
  try { rows = await readIdentity(); } catch { throw new Error("Disposable database ownership verification failed"); }
  const db = new URL(env.DATABASE_URL);
  if (rows.length !== 1 || rows[0].nonce !== env.DG_CHECKOUT_CERTIFICATION_NONCE || rows[0].database !== db.pathname.slice(1) || rows[0].address !== "127.0.0.1" || rows[0].port !== Number(db.port)) {
    throw new Error("Disposable database ownership verification failed");
  }
  return result;
}
