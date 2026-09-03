import type { Prisma, PrismaClient } from "@dg/database";
import { randomUUID } from "node:crypto";

export const FOLLOWUP_CLAIM_LEASE_MS = 15 * 60 * 1000;

export type FollowupClaimInput = {
  organisationId: string;
  leadId: string;
  sequenceKey: string;
  sentFlag: string;
  sentAtFlag?: string;
  now?: Date;
};

export type FollowupClaim = FollowupClaimInput & {
  token: string;
  claimedAt: string;
};

export interface FollowupClaimStore {
  claim(input: FollowupClaim): Promise<boolean>;
  complete(input: FollowupClaim, sentAt: string): Promise<boolean>;
  release(input: FollowupClaim): Promise<void>;
}

function claimFlag(sentFlag: string): string {
  return sentFlag.endsWith("_sent")
    ? `${sentFlag.slice(0, -5)}_claim`
    : `${sentFlag}_claim`;
}

export function createPrismaFollowupClaimStore(
  prisma: PrismaClient,
  leaseMs = FOLLOWUP_CLAIM_LEASE_MS,
): FollowupClaimStore {
  return {
    async claim(input) {
      const claimKey = claimFlag(input.sentFlag);
      const staleBefore = new Date(
        new Date(input.claimedAt).getTime() - leaseMs,
      ).toISOString();
      const claimJson = JSON.stringify({
        token: input.token,
        claimedAt: input.claimedAt,
      });

      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "leads"
        SET "metadata" = jsonb_set(
              COALESCE("metadata", '{}'::jsonb),
              ARRAY[${input.sequenceKey}, ${claimKey}]::text[],
              ${claimJson}::jsonb,
              true
            ),
            "updated_at" = NOW()
        WHERE "id" = ${input.leadId}
          AND "organisation_id" = ${input.organisationId}
          AND COALESCE(
                "metadata" #>> ARRAY[${input.sequenceKey}, ${input.sentFlag}]::text[],
                'false'
              ) <> 'true'
          AND (
            "metadata" #>> ARRAY[${input.sequenceKey}, ${claimKey}, 'claimedAt']::text[] IS NULL
            OR "metadata" #>> ARRAY[${input.sequenceKey}, ${claimKey}, 'claimedAt']::text[] <= ${staleBefore}
          )
        RETURNING "id"
      `;
      return rows.length === 1;
    },

    async complete(input, sentAt) {
      const claimKey = claimFlag(input.sentFlag);
      const base = Prisma.sql`jsonb_set(
        COALESCE("metadata", '{}'::jsonb),
        ARRAY[${input.sequenceKey}, ${input.sentFlag}]::text[],
        'true'::jsonb,
        true
      )`;
      const withSentAt = input.sentAtFlag
        ? Prisma.sql`jsonb_set(
            ${base},
            ARRAY[${input.sequenceKey}, ${input.sentAtFlag}]::text[],
            ${JSON.stringify(sentAt)}::jsonb,
            true
          )`
        : base;

      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "leads"
        SET "metadata" = (${withSentAt}) #- ARRAY[${input.sequenceKey}, ${claimKey}]::text[],
            "updated_at" = NOW()
        WHERE "id" = ${input.leadId}
          AND "organisation_id" = ${input.organisationId}
          AND COALESCE(
                "metadata" #>> ARRAY[${input.sequenceKey}, ${input.sentFlag}]::text[],
                'false'
              ) <> 'true'
          AND "metadata" #>> ARRAY[${input.sequenceKey}, ${claimKey}, 'token']::text[] = ${input.token}
        RETURNING "id"
      `;
      return rows.length === 1;
    },

    async release(input) {
      const claimKey = claimFlag(input.sentFlag);
      await prisma.$executeRaw`
        UPDATE "leads"
        SET "metadata" = COALESCE("metadata", '{}'::jsonb) #- ARRAY[${input.sequenceKey}, ${claimKey}]::text[],
            "updated_at" = NOW()
        WHERE "id" = ${input.leadId}
          AND "organisation_id" = ${input.organisationId}
          AND COALESCE(
                "metadata" #>> ARRAY[${input.sequenceKey}, ${input.sentFlag}]::text[],
                'false'
              ) <> 'true'
          AND "metadata" #>> ARRAY[${input.sequenceKey}, ${claimKey}, 'token']::text[] = ${input.token}
      `;
    },
  };
}

export async function acquireFollowupClaim(
  store: FollowupClaimStore,
  input: FollowupClaimInput,
): Promise<FollowupClaim | null> {
  const now = input.now ?? new Date();
  const claim: FollowupClaim = {
    ...input,
    token: randomUUID(),
    claimedAt: now.toISOString(),
  };
  return (await store.claim(claim)) ? claim : null;
}

export async function runClaimedFollowup<T>(input: {
  store: FollowupClaimStore;
  claim: FollowupClaimInput;
  send: () => Promise<{ accepted: boolean; value: T }>;
}): Promise<
  | { status: "not_claimed" }
  | { status: "sent"; value: T }
  | { status: "failed"; value: T }
> {
  const claim = await acquireFollowupClaim(input.store, input.claim);
  if (!claim) return { status: "not_claimed" };

  try {
    const outcome = await input.send();
    if (!outcome.accepted) {
      await input.store.release(claim);
      return { status: "failed", value: outcome.value };
    }

    const sentAt = new Date().toISOString();
    const completed = await input.store.complete(claim, sentAt);
    if (!completed) {
      throw new Error(
        `Follow-up claim completion lost for ${claim.organisationId}/${claim.leadId}/${claim.sentFlag}`,
      );
    }
    return { status: "sent", value: outcome.value };
  } catch (err) {
    await input.store.release(claim).catch(() => undefined);
    throw err;
  }
}
