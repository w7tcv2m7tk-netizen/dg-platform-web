/** Creates and destroys its own loopback PostgreSQL cluster; never loads env files. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = process.argv[2];
if (!bin || !path.isAbsolute(bin)) throw new Error("Pass the installed PostgreSQL bin directory");
const env = Object.fromEntries(["PATH", "HOME", "TMPDIR"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
// PostgreSQL on macOS requires an explicit locale to avoid threaded startup.
env.LC_ALL = "C";
const run = (cmd, args, extra = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, env, stdio: "inherit", ...extra });
  if (r.error || r.status !== 0) throw new Error(`${path.basename(cmd)} failed`);
};
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const port = probe.address().port;
    probe.close(error => error ? reject(error) : resolve(port));
  });
});
if (port === 5432) throw new Error("Refusing default port");
const owned = mkdtempSync(path.join(tmpdir(), "dg-991-pg-"));
const data = path.join(owned, "data");
const marker = randomUUID();
try {
  run(path.join(bin, "initdb"), ["-D", data, "-U", "reconcile_test", "-A", "trust", "--encoding=UTF8", "--locale=C",
    "-L", path.resolve(bin, "../share/postgresql")]);
  run(path.join(bin, "pg_ctl"), ["-D", data, "-l", path.join(owned, "server.log"), "-w", "start", "-o",
    `-h 127.0.0.1 -p ${port} -k ${owned} -c timezone=UTC -c dg.reconcile_test_cluster=${marker}`]);
  run(path.join(bin, "createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "reconcile_test", "dg_991_test"]);
  const fixture = path.join(owned, "fixture.sql");
  writeFileSync(fixture, `
    CREATE TABLE public._prisma_migrations (
      id varchar(36) PRIMARY KEY NOT NULL, checksum varchar(64) NOT NULL,
      finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text,
      rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count int NOT NULL DEFAULT 0);
    CREATE TABLE public.memberships (id text PRIMARY KEY, organisation_id text NOT NULL,
      clerk_user_id text NOT NULL, role text NOT NULL, status text NOT NULL);
    CREATE TABLE public.ai_accounting_outbox (id text PRIMARY KEY);
    CREATE TABLE public.ai_worker_principals (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE public.ai_local_deployments (id text PRIMARY KEY);
    CREATE TABLE public.ai_local_recipient_approvals (id text PRIMARY KEY);
    CREATE TABLE public.ai_inference_jobs (id text PRIMARY KEY);
    CREATE TABLE public.ai_worker_claim_receipts (id text PRIMARY KEY);
  `);
  const psql = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "reconcile_test", "-d", "dg_991_test", "-v", "ON_ERROR_STOP=1"];
  run(path.join(bin, "psql"), [...psql, "-f", fixture]);
  run(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs",
    "--test", "--test-timeout=30000", "scripts/test-reconcile-991.mjs"], { env: { ...env,
    DATABASE_URL: `postgresql://reconcile_test@127.0.0.1:${port}/dg_991_test?connection_limit=8`,
    DG_RECONCILE_TEST_MARKER: marker } });
} finally {
  if (existsSync(path.join(data, "postmaster.pid"))) run(path.join(bin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  rmSync(owned, { recursive: true, force: true });
  console.log("Owned #991 test cluster stopped and destroyed");
}
