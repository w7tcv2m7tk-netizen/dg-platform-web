/** Owns a new disposable cluster; never accepts or inherits DATABASE_URL. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Immutable pre-Slice-3 schema: HEAD will include Slice 3 after delivery.
const baselineRef = "7301af172417c07773db935f6e10b7c7dc7fd937";
const pgBin = process.argv[2];
if (!pgBin || !path.isAbsolute(pgBin)) throw new Error("Pass the installed PostgreSQL bin directory; nothing is installed by this runner");
const safeEnv = { ...process.env };
for (const key of Object.keys(safeEnv)) {
  if (key.startsWith("PG") || ["DATABASE_URL", "DIRECT_URL", "SHADOW_DATABASE_URL"].includes(key)) delete safeEnv[key];
}
const run = (command, args, extra = {}) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: safeEnv, ...extra });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
};
run(path.join(pgBin, "postgres"), ["--version"]);
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const assigned = probe.address().port;
    probe.close((error) => error ? reject(error) : resolve(assigned));
  });
});
if (port === 5432) throw new Error("Refusing the default PostgreSQL port");
const owned = mkdtempSync(path.join(tmpdir(), "dg-slice3-pg-"));
const data = path.join(owned, "data");
const marker = randomUUID();
const databaseUrl = `postgresql://slice3_test@127.0.0.1:${port}/dg_slice3_test?connection_limit=12&application_name=dg_slice3_integration`;
// Explicit values supersede any inherited database/AI secrets; no dotenv loader.
const env = { ...safeEnv, DATABASE_URL: databaseUrl, DG_SLICE3_DB_MARKER: marker,
  AI_JOB_ENCRYPTION_KEY_V1: randomBytes(32).toString("hex"), AI_JOB_ENCRYPTION_CURRENT_VERSION: "v1" };
delete env.DIRECT_URL;
delete env.SHADOW_DATABASE_URL;
let passed = false;
try {
  run(path.join(pgBin, "initdb"), ["-D", data, "-U", "slice3_test", "-A", "trust", "--encoding=UTF8", "--locale=C",
    "-L", path.resolve(pgBin, "../share/postgresql")]);
  run(path.join(pgBin, "pg_ctl"), ["-D", data, "-l", path.join(owned, "server.log"), "-w", "start",
    "-o", `-h 127.0.0.1 -p ${port} -k ${owned} -c timezone=UTC -c log_timezone=UTC -c dg.slice3_test_cluster=${marker}`]);
  run(path.join(pgBin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "slice3_test", "dg_slice3_test"]);
  // History has no initial schema migration. Materialize the repository's pinned Slice 2
  // schema as the empty-database baseline, then apply the exact Slice 3
  // SQL migration. This exercises all Slice 3 indexes, constraints and triggers.
  const baseline = path.join(owned, "baseline");
  mkdirSync(path.join(baseline, "models"), { recursive: true });
  for (const relative of ["schema.prisma", "models/ai-visibility.prisma", "models/business-brain.prisma"]) {
    const result = spawnSync("git", ["show", `${baselineRef}:packages/database/prisma/${relative}`], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error("Cannot read repository baseline schema");
    writeFileSync(path.join(baseline, relative), result.stdout);
  }
  const sql = path.join(owned, "baseline.sql");
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-empty", "--to-schema-datamodel", baseline, "--script", "--output", sql], { env });
  const psqlArgs = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "slice3_test", "-d", "dg_slice3_test", "-v", "ON_ERROR_STOP=1", "--single-transaction"];
  run(path.join(pgBin, "psql"), [...psqlArgs, "-f", sql]);
  run(path.join(pgBin, "psql"), [...psqlArgs, "-f", "packages/database/prisma/migrations/20261007_ai_gateway_slice3_local_routine/migration.sql"]);
  console.log(`Isolated Slice 3 cluster: ${data}, 127.0.0.1:${port}, database dg_slice3_test`);
  run(process.execPath, ["--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "--test-timeout=20000", "scripts/test-ai-local-db.mjs"], { env });
  passed = true;
} finally {
  // Do not remove the directory unless the owned server has stopped.
  if (existsSync(path.join(data, "postmaster.pid"))) run(path.join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  rmSync(owned, { recursive: true, force: true });
  const evidence = { passed, cluster: owned, host: "127.0.0.1", port, database: "dg_slice3_test",
    baseline: baselineRef, migration: "20261007_ai_gateway_slice3_local_routine",
    stopped: true, destroyed: true, completedAt: new Date().toISOString() };
  writeFileSync(path.join(tmpdir(), "dg-slice3-db-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log("Disposable Slice 3 PostgreSQL cluster stopped and destroyed");
}
