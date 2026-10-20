/** Owns a fresh local cluster. Never reads dotenv or accepts a database URL. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineRef = "331b96e1"; // Pinned main baseline, before the independent gate migration.
const migration = "packages/database/prisma/migrations/20261009_platform_checkout_creation_gate/migration.sql";
const pgBin = process.argv[2];
if (!pgBin || !path.isAbsolute(pgBin)) throw new Error("Pass the installed PostgreSQL bin directory");
const safeEnv = { ...process.env };
for (const key of Object.keys(safeEnv)) {
  if (key.startsWith("PG") || key.startsWith("STRIPE_") || ["DATABASE_URL", "DIRECT_URL", "SHADOW_DATABASE_URL", "RECONCILIATION_DATABASE_URL"].includes(key)) delete safeEnv[key];
}
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
const env = { ...safeEnv, DATABASE_URL: databaseUrl, DG_CHECKOUT_DB_MARKER: marker };
let passed = false;
try {
  run(path.join(pgBin, "initdb"), ["-D", data, "-U", "checkout_test", "-A", "trust", "--encoding=UTF8", "--locale=C", "-L", path.resolve(pgBin, "../share/postgresql")]);
  run(path.join(pgBin, "pg_ctl"), ["-D", data, "-l", path.join(owned, "server.log"), "-w", "start", "-o", `-h 127.0.0.1 -p ${port} -k ${owned} -c dg.checkout_test_cluster=${marker}`]);
  run(path.join(pgBin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "checkout_test", "dg_checkout_test"]);
  const baseline = path.join(owned, "baseline");
  mkdirSync(path.join(baseline, "models"), { recursive: true });
  for (const relative of ["schema.prisma", "models/ai-visibility.prisma", "models/business-brain.prisma"]) {
    const result = spawnSync("git", ["show", `${baselineRef}:packages/database/prisma/${relative}`], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error("Cannot read baseline schema");
    writeFileSync(path.join(baseline, relative), result.stdout);
  }
  const sql = path.join(owned, "baseline.sql");
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-empty", "--to-schema-datamodel", baseline, "--script", "--output", sql], { env });
  const psql = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "checkout_test", "-d", "dg_checkout_test", "-v", "ON_ERROR_STOP=1", "--single-transaction"];
  run(path.join(pgBin, "psql"), [...psql, "-f", sql]);
  run(path.join(pgBin, "psql"), [...psql, "-f", migration]);
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-url", databaseUrl, "--to-schema-datamodel", "packages/database/prisma", "--exit-code"], { env });
  run(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "--test-timeout=30000", "scripts/test-checkout-compatibility-db.mjs"], { env });
  passed = true;
} finally {
  if (existsSync(path.join(data, "postmaster.pid"))) run(path.join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  rmSync(owned, { recursive: true, force: true });
  writeFileSync(path.join(tmpdir(), "dg-compat-db-evidence.json"), JSON.stringify({ passed, baselineRef, migration, cluster: owned, host: "127.0.0.1", port, database: "dg_checkout_test", stopped: true, destroyed: true, completedAt: new Date().toISOString() }, null, 2));
  console.log("Disposable checkout PostgreSQL cluster stopped and destroyed");
}
