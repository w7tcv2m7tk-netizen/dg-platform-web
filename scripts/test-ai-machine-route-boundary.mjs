import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { beforeEach, afterEach, test } from "node:test";
import { NextRequest, NextResponse } from "next/server.js";
import { createPathMatcher } from "@clerk/shared/pathMatcher";
import { authenticateAiWorker } from "../packages/platform-core/src/ai/local-worker-auth.ts";

// Exercise the real middleware callback and route handlers without a Clerk
// account, database, network, provisioning or inference. The matcher is the
// installed Clerk SDK's own createPathMatcher, also used by createRouteMatcher.
const workerCredential = `dgw_${"a".repeat(43)}`;
const workerHash = createHash("sha256").update(workerCredential).digest("hex");
const principal = { id: "test-worker", name: "Synthetic worker" };
let revoked = false;
let protectedCalls = 0;
let operations = [];
const facade = {
  clerkMiddleware: (callback) => async (request) => {
    const auth = async () => ({ userId: null });
    auth.protect = async () => {
      protectedCalls += 1;
      throw NextResponse.json({ error: { code: "clerk_protected" } }, { status: 404 });
    };
    return callback(auth, request);
  },
  createRouteMatcher: (patterns) => {
    const match = createPathMatcher(patterns);
    return (request) => match(request.nextUrl.pathname);
  },
  authenticateAiWorker: (request) => authenticateAiWorker(request, {
    findCredentialCandidates: async (hash) => !revoked && hash === workerHash
      ? [{ ...principal, credentialHash: workerHash, previousCredentialHash: null, previousCredentialExpiresAt: null }]
      : [],
    touch: async (id) => assert.equal(id, principal.id),
  }),
  claimAiLocalJob: async (worker, input) => { operations.push({ kind: "claim", worker, input }); return null; },
  heartbeatAiLocalJob: async (worker, input) => { operations.push({ kind: "heartbeat", worker, input }); return { cancelRequested: false }; },
  completeAiLocalJob: async (worker, input) => { operations.push({ kind: "complete", worker, input }); return { status: "succeeded", duplicate: false }; },
  deliverAiAccountingOutbox: async () => { operations.push({ kind: "accounting" }); return { delivered: 0, retried: 0 }; },
  processAiLocalRetention: async () => { operations.push({ kind: "retention" }); return {}; },
};

const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const exportFacade = (names) => names.map((name) => `export const ${name} = globalThis.__dgMachineBoundary.${name};`).join("\n");
globalThis.__dgMachineBoundary = facade;
const clerkStub = moduleUrl(exportFacade(["clerkMiddleware", "createRouteMatcher"]) +
  "\nexport const clerkFrontendApiProxy = () => { throw new Error('Unexpected Clerk proxy'); };" );
