/** Owns a fresh local cluster. Never reads dotenv or accepts a database URL. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineRef = "8b01687fc235d16db6467a91551247e3f69444f9"; // Reviewed main; reconstruct the gate from certified SQL, including its hold column.
const migration = "packages/database/prisma/migrations/20261009_platform_checkout_creation_gate/migration.sql";
const appEntitlementsMigration = "packages/database/prisma/migrations/20261018_platform_subscription_app_entitlements/migration.sql";
const subscriptionWebhookHoldMigration = "packages/database/prisma/migrations/20261019_platform_subscription_webhook_hold/migration.sql";
const pgBin = process.argv[2];
if (!pgBin || !path.isAbsolute(pgBin)) throw new Error("Pass the installed PostgreSQL bin directory");
// Do not inherit credentials, provider keys, dotenv configuration or Node preload hooks.
const safeEnv = { NODE_ENV: "test", LC_ALL: "C", LANG: "C" };
for (const key of ["PATH", "HOME", "TMPDIR", "SystemRoot"]) {
  if (process.env[key]) safeEnv[key] = process.env[key];
}
const suite = process.argv[3] ?? "compatibility";
const suites = {
  compatibility: ["test-single-use-checkout-admission-db.mjs", "test-checkout-compatibility-db.mjs", "test-legacy-app-entitlement-reconciliation.mjs", "test-platform-subscription-webhook-cutover-db.mjs", "test-checkout-release-operator-sql-db.mjs"],
  operator: ["test-checkout-release-operator-sql-db.mjs"],
  coordinator: ["test-checkout-coordinator-db.mjs"],
  permissions: ["test-runtime-permissions-db.mjs"],
  admission: ["test-single-use-checkout-admission-db.mjs"],
  guard: ["test-platform-subscription-webhook-cutover-db.mjs"],
};
if (!Object.hasOwn(suites, suite) || process.argv.length > 4) throw new Error("Unknown disposable checkout test suite");
const pgSharedir = spawnSync(path.join(pgBin, "pg_config"), ["--sharedir"], { env: safeEnv, encoding: "utf8" });
if (pgSharedir.status !== 0 || !path.isAbsolute(pgSharedir.stdout.trim())) throw new Error("Cannot resolve PostgreSQL installation data");
const run = (command, args, extra = {}) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: safeEnv, ...extra });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
};
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const assigned = probe.address().port;
    probe.close((error) => error ? reject(error) : resolve(assigned));
  });
});
if (port === 5432) throw new Error("Refusing default PostgreSQL port");
const owned = mkdtempSync(path.join(tmpdir(), "dg-compat-pg-"));
const data = path.join(owned, "data");
const marker = randomUUID();
const databaseUrl = `postgresql://checkout_test@127.0.0.1:${port}/dg_checkout_test?connection_limit=16`;
const env = { ...safeEnv, DATABASE_URL: databaseUrl, DG_CHECKOUT_DB_MARKER: marker, DG_CHECKOUT_PG_BIN: pgBin };
let passed = false;
try {
  run(path.join(pgBin, "initdb"), ["-D", data, "-U", "checkout_test", "-A", "trust", "--encoding=UTF8", "--locale=C", "-L", pgSharedir.stdout.trim()]);
  run(path.join(pgBin, "pg_ctl"), ["-D", data, "-l", path.join(owned, "server.log"), "-w", "start", "-o", `-h 127.0.0.1 -p ${port} -k ${owned} -c dg.checkout_test_cluster=${marker}`]);
  run(path.join(pgBin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "checkout_test", "dg_checkout_test"]);
  const baseline = path.join(owned, "baseline");
  mkdirSync(path.join(baseline, "models"), { recursive: true });
  for (const relative of ["schema.prisma", "models/ai-visibility.prisma", "models/business-brain.prisma"]) {
    const result = spawnSync("git", ["show", `${baselineRef}:packages/database/prisma/${relative}`], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error("Cannot read baseline schema");
    let schema = result.stdout;
    if (relative === "schema.prisma") {
      // Reconstruct only this table from its certified SQL below: Prisma's
      // datamodel cannot represent its singleton CHECK constraint.
      const gate = /model PlatformCheckoutCreationGate \{[\s\S]*?\n\}/g;
      if ([...schema.matchAll(gate)].length !== 1) throw new Error("Expected exactly one baseline gate model");
      schema = schema.replace(gate, "");
    }
    writeFileSync(path.join(baseline, relative), schema);
  }
  const sql = path.join(owned, "baseline.sql");
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-empty", "--to-schema-datamodel", baseline, "--script", "--output", sql], { env });
  const psql = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "checkout_test", "-d", "dg_checkout_test", "-v", "ON_ERROR_STOP=1", "--single-transaction"];
  run(path.join(pgBin, "psql"), [...psql, "-f", sql]);
  // Apply once to the owned disposable database, including SQL-only checks.
  run(path.join(pgBin, "psql"), [...psql, "-f", migration]);
  run(path.join(pgBin, "psql"), [...psql, "-f", "packages/database/prisma/migrations/20261009_platform_checkout_attempt/migration.sql"]);
  run(path.join(pgBin, "psql"), [...psql, "-f", appEntitlementsMigration]);
  run(path.join(pgBin, "psql"), [...psql, "-f", subscriptionWebhookHoldMigration]);
  const { rehearseAdmissionMigration } = await import("./rehearse-checkout-admission-migration.mjs");
  await rehearseAdmissionMigration({ pgBin, psql, env, root, marker });
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-url", databaseUrl, "--to-schema-datamodel", "packages/database/prisma", "--exit-code"], { env });
  for (const file of suites[suite]) {
    run(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "--test-timeout=30000", `scripts/${file}`], { env });
  }
  passed = true;
} finally {
  if (existsSync(path.join(data, "postmaster.pid"))) run(path.join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  rmSync(owned, { recursive: true, force: true });
  writeFileSync(path.join(tmpdir(), `dg-${suite}-db-evidence.json`), JSON.stringify({ passed, suite, baselineRef, migrations: [migration, "packages/database/prisma/migrations/20261009_platform_checkout_attempt/migration.sql", appEntitlementsMigration, subscriptionWebhookHoldMigration, "packages/database/prisma/migrations/20261027_single_use_checkout_admission/migration.sql"], cluster: owned, host: "127.0.0.1", port, database: "dg_checkout_test", stopped: true, destroyed: true, completedAt: new Date().toISOString() }, null, 2));
  console.log("Disposable checkout PostgreSQL cluster stopped and destroyed");
}
