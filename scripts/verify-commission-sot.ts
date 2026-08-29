/**
 * Verify locked DigitalGate commission examples against the calculation engine.
 * Usage: npx tsx scripts/verify-commission-sot.ts
 */
import { assertLockedCommissionExamples } from "../packages/platform-core/src/partners/calculate-commission";

try {
  assertLockedCommissionExamples();
  console.log("OK — locked commission examples match SoT (20/15/10 · 25 · +5).");
  process.exit(0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
