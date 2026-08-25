/**
 * Sync recent Gmail messages into OrgCommunication (mailbox SoT → DG orchestration).
 */

import type { Prisma } from "@dg/database";

import {
  ensureValidOrgGoogleGmailAccessToken,
  fetchGmailProfileEmail,
  saveOrgGoogleGmailConnectorTokens,
  type OrgGoogleGmailConnectorTokens,
} from "./gmail-auth";
import { googleApiGet } from "./auth";

const GMAIL_PROVIDER = "gmail";

type GmailHeader = { name?: string; value?: string };
type GmailMessageList = {
  messages?: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
};
type GmailMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
  };
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers?.length) return "";
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value?.trim() || "";
}

function parseAddressList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      const email = (match?.[1] || part).trim().toLowerCase();
      return email.includes("@") ? email : "";
    })
    .filter(Boolean);
}

function primaryAddress(raw: string): string | undefined {
  const list = parseAddressList(raw);
  return list[0];
}

async function findContactIdByEmail(
  organisationId: string,
  emails: string[],
): Promise<string | undefined> {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()).filter(Boolean))];
  if (!unique.length) return undefined;
  const { prisma } = await import("@dg/database");
  const contacts = await prisma.contact.findMany({
    where: {
      organisationId,
      deletedAt: null,
      email: { in: unique, mode: "insensitive" },
    },
    select: { id: true, email: true },
    take: 5,
  });
  if (contacts.length === 1) return contacts[0].id;
  if (contacts.length > 1) {
    // Prefer exact match on first email in the list order
    for (const email of unique) {
      const hit = contacts.find((c) => c.email?.toLowerCase() === email);
      if (hit) return hit.id;
    }
  }
  return undefined;
}

async function upsertMailboxMessage(input: {
  organisationId: string;
  mailboxEmail: string;
  message: GmailMessage;
}): Promise<"created" | "updated" | "skipped"> {
  const { prisma } = await import("@dg/database");
  const headers = input.message.payload?.headers;
  const fromRaw = headerValue(headers, "From");
  const toRaw = headerValue(headers, "To");
  const ccRaw = headerValue(headers, "Cc");
  const subject = headerValue(headers, "Subject") || undefined;
  const fromAddress = primaryAddress(fromRaw) || fromRaw || undefined;
  const toAddresses = parseAddressList(toRaw);
  const ccAddresses = parseAddressList(ccRaw);
  const labelIds = input.message.labelIds ?? [];
  const isSent = labelIds.includes("SENT");
  const direction = isSent ? "outbound" : "inbound";

  const sentAtMs = input.message.internalDate
    ? Number(input.message.internalDate)
    : NaN;
  const sentAt = Number.isFinite(sentAtMs) ? new Date(sentAtMs) : new Date();

  const associateEmails =
    direction === "inbound"
      ? [fromAddress, ...toAddresses].filter(Boolean) as string[]
      : [...toAddresses, fromAddress].filter(Boolean) as string[];
  const contactId = await findContactIdByEmail(
    input.organisationId,
    associateEmails,
  );

  const existing = await prisma.orgCommunication.findFirst({
    where: {
      organisationId: input.organisationId,
      provider: GMAIL_PROVIDER,
      externalId: input.message.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    channel: "email",
    direction,
    source: "mailbox",
    status: "delivered",
    subject: subject ?? null,
    bodyPreview: (input.message.snippet || "").slice(0, 500) || null,
    fromAddress: fromAddress ?? null,
    toAddresses: toAddresses.length ? toAddresses : fromAddress ? [fromAddress] : [],
    ccAddresses,
    contactId: contactId ?? null,
    threadKey: input.message.threadId
      ? `gmail:${input.message.threadId}`
      : null,
    provider: GMAIL_PROVIDER,
    externalId: input.message.id,
    whySent: "Synced from connected Gmail mailbox",
    triggerRule: "gmail.sync",
    sentAt,
    metadata: {
      mailboxEmail: input.mailboxEmail,
      labelIds,
      gmailThreadId: input.message.threadId ?? null,
    } as Prisma.InputJsonValue,
  };

  if (existing) {
    await prisma.orgCommunication.update({
      where: { id: existing.id },
      data,
    });
    return "updated";
  }

  await prisma.orgCommunication.create({
    data: {
      organisationId: input.organisationId,
      ...data,
    },
  });
  return "created";
}

export type SyncOrgGmailResult = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: number;
  examined: number;
  mailboxEmail?: string;
  lastSyncAt?: string;
};

export async function syncOrgGmailMailbox(
  organisationId: string,
  options?: { maxMessages?: number; newerThanDays?: number },
): Promise<SyncOrgGmailResult> {
  const maxMessages = Math.min(options?.maxMessages ?? 75, 100);
  const newerThanDays = options?.newerThanDays ?? 30;

  const ensured = await ensureValidOrgGoogleGmailAccessToken(organisationId);
  if (!ensured.ok) {
    return {
      ok: false,
      message: ensured.message,
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
    };
  }

  const mailboxEmail =
    ensured.tokens.label ||
    (await fetchGmailProfileEmail(ensured.accessToken)) ||
    undefined;

  if (!mailboxEmail) {
    return {
      ok: false,
      message: "Could not resolve Gmail profile email",
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
    };
  }

  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.set("maxResults", String(maxMessages));
  listUrl.searchParams.set("q", `newer_than:${newerThanDays}d`);

  const list = await googleApiGet(listUrl.toString(), ensured.accessToken);
  if (!list.ok) {
    const tokens: OrgGoogleGmailConnectorTokens = {
      ...ensured.tokens,
      label: mailboxEmail,
      lastError: list.message,
      health: {
        status: "error",
        lastSyncAt: ensured.tokens.health?.lastSyncAt ?? null,
        lastError: list.message,
        message: list.message,
      },
    };
    await saveOrgGoogleGmailConnectorTokens(organisationId, tokens);
    return {
      ok: false,
      message: list.message,
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
      mailboxEmail,
    };
  }

  const messageRefs =
    list.data && typeof list.data === "object" && "messages" in list.data
      ? ((list.data as GmailMessageList).messages ?? [])
      : [];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const ref of messageRefs) {
    if (!ref?.id) {
      skipped += 1;
      continue;
    }
    const detail = await googleApiGet(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}` +
        `?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject`,
      ensured.accessToken,
    );
    if (!detail.ok || !detail.data || typeof detail.data !== "object") {
      skipped += 1;
      continue;
    }

    try {
      const result = await upsertMailboxMessage({
        organisationId,
        mailboxEmail,
        message: detail.data as GmailMessage,
      });
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  const lastSyncAt = new Date().toISOString();
  await saveOrgGoogleGmailConnectorTokens(organisationId, {
    ...ensured.tokens,
    label: mailboxEmail,
    lastError: undefined,
    health: {
      status: "connected",
      lastSyncAt,
      lastError: null,
      messagesSynced: created + updated,
      message: `Synced ${created + updated} message(s)`,
    },
  });

  return {
    ok: true,
    message: `Synced ${created + updated} of ${messageRefs.length} recent messages`,
    created,
    updated,
    skipped,
    examined: messageRefs.length,
    mailboxEmail,
    lastSyncAt,
  };
}
