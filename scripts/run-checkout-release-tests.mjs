/** Credential-free release checks. No dotenv or external provider access. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const env = { NODE_ENV: "test", LC_ALL: "C", LANG: "C" };
for (const key of ["PATH", "HOME", "TMPDIR", "SystemRoot"]) if (process.env[key]) env[key] = process.env[key];
const files = [
  "scripts/test-owned-postgres-tools.mjs",
  "scripts/test-safe-prisma-logging.mjs",
  "scripts/test-runtime-identity.mjs",
  "scripts/test-runtime-identity-invocation.mjs",
  "scripts/test-runtime-identity-route.mjs",
  "scripts/test-runtime-identity-action.mjs",
  "scripts/test-runtime-permissions-manifest.mjs",
  "scripts/test-onboarding-save-queue.mjs",
  "scripts/test-onboarding-state-before-checkout.mjs",
  "scripts/test-checkout-admission-unit.mjs",
  "scripts/test-checkout-release-preflight.mjs",
  "scripts/test-legacy-checkout-inventory.mjs",
  "scripts/test-checkout-compatibility-boundaries.mjs",
  "scripts/test-checkout-delayed-create.mjs",
  "scripts/test-checkout-webhook-origin.mjs",
  "scripts/test-platform-subscription-webhook-cutover.mjs",
  "scripts/test-platform-subscription-webhook-drain-report.mjs",
  "scripts/test-webhook-receipt-state.mjs",
  "scripts/test-stripe-subscription-routing.mjs",
  "scripts/test-stripe-connect-tenant-trust.mjs",
  "scripts/test-industry-purchase-authority.mjs",
  "scripts/test-shared-entitlement-enforcement.mjs",
  "scripts/test-finance-app-access.mjs",
  "scripts/test-billing-exemption-boundary.mjs",
  "scripts/test-commercial-offer-acceptance.mjs",
  "scripts/test-subscription-lifecycle.mjs",
  "scripts/test-onboarding-checkout-verification.mjs",
  "scripts/test-custom-pricing-founding-separation.mjs",
  "scripts/test-env-pairing.mjs",
  "scripts/test-verify-env.mjs",
  "scripts/test-local-checkout-certification.mjs",
  "scripts/test-portal-billing-authority.mjs",
  "scripts/test-pricing-entitlements.mjs",
  "scripts/test-server-commercial-entitlements.mjs",
  "scripts/test-specialist-industry-entitlements.mjs",
  "scripts/test-domain-industry-entitlements.mjs",
  "scripts/test-industry-purchase-activation.mjs",
  "scripts/test-platform-authority.mjs",
  "scripts/test-api-key-authority.mjs",
  "scripts/test-h6-billing-authority.mjs",
  "scripts/test-write-entitlement.mjs",
  "scripts/test-tenant-write-entitlement-guard.mjs"
];
const result = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-test-module-mocks", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "--test-timeout=60000", ...files], { cwd: root, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
