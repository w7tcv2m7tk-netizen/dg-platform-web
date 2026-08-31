#!/usr/bin/env node
/**
 * Check required Vercel / .env.local variables (names only — never prints secrets).
 * Usage: node scripts/verify-env.mjs
 * With dotenv: dotenv -e .env.local -- node scripts/verify-env.mjs
 */

const checks = [
  { key: "DATABASE_URL", group: "Platform", required: true },
  { key: "CLERK_SECRET_KEY", group: "Auth", required: true },
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", group: "Auth", required: true },
  { key: "CLERK_WEBHOOK_SIGNING_SECRET", group: "Auth", required: true },
  { key: "DG_API_KEY", group: "WordPress hub", required: true, hint: "digitalgate.com.au → API Settings" },
  {
    key: "DG_WP_CONNECTOR_API_KEY",
    group: "Roe connector",
    required: true,
    hint: "roerealty.com.au → API Settings",
  },
  {
    key: "DG_WP_CONNECTOR_BASE_URL",
    group: "Roe connector",
    required: false,
    hint: "Defaults to roerealty.com.au REST base",
  },
  {
    key: "DG_WP_ACCOMMODATION_SITES",
    group: "Accommodation",
    required: false,
    hint: "JSON array with real CVH baseUrl (not placeholder)",
  },
  { key: "STRIPE_SECRET_KEY", group: "Commerce", required: false },
  { key: "STRIPE_WEBHOOK_SECRET", group: "Commerce", required: false },
  { key: "NEXT_PUBLIC_APP_URL", group: "App", required: true },
  {
    key: "DG_SETTINGS_ENCRYPTION_KEY",
    group: "Security",
    required: true,
    hint: "Encrypts connector OAuth tokens at rest; without it secret writes now fail closed",
  },
  {
    key: "CRON_SECRET",
    group: "Security",
    required: true,
    hint: "Scheduled jobs fail closed (503) when unset",
  },
  {
    key: "DG_COMMAND_CENTRE_ORG_IDS",
    group: "Security",
    required: true,
    hint: "Comma-separated operator organisation ids — sole source of Command Centre authority",
  },
];

let missingRequired = 0;
let missingOptional = 0;

console.log("DigitalGate environment check\n");

for (const check of checks) {
  const raw = process.env[check.key]?.trim() ?? "";
  const ok = Boolean(raw);
  const icon = ok ? "✓" : check.required ? "✗" : "○";
  const label = `${icon} ${check.key}`;

  if (!ok && check.required) missingRequired++;
  if (!ok && !check.required) missingOptional++;

  console.log(label);
  if (check.hint) console.log(`    ${check.hint}`);
  if (ok && check.key === "DG_WP_ACCOMMODATION_SITES") {
    try {
      const sites = JSON.parse(raw);
      const placeholder = sites.some(
        (s) =>
          !s.baseUrl ||
          /YOUR-CVH|placeholder|example\.com/i.test(String(s.baseUrl)),
      );
      if (placeholder) {
        console.log("    ⚠ Contains placeholder URL — set real CVH REST base");
        missingOptional++;
      }
    } catch {
      console.log("    ⚠ Invalid JSON");
      missingOptional++;
    }
  }
  if (ok && check.key === "STRIPE_SECRET_KEY") {
    const mode = raw.startsWith("sk_live_")
      ? "live"
      : raw.startsWith("sk_test_")
        ? "test"
        : "unknown";
    console.log(`    Mode: ${mode}`);
  }
}

console.log("");
if (missingRequired > 0) {
  console.log(`Missing ${missingRequired} required variable(s).`);
  process.exit(1);
}
console.log("Required variables present.");
if (missingOptional > 0) {
  console.log(`${missingOptional} optional/recommended variable(s) not set or need review.`);
}
