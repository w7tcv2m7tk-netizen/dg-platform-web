import { randomUUID } from "node:crypto";

import { Prisma, prisma, type PrismaClient } from "@dg/database";

const DEFAULT_CLAIM_LEASE_MS = 15 * 60 * 1000;

type ClaimClient = Pick<PrismaClient, "$executeRaw">;

export type LeadFollowupClaimSpec = {
  organisationId: string;
  leadId: string;
  sequenceKey: string;
  sentKey: string;
  sentAtKey?: string;
};

export type LeadFollowupClaim = LeadFollowupClaimSpec & {
  token: string;
};

function claimTokenKey(sentKey: string): string {
  return `${sentKey}_claim_token`;
}

function claimAtKey(sentKey: string): string {
  return `${sentKey}_claim_at`;
}

/**
 * Atomically claims one lead follow-up without holding a transaction or DB lock
 * while the email provider is called. A claim is a short lease stored beside
 * the existing sequence metadata, so a crashed worker cannot block the send
 * forever and no production schema change is required.
 */
export async function claimLeadFollowup(
  spec: LeadFollowupClaimSpec,
  options?: {
    client?: ClaimClient;
    now?: Date;
    leaseMs?: number;
    token?: string;
  },
): Promise<LeadFollowupClaim | null> {
  const client = options?.client ?? prisma;
  const now = options?.now ?? new Date();
  const leaseMs = options?.leaseMs ?? DEFAULT_CLAIM_LEASE_MS;
  const token = options?.token ?? randomUUID();
  const claimedAt = now.toISOString();
  const staleBefore = new Date(now.getTime() - leaseMs).toISOString();
  const tokenKey = claimTokenKey(spec.sentKey);
  const atKey = claimAtKey(spec.sentKey);

  const updated = await client.$executeRaw(Prisma.sql`
    UPDATE "leads"
    SET "metadata" = jsonb_set(
      jsonb_set(
        COALESCE("metadata", '{}'::jsonb),
        ARRAY[${spec.sequenceKey}, ${atKey}]::text[],
        to_jsonb(${claimedAt}::text),
        true
      ),
      ARRAY[${spec.sequenceKey}, ${tokenKey}]::text[],
      to_jsonb(${token}::text),
      true
    )
    WHERE "id" = ${spec.leadId}
      AND "organisation_id" = ${spec.organisationId}
      AND "metadata" #> ARRAY[${spec.sequenceKey}]::text[] IS NOT NULL
      AND COALESCE(
        ("metadata" #>> ARRAY[${spec.sequenceKey}, ${spec.sentKey}]::text[])::boolean,
        false
      ) = false
      AND (
        "metadata" #>> ARRAY[${spec.sequenceKey}, ${atKey}]::text[] IS NULL
        OR "metadata" #>> ARRAY[${spec.sequenceKey}, ${atKey}]::text[] < ${staleBefore}
      )
  `);

  if (updated !== 1) return null;
  return { ...spec, token };
}

/** Mark a claimed follow-up sent, but only if this worker still owns the lease. */
export async function completeLeadFollowup(
  claim: LeadFollowupClaim,
  options?: { client?: ClaimClient; sentAt?: Date },
): Promise<boolean> {
  const client = options?.client ?? prisma;
  const sentAt = (options?.sentAt ?? new Date()).toISOString();
  const tokenKey = claimTokenKey(claim.sentKey);
  const atKey = claimAtKey(claim.sentKey);

  const withSent = claim.sentAtKey
    ? Prisma.sql`jsonb_set(
        jsonb_set(
          COALESCE("metadata", '{}'::jsonb),
          ARRAY[${claim.sequenceKey}, ${claim.sentKey}]::text[],
          'true'::jsonb,
          true
        ),
        ARRAY[${claim.sequenceKey}, ${claim.sentAtKey}]::text[],
        to_jsonb(${sentAt}::text),
        true
      )`
    : Prisma.sql`jsonb_set(
        COALESCE("metadata", '{}'::jsonb),
        ARRAY[${claim.sequenceKey}, ${claim.sentKey}]::text[],
        'true'::jsonb,
        true
      )`;

  const updated = await client.$executeRaw(Prisma.sql`
    UPDATE "leads"
    SET "metadata" = (${withSent}
      #- ARRAY[${claim.sequenceKey}, ${tokenKey}]::text[]
      #- ARRAY[${claim.sequenceKey}, ${atKey}]::text[])
    WHERE "id" = ${claim.leadId}
      AND "organisation_id" = ${claim.organisationId}
      AND "metadata" #>> ARRAY[${claim.sequenceKey}, ${tokenKey}]::text[] = ${claim.token}
  `);

  return updated === 1;
}

/** Release a failed/unsent claim so the next cron run can retry immediately. */
export async function releaseLeadFollowup(
  claim: LeadFollowupClaim,
  options?: { client?: ClaimClient },
): Promise<boolean> {
  const client = options?.client ?? prisma;
  const tokenKey = claimTokenKey(claim.sentKey);
  const atKey = claimAtKey(claim.sentKey);

  const updated = await client.$executeRaw(Prisma.sql`
    UPDATE "leads"
    SET "metadata" = (COALESCE("metadata", '{}'::jsonb)
      #- ARRAY[${claim.sequenceKey}, ${tokenKey}]::text[]
      #- ARRAY[${claim.sequenceKey}, ${atKey}]::text[])
    WHERE "id" = ${claim.leadId}
      AND "organisation_id" = ${claim.organisationId}
      AND "metadata" #>> ARRAY[${claim.sequenceKey}, ${tokenKey}]::text[] = ${claim.token}
  `);

  return updated === 1;
}
