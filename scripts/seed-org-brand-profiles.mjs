#!/usr/bin/env node
/**
 * Seed brand colours, logos, and icons for known businesses.
 * Assets live on app.digitalgate.com.au/brand/* (not WP wp-content).
 *
 * Usage:
 *   node --import tsx --env-file=.env.local scripts/seed-org-brand-profiles.mjs
 *   node --import tsx --env-file=.env.local scripts/seed-org-brand-profiles.mjs --force
 *   node --import tsx --env-file=.env.local scripts/seed-org-brand-profiles.mjs --clear-wp-apex --force
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const force = process.argv.includes("--force");
const clearWpApex = process.argv.includes("--clear-wp-apex");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing (.env.local)");
    process.exit(1);
  }

  const { seedOrgBrandProfiles } = await import(
    "../packages/platform-core/src/org/brand-presets.ts"
  );

  const results = await seedOrgBrandProfiles({ force, clearWpApex });

  for (const row of results) {
    if (row.skipped) {
      console.log(`– ${row.organisationName}: ${row.skipped}`);
    } else if (row.updated) {
      console.log(`✓ ${row.organisationName} → ${row.preset}`);
    } else {
      console.log(`? ${row.organisationName}: ${row.skipped ?? "no preset"}`);
    }
  }

  const updated = results.filter((r) => r.updated).length;
  console.log(`\nDone. Updated ${updated} organisation(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