const coreStub = moduleUrl(exportFacade(["authenticateAiWorker", "claimAiLocalJob", "heartbeatAiLocalJob", "completeAiLocalJob", "deliverAiAccountingOutbox", "processAiLocalRetention"]));
// Unrelated host-routing branches cannot run for these app-origin API requests.
const hostStubs = new Map([
  ["@/lib/clerk-proxy", "export const CLERK_PROXY_PATH='/__clerk'; export const shouldEnableClerkFrontendApiProxy=()=>false; export const isClerkProxyPath=()=>false; export const isOffAppClerkNavigationUrl=()=>false; export const clerkFrontendApiOrigin=()=>''; export const inAppSignInUrl=()=>'';"],
  ["@/lib/public-site-legacy", "export const applyPublicLegacyResponse=()=>null; export const canonicalPublicHostRedirect=()=>null;"],
  ["@/lib/aetherra-legacy-urls", "export const isAetherraPublicHost=()=>false;"],
  ["@/lib/dg-legacy-urls", "export const isDgPublicHost=()=>false;"],
  ["@/lib/roe-legacy-urls", "export const isRoePublicHost=()=>false;"],
]);
const hook = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@clerk/nextjs/server") return { url: clerkStub, shortCircuit: true };
  if (specifier === "@dg/platform-core") return { url: coreStub, shortCircuit: true };
  if (specifier === "next/server") return nextResolve("next/server.js", context);
  if (hostStubs.has(specifier)) return { url: moduleUrl(hostStubs.get(specifier)), shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { default: middleware } = await import("../src/middleware.ts");
const handlers = {
  claim: await import("../src/app/api/internal/ai-worker/claim/route.ts"),
  heartbeat: await import("../src/app/api/internal/ai-worker/heartbeat/route.ts"),
  complete: await import("../src/app/api/internal/ai-worker/complete/route.ts"),
  maintenance: await import("../src/app/api/cron/ai-gateway-maintenance/route.ts"),
};
hook.deregister();

const paths = {
  claim: "/api/internal/ai-worker/claim",
  heartbeat: "/api/internal/ai-worker/heartbeat",
  complete: "/api/internal/ai-worker/complete",
  maintenance: "/api/cron/ai-gateway-maintenance",
};
const operationId = "00000000-0000-4000-8000-000000000001";
const bodies = {
  claim: { operationId, requestTimestamp: Date.now() },
  heartbeat: { jobId: operationId, leaseToken: "b".repeat(43), generation: 1, operationId, sequence: 1 },
  complete: { jobId: operationId, leaseToken: "b".repeat(43), generation: 1, operationId, outcome: "succeeded", text: "Synthetic result", modelId: "dg-fast:latest", modelDigest: "c".repeat(64) },
};
const saved = {};
beforeEach(() => {
  for (const name of ["NODE_ENV", "DATABASE_URL", "CRON_SECRET"]) saved[name] = process.env[name];
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "synthetic-test-only-no-database";
  process.env.CRON_SECRET = "synthetic-cron-secret";
  revoked = false; protectedCalls = 0; operations = [];
});
afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

async function dispatch(kind, headers = {}, method = kind === "maintenance" ? "GET" : "POST") {
  const request = new NextRequest(`https://app.digitalgate.com.au${paths[kind]}`, {
    method, headers: { "x-forwarded-proto": "https", "content-type": "application/json", ...headers },
    ...(method === "POST" && bodies[kind] ? { body: JSON.stringify(bodies[kind]) } : {}),
  });
  const response = await middleware(request, {});
  assert.equal(protectedCalls, 0, "exact machine endpoint must reach its own authentication");
  assert.equal(response.headers.get("x-middleware-next"), "1");
  return handlers[kind][method](request);
}

for (const kind of ["claim", "heartbeat", "complete"]) {
  test(`Stage 0: ${kind} reaches dedicated auth and rejects missing/invalid/revoked bearer`, async () => {
    for (const authorization of [undefined, "Bearer wrong", `Bearer dgw_${"z".repeat(43)}`]) {
      const response = await dispatch(kind, authorization ? { authorization } : {});
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, "worker_unauthorized");
    }
    revoked = true;
    assert.equal((await dispatch(kind, { authorization: `Bearer ${workerCredential}` })).status, 401);
    assert.deepEqual(operations, []);
  });
  test(`Stage 0: valid ${kind} bearer reaches operation with machine identity only`, async () => {
    const response = await dispatch(kind, { authorization: `Bearer ${workerCredential}` });
    assert.equal(response.status, 200);
    assert.equal(operations.length, 1);
    assert.equal(operations[0].kind, kind);
    assert.deepEqual(operations[0].worker, principal);
    assert.equal(Object.hasOwn(operations[0].worker, "organisationId"), false);
  });
}

test("Stage 0: worker HTTPS requirement survives Clerk exemption", async () => {
  const response = await dispatch("claim", { authorization: `Bearer ${workerCredential}`, "x-forwarded-proto": "http" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "https_required");
  assert.deepEqual(operations, []);
});

test("Stage 0: maintenance fails closed for absent/wrong cron authentication", async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await dispatch("maintenance")).status, 503);
  process.env.CRON_SECRET = "synthetic-cron-secret";
  for (const headers of [{}, { "x-vercel-cron": "1" }, { authorization: "Bearer wrong" }, { "x-cron-secret": "wrong" }]) {
    assert.equal((await dispatch("maintenance", headers)).status, 401);
  }
  assert.deepEqual(operations, []);
});

test("Stage 0: authenticated maintenance GET/POST reaches accounting and retention", async () => {
  for (const [method, headers] of [["GET", { authorization: "Bearer synthetic-cron-secret" }], ["POST", { "x-cron-secret": "synthetic-cron-secret" }]]) {
    assert.equal((await dispatch("maintenance", headers, method)).status, 200);
  }
  assert.deepEqual(operations.map((entry) => entry.kind), ["accounting", "retention", "accounting", "retention"]);
});

test("Stage 0: neighbouring routes and ordinary tenant APIs still require Clerk", async () => {
  for (const pathname of ["/api/internal/ai-worker", "/api/internal/ai-worker/claim/admin", "/api/internal/ai-worker/claim-extra", "/api/internal/other", "/api/cron/ai-gateway-maintenance/admin", "/api/cron/ai-gateway-maintenance-extra", "/api/cron/future", "/api/v1/ai/assist", "/api/v1/ai/jobs/test", "/api/v1/ai/local-recipient-approvals", "/api/v1/contacts"]) {
    await assert.rejects(() => middleware(new NextRequest(`https://app.digitalgate.com.au${pathname}`), {}),
      (response) => response instanceof NextResponse && response.status === 404);
  }
  assert.equal(protectedCalls, 11);
  assert.deepEqual(operations, []);
});
