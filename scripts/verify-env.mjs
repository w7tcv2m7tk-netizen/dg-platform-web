#!/usr/bin/env node
/**
 * DigitalGate environment configuration guard.
 *
 * Enforces environment parity: every environment must have equivalent REQUIRED
 * configuration (only values differ), and production must NOT contain
 * development-only settings. Prints variable NAMES and presence only — never
 * secret values. See docs/foundations/ENVIRONMENT-PARITY.md.
 *
 * Usage:
 *   node scripts/verify-env.mjs                # checks against current env / mode
 *   node scripts/verify-env.mjs --production   # force the production gate
 *   dotenv -e .env.local -- node scripts/verify-env.mjs
 */
import { pathToFileURL } from "node:url";

const truthy = (v) => ["1", "true", "yes", "on"].includes(String(v).trim().toLowerCase());

export function isProductionEnv(env = process.env) {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

// Required in EVERY environment (only the values differ).
const BASE_REQUIRED = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

// Additionally required in PRODUCTION (security-critical platform configuration).
const PRODUCTION_REQUIRED = [
  ["DG_SETTINGS_ENCRYPTION_KEY", "connector secret encryption at rest (H-4)"],
  ["DG_COMMAND_CENTRE_ORG_IDS", "platform-operator recognition (C-2)"],
  ["CRON_SECRET", "cron authorisation (H-5)"],
];

// When the associated feature is enabled, its secret is required (hard in prod).
const FEATURE_GATED = [
  { when: "STRIPE_SECRET_KEY", need: "STRIPE_WEBHOOK_SECRET", why: "Stripe webhook signature verification" },
];

// MUST NEVER be present/unsafe in production.
const PRODUCTION_PROHIBITED = [
  { key: "DG_ALLOW_PLAINTEXT_SECRETS", unsafe: truthy, why: "stores connector secrets in plaintext" },
  { key: "CLERK_SECRET_KEY", unsafe: (v) => v.startsWith("sk_test_"), why: "Clerk test key in production" },
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", unsafe: (v) => v.startsWith("pk_test_"), why: "Clerk test key in production" },
  { key: "STRIPE_SECRET_KEY", unsafe: (v) => v.startsWith("sk_test_"), why: "Stripe test key in production" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", unsafe: (v) => v.startsWith("pk_test_"), why: "Stripe test key in production" },
  { key: "DREAMSCAPE_SOAP_ENV", unsafe: (v) => v.toLowerCase() === "sandbox", why: "Dreamscape sandbox mode in production" },
  { key: "DREAMSCAPE_ENV", unsafe: (v) => v.toLowerCase() === "sandbox", why: "Dreamscape sandbox mode in production" },
  { key: "DOMAIN_API_PATH_PREFIX", unsafe: (v) => v.includes("/sandbox"), why: "Domain sandbox path in production" },
];

/**
 * Pure evaluation — returns names/notes only, never secret values.
 * @returns {{ production:boolean, ok:boolean, errors:string[], warnings:string[], report:Array<{key,present,note?}> }}
 */
export function evaluateEnv(env = process.env, opts = {}) {
  const production = opts.production ?? isProductionEnv(env);
  const errors = [];
  const warnings = [];
  const report = [];
  const val = (k) => env[k]?.trim() ?? "";
  const present = (k) => val(k).length > 0;

  for (const key of BASE_REQUIRED) {
    report.push({ key, present: present(key) });
    if (!present(key)) errors.push(`Missing required ${key}`);
  }

  for (const [key, why] of PRODUCTION_REQUIRED) {
    const ok = present(key);
    report.push({ key, present: ok, note: why + (production ? "" : " (prod-required)") });
    if (production && !ok) errors.push(`Missing production-required ${key} — ${why}`);
  }

  for (const g of FEATURE_GATED) {
    if (present(g.when)) {
      report.push({ key: g.need, present: present(g.need), note: `required because ${g.when} is set — ${g.why}` });
      if (!present(g.need)) {
        const msg = `${g.need} required when ${g.when} is set (${g.why})`;
        (production ? errors : warnings).push(msg);
      }
    }
  }

  if (production) {
    for (const p of PRODUCTION_PROHIBITED) {
      if (present(p.key) && p.unsafe(val(p.key))) {
        errors.push(`Prohibited in production: ${p.key} — ${p.why}`);
      }
    }
  }

  return { production, ok: errors.length === 0, errors, warnings, report };
}

function runCli(env, opts) {
  const result = evaluateEnv(env, opts);
  console.log(`DigitalGate environment check (${result.production ? "PRODUCTION gate" : "non-production"})\n`);
  for (const r of result.report) {
    const icon = r.present ? "✓" : "✗";
    console.log(`${icon} ${r.key}${r.note ? `  — ${r.note}` : ""}`);
  }
  // Safe, derived mode indicators (never the value).
  const stripe = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (stripe) console.log(`  STRIPE_SECRET_KEY mode: ${stripe.startsWith("sk_live_") ? "live" : stripe.startsWith("sk_test_") ? "test" : "unknown"}`);

  if (result.warnings.length) {
    console.log("\nWarnings:");
    for (const w of result.warnings) console.log(`  ⚠ ${w}`);
  }
  if (result.errors.length) {
    console.log("\nErrors:");
    for (const e of result.errors) console.log(`  ✗ ${e}`);
    console.log(`\n${result.errors.length} configuration error(s).`);
    process.exit(1);
  }
  console.log("\nEnvironment configuration OK.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const force = process.argv.includes("--production");
  runCli(process.env, force ? { production: true } : {});
}
