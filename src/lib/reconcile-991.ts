import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { hasPlatformAuthority } from "@dg/platform-core/access/platform-authority";

// Temporary, single-purpose surface. Delete immediately after reconciliation.
const OPERATION = "reconcile_991";
const MIGRATION = "20261007_ai_worker_provisioning_boundary";
const CHECKSUM = "55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d";
const ORIGIN = "https://app.digitalgate.com.au";
export const RECONCILE_991_PATH = "/api/admin/reconcile-991";

type Database = Pick<PrismaClient, "$transaction">;
type Transaction = Prisma.TransactionClient;
type Snapshot = { history: string; targetCount: number; olderCount: number; empty: boolean };

function refuse(): never { throw new Error("Reconciliation refused"); }
function fixed(status: number): Response {
  return Response.json({ ok: status === 200, operation: OPERATION }, {
    status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function enabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"
    && process.env.DG_RECONCILE_991_OPERATION === OPERATION
    && process.env.AI_WORKER_PROVISIONING_ENABLED !== "true";
}

function validRequest(request: Request): boolean {
  const url = new URL(request.url);
  const expected = process.env.DG_RECONCILE_991_SECRET_SHA256 ?? "";
  const secret = request.headers.get("X-DG-Reconcile-991-Secret") ?? "";
  if (request.method !== "POST" || url.origin !== ORIGIN || url.pathname !== RECONCILE_991_PATH
    || url.search || request.body !== null || request.headers.get("Origin") !== ORIGIN
    || request.headers.get("X-DG-Operation") !== OPERATION
    || !/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(secret)) return false;
  return timingSafeEqual(createHash("sha256").update(secret).digest(), Buffer.from(expected, "hex"));
}

async function operator(tx: Transaction, userId: string): Promise<void> {
  const memberships = await tx.membership.findMany({
    where: { clerkUserId: userId, status: "active" },
    select: { organisationId: true, role: true },
  });
  if (!memberships.some(m => hasPlatformAuthority({ ...m, principalId: userId }))) refuse();
}

async function state(tx: Transaction): Promise<Snapshot> {
  const [s] = await tx.$queryRaw<Snapshot[]>`
    SELECT
      COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY id)::text
        FROM public._prisma_migrations m WHERE migration_name <> ${MIGRATION}), '[]') AS history,
      (SELECT count(*)::int FROM public._prisma_migrations WHERE migration_name = ${MIGRATION}) AS "targetCount",
      (SELECT count(*)::int FROM public._prisma_migrations WHERE migration_name IN (
        '20260901_stripe_connect_tenant_trust', '20260904_business_brain_knowledge',
        '20260910_aida_public_conversations', '20260913_ai_visibility_intelligence')) AS "olderCount",
      NOT (EXISTS (SELECT 1 FROM public.ai_worker_principals)
        OR EXISTS (SELECT 1 FROM public.ai_local_deployments)
        OR EXISTS (SELECT 1 FROM public.ai_local_recipient_approvals)
        OR EXISTS (SELECT 1 FROM public.ai_inference_jobs)
        OR EXISTS (SELECT 1 FROM public.ai_worker_claim_receipts)
        OR EXISTS (SELECT 1 FROM public.ai_worker_provisioning_receipts)) AS empty`;
  if (!s || s.olderCount !== 0 || !s.empty) refuse();
  return s;
}

// Inspect actual pg_catalog definitions, not Prisma's desired schema or names alone.
async function physicalSchema(tx: Transaction): Promise<void> {
  const [catalog] = await tx.$queryRaw<{ columns: string[]; constraints: string[]; indexes: string[]; safe: boolean }[]>`
    SELECT
      ARRAY(SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':'
        || a.attnotnull::text || ':' || COALESCE(pg_get_expr(d.adbin,d.adrelid), '')
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
      ARRAY(SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          -- PostgreSQL 18 catalogs NOT NULL constraints; attnotnull above checks them.
          AND contype <> 'n'
          AND convalidated AND NOT condeferrable ORDER BY pg_get_constraintdef(oid)) AS constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class='public._prisma_migrations'::regclass) AS safe`;
  const columns = [
    "nonce:text:true:", "fingerprint:text:true:", "window_id:text:true:", "operation:text:true:",
    "outcome:text:true:", "worker_id:text:false:", "deployment_id:text:false:",
    "created_at:timestamp with time zone:true:clock_timestamp()", "completed_at:timestamp with time zone:false:",
  ];
  const constraints = [
    "PRIMARY KEY (nonce)",
    "CHECK ((nonce ~ '^[a-f0-9]{64}$'::text))",
    "CHECK ((fingerprint ~ '^[a-f0-9]{64}$'::text))",
    "CHECK ((window_id ~ '^[a-f0-9]{32}$'::text))",
    "CHECK ((operation = ANY (ARRAY['provision'::text, 'recover'::text])))",
    "CHECK ((outcome = ANY (ARRAY['attempt'::text, 'succeeded'::text, 'duplicate'::text, 'identity_mismatch'::text, 'mutation_failed'::text, 'window_closed'::text])))",
  ].sort();
  const indexes = [
    "CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce)",
    "CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at)",
    "CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = 'dg-mac-1'::text)",
  ].sort();
  if (!catalog?.safe || JSON.stringify(catalog.columns) !== JSON.stringify(columns)
    || JSON.stringify(catalog.constraints) !== JSON.stringify(constraints)
    || JSON.stringify(catalog.indexes) !== JSON.stringify(indexes)) refuse();
}

export async function handleReconcile991(request: Request, dependencies: {
  userId: () => Promise<string | null>;
  database: () => Database;
}): Promise<Response> {
  try {
    if (!enabled() || !validRequest(request)) return fixed(403);
    const userId = await dependencies.userId();
    if (!userId || userId.startsWith("api_key:")) return fixed(403);
    await dependencies.database().$transaction(async tx => {
      await operator(tx, userId);
      await physicalSchema(tx);
      const initial = await state(tx);
      if (initial.targetCount !== 0) refuse();

      // Transaction-scoped lock serializes this mechanism. Table locks also fence
      // non-cooperating writers/DDL and preserve zero provisioning state.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(991, 20261007)::text`;
      await tx.$executeRaw`LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE`;
      await tx.$executeRaw`LOCK TABLE public.memberships, public.ai_worker_principals,
        public.ai_local_deployments, public.ai_local_recipient_approvals, public.ai_inference_jobs,
        public.ai_worker_claim_receipts, public.ai_worker_provisioning_receipts IN SHARE MODE`;
      if (!enabled() || !validRequest(request)) refuse();
      await operator(tx, userId);
      await physicalSchema(tx);
      const before = await state(tx);
      if (before.targetCount !== 0 || before.history !== initial.history) refuse();

      const id = randomUUID();
      // Prisma 6.19.3 mark_migration_applied_impl: one UUID v4 and one UTC
      // timestamp bound to both columns, empty logs, no rollback, zero steps.
      const timestamp = new Date();
      const inserted = await tx.$executeRaw`INSERT INTO public._prisma_migrations
        (id, checksum, migration_name, started_at, finished_at, logs, rolled_back_at, applied_steps_count)
        VALUES (${id}, ${CHECKSUM}, ${MIGRATION}, ${timestamp}, ${timestamp}, '', NULL, 0)`;
      const after = await state(tx);
      const [verified] = await tx.$queryRaw<{ valid: boolean }[]>`SELECT
        count(*)=1 AND bool_and(id=${id} AND checksum=${CHECKSUM}
          AND started_at=finished_at AND finished_at IS NOT NULL AND logs=''
          AND rolled_back_at IS NULL AND applied_steps_count=0) AS valid
        FROM public._prisma_migrations WHERE migration_name=${MIGRATION}`;
      if (inserted !== 1 || after.targetCount !== 1 || after.history !== before.history || !verified?.valid) refuse();
    }, { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 15000 });
    return fixed(200);
  } catch {
    // Never return/log driver errors, requests, secrets, credentials or SQL.
    return fixed(403);
  }
}
