import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => statSync(path.join(root, relative)).isFile();

function runtimeFiles() {
  const files = [];
  const walk = (relative) => {
    for (const name of readdirSync(path.join(root, relative))) {
      if (["node_modules", ".next", ".git"].includes(name)) continue;
      const child = path.join(relative, name);
      const stat = statSync(path.join(root, child));
      if (stat.isDirectory()) walk(child);
      else if (/\.(?:ts|tsx|mjs|js)$/.test(name)) files.push(child);
    }
  };
  for (const dir of ["src", "packages", "workers"]) walk(dir);
  return files;
}

test("application runtime uses DATABASE_URL only; isolated identity validator may reject extra credentials", () => {
  for (const file of runtimeFiles()) {
    if (file === "src/lib/runtime-identity-credentials.ts") {
      assert.doesNotMatch(read(file), /Prisma|queryRaw|executeRaw|fetch\s*\(|\$connect|datasourceUrl/);
      continue;
    }
    assert.doesNotMatch(read(file), /DATABASE_URL_UNPOOLED|RECONCILIATION_DATABASE_URL|SHADOW_DATABASE_URL|DIRECT_URL/, file);
  }
});

test("runtime code does not instantiate a separate Prisma client outside the shared boundary and operator-only remediation", () => {
  const allowed = new Set([
    "packages/database/src/index.ts",
    "src/app/(shell)/command/remediate-991/actions.ts",
    "src/app/api/admin/remediate-991-physical/route.ts",
    "src/lib/runtime-identity-control.ts",
  ]);
  for (const file of runtimeFiles()) {
    if (allowed.has(file)) continue;
    assert.doesNotMatch(read(file), /new\s+PrismaClient\s*\(/, file);
  }
});

test("runtime code does not run migrations or owner-only DDL", () => {
  const files = [
    "src/app/api/cron/lead-followups/route.ts",
    "src/app/api/cron/pagespeed/route.ts",
    "src/app/api/cron/ota-ical-sync/route.ts",
    "src/app/api/cron/ai-visibility-monitoring/route.ts",
    "src/app/api/cron/seo-monitoring/route.ts",
    "src/app/api/cron/scheduled-emails/route.ts",
    "src/app/api/cron/billing-dunning/route.ts",
    "src/app/api/cron/ai-gateway-maintenance/route.ts",
    "src/app/api/webhooks/stripe/route.ts",
    "src/app/api/webhooks/clerk/route.ts",
    "src/app/api/webhooks/dg-onboarding-sync/route.ts",
  ];
  for (const file of files) {
    assert.ok(exists(file), file);
    assert.doesNotMatch(read(file), /prisma\s+migrate|migrate\s+(?:deploy|resolve)|db\s+push|db\s+execute|_prisma_migrations/i, file);
    assert.doesNotMatch(read(file), /DATABASE_URL_UNPOOLED|RECONCILIATION_DATABASE_URL|DIRECT_URL/, file);
  }
});

test("every configured Vercel cron has a route", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.ok(Array.isArray(config.crons) && config.crons.length > 0);
  for (const cron of config.crons) {
    assert.ok(exists(`src/app${cron.path}/route.ts`), cron.path);
  }
});

test("configured webhook routes exist and do not use owner-only credentials", () => {
  const routes = [
    "src/app/api/webhooks/clerk/route.ts",
    "src/app/api/webhooks/dg-discovery/route.ts",
    "src/app/api/webhooks/dg-leads/route.ts",
    "src/app/api/webhooks/dg-onboarding-sync/route.ts",
    "src/app/api/webhooks/dg-stay-booking/route.ts",
    "src/app/api/webhooks/dreamscape/route.ts",
    "src/app/api/webhooks/dropbox-sign/route.ts",
    "src/app/api/webhooks/elevenlabs/route.ts",
    "src/app/api/webhooks/stripe/route.ts",
  ];
  for (const route of routes) {
    assert.ok(exists(route), route);
    assert.doesNotMatch(read(route), /DATABASE_URL_UNPOOLED|RECONCILIATION_DATABASE_URL|DIRECT_URL/, route);
  }
});

test("the Mac AI worker uses the HTTP gateway rather than a database credential", () => {
  const config = read("workers/mac-ai/src/config.ts");
  const client = read("workers/mac-ai/src/client.ts");
  assert.doesNotMatch(config, /DATABASE_URL|Prisma|postgres/i);
  assert.doesNotMatch(client, /DATABASE_URL|Prisma|postgres/i);
  assert.match(config, /DG_AI_GATEWAY_URL/);
});

test("the shared Prisma datasource uses DATABASE_URL and has no directUrl", () => {
  const schema = read("packages/database/prisma/schema.prisma");
  assert.match(schema, /url\s*=\s*env\("DATABASE_URL"\)/);
  assert.doesNotMatch(schema, /directUrl\s*=/);
});

test("operator-only database paths are explicitly documented", () => {
  const runbook = read("docs/security/PRODUCTION-RUNTIME-CUTOVER-RUNBOOK.md");
  for (const value of [
    "src/lib/remediate-991-physical.ts",
    "packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts",
    "DATABASE_URL_UNPOOLED",
    "runtime-role-grants.sql",
    "runtime-role-verify.sql",
  ]) assert.match(runbook, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});


test("the additional client can reach only the separately validated control database",()=>{
 const source=read('src/lib/runtime-identity-control.ts');
 assert.equal([...source.matchAll(/new\s+PrismaClient\s*\(/g)].length,1);
 assert.match(source,/isolatedControlUrl\(process.env.DG_RUNTIME_IDENTITY_CONTROL_URL,process.env.DATABASE_URL\)/);
 assert.match(source,/new PrismaClient\(\{datasourceUrl:url,log:\[\]\}\)/);
 assert.doesNotMatch(source,/DATABASE_URL_UNPOOLED|RECONCILIATION_DATABASE_URL|SHADOW_DATABASE_URL|DIRECT_URL|@dg\/database|\.membership\.|\.organisation\./);
 assert.match(source,/runtime_identity_control\.claim/);assert.match(source,/runtime_identity_control\.finish/);
});
