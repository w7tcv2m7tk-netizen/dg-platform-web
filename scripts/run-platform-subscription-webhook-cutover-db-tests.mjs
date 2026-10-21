import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineRef = "7a10486d00c83adfb8744e4de86c5d9f21ed4ad0";
const holdMigration = "packages/database/prisma/migrations/20261019_platform_subscription_webhook_hold/migration.sql";
const pgBin = process.argv[2];
if (!pgBin || !path.isAbsolute(pgBin)) throw new Error("Pass the installed PostgreSQL bin directory");

const env = {};
for (const key of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "SystemRoot"]) {
  if (process.env[key]) env[key] = process.env[key];
}
env.NODE_ENV = "test";
for (const key of Object.keys(process.env)) {
  if (/^(PG|DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL|RECONCILIATION_DATABASE_URL|STRIPE_|CLERK_|NEON_|VERCEL_)/i.test(key)) {
    delete env[key];
  }
}

function run(command, args, extra = {}) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", ...extra });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
}

const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const assigned = server.address().port;
    server.close((error) => error ? reject(error) : resolve(assigned));
  });
});
if (port === 5432) throw new Error("Refusing the default PostgreSQL port");

const owned = mkdtempSync(path.join(tmpdir(), "dg-webhook-guard-pg-"));
const data = path.join(owned, "data");
const baseline = path.join(owned, "baseline");
mkdirSync(path.join(baseline, "models"), { recursive: true });
const databaseUrl = `postgresql://guard_test@127.0.0.1:${port}/dg_webhook_guard_test?connection_limit=12`;
env.DATABASE_URL = databaseUrl;

try {
  run(path.join(pgBin, "initdb"), ["-D", data, "-U", "guard_test", "-A", "trust", "--encoding=UTF8", "--locale=C", "-L", path.resolve(pgBin, "../share/postgresql")]);
  run(path.join(pgBin, "pg_ctl"), ["-D", data, "-l", path.join(owned, "postgres.log"), "-w", "start", "-o", `-h 127.0.0.1 -p ${port} -k ${owned}`]);
  run(path.join(pgBin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "guard_test", "dg_webhook_guard_test"]);

  for (const relative of ["schema.prisma", "models/ai-visibility.prisma", "models/business-brain.prisma"]) {
    const result = spawnSync("git", ["show", `${baselineRef}:packages/database/prisma/${relative}`], { cwd: root, env, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Cannot read baseline Prisma file: ${relative}`);
    writeFileSync(path.join(baseline, relative), result.stdout);
  }

  const baselineSql = path.join(owned, "baseline.sql");
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-empty", "--to-schema-datamodel", baseline, "--script", "--output", baselineSql]);
  const psqlArgs = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "guard_test", "-d", "dg_webhook_guard_test", "-v", "ON_ERROR_STOP=1", "--single-transaction"];
  run(path.join(pgBin, "psql"), [...psqlArgs, "-f", baselineSql]);
  run(path.join(pgBin, "psql"), [...psqlArgs, "-f", path.join(root, holdMigration)]);
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "diff", "--from-url", databaseUrl, "--to-schema-datamodel", "packages/database/prisma", "--exit-code"]);
  run(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "--test-timeout=30000", "scripts/test-platform-subscription-webhook-cutover-db.mjs"]);
  console.log("Disposable guard-only PostgreSQL cluster stopped and destroyed");
} finally {
  if (existsSync(path.join(data, "postmaster.pid"))) {
    run(path.join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  }
  rmSync(owned, { recursive: true, force: true });
}
