#!/usr/bin/env node
/**
 * Clean Industry sample pollution from the DigitalGate Command Centre org
 * (Services template brand voice, properties). Does not remove intentional
 * Industry App toggles used for staff testing/demo.
 *
 * Usage: node --import tsx scripts/sanitize-digitalgate-platform-org.mjs
 *    or: npx tsx scripts/sanitize-digitalgate-platform-org.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing (.env.local)");
    process.exit(1);
  }

  const { sanitizePlatformOperatorOrg } = await import(
    "../packages/platform-core/src/org/platform-org-sanitize.ts"
  );

  const result = await sanitizePlatformOperatorOrg({ slug: "digitalgate" });
  if (!result) {
    console.log("No platform operator org found for slug=digitalgate");
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
