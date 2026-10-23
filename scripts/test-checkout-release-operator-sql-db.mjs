import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { prisma } from "@dg/database";
let env;
before(async () => {
 const url = new URL(process.env.DATABASE_URL);
 assert.equal(url.hostname, "127.0.0.1"); assert.notEqual(url.port, "5432");
 assert.equal(url.pathname, "/dg_checkout_test"); assert.equal(url.username, "checkout_test");
 const [identity] = await prisma.$queryRaw`SELECT current_setting('dg.checkout_test_cluster') AS marker`;
 assert.ok(process.env.DG_CHECKOUT_DB_MARKER); assert.equal(identity.marker, process.env.DG_CHECKOUT_DB_MARKER);
 assert.ok(path.isAbsolute(process.env.DG_CHECKOUT_PG_BIN));
 env = { PATH: process.env.PATH, PGHOST: "127.0.0.1", PGPORT: url.port, PGUSER: "checkout_test", PGDATABASE: "dg_checkout_test", LC_ALL: "C" };
});
after(() => prisma.$disconnect());
const execute = (file, revision) => spawnSync(path.join(process.env.DG_CHECKOUT_PG_BIN, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-v", `expected_revision=${revision}`, "-f", `docs/commerce/release-1025/${file}`], { env, encoding: "utf8" });
const state = () => prisma.platformCheckoutCreationGate.findUniqueOrThrow({where:{id:1}});
const reset = () => prisma.platformCheckoutCreationGate.update({where:{id:1}, data:{blocked:true,subscriptionWebhooksHeld:false,revision:0}});
test("proposed hold activation and release use exact revision and preserve blocked checkout", async () => {
 await reset(); assert.equal(execute("hold-activate-approved.sql",0).status,0);
 let row=await state(); assert.equal(row.subscriptionWebhooksHeld,true); assert.equal(row.revision,1); assert.equal(row.blocked,true);
 assert.equal(execute("hold-release-approved.sql",1).status,0);
 row=await state(); assert.equal(row.subscriptionWebhooksHeld,false); assert.equal(row.revision,2); assert.equal(row.blocked,true);
});
test("wrong revision and duplicate activation fail without changing state", async () => {
 await reset(); const original=await state(); assert.notEqual(execute("hold-activate-approved.sql",99).status,0); assert.deepEqual(await state(),original);
 assert.equal(execute("hold-activate-approved.sql",0).status,0); const held=await state();
 assert.notEqual(execute("hold-activate-approved.sql",1).status,0); assert.deepEqual(await state(),held);
 assert.equal(execute("hold-release-approved.sql",1).status,0);
});
test("open checkout rejects hold activation with transaction rolled back", async () => {
 await reset(); await prisma.platformCheckoutCreationGate.update({where:{id:1},data:{blocked:false}});
 const original=await state(); assert.notEqual(execute("hold-activate-approved.sql",0).status,0); assert.deepEqual(await state(),original); await reset();
});
