/**
 * Sync recent Outlook / Microsoft 365 messages into OrgCommunication.
 */

import type { Prisma } from "@dg/database";

import {
  ensureValidOrgMicrosoft365AccessToken,
  fetchMicrosoftProfileEmail,
  graphApiGet,
  saveOrgMicrosoft365ConnectorTokens,
  type OrgMicrosoft365ConnectorTokens,
} from "./auth";

const MICROSOFT_PROVIDER = "microsoft";

type GraphRecipient = {
  emailAddress?: { address?: string; name?: string };
};

type GraphMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  conversationId?: string;
  parentFolderId?: string;
};

type GraphMessageList = {
  value?: GraphMessage[];
};

function recipientAddresses(list: GraphRecipient[] | undefined): string[] {
  if (!list?.length) return [];
  return list
    .map((r) => r.emailAddress?.address?.trim().toLowerCase() || "")
    .filter((e) => e.includes("@"));
}

function primaryFrom(msg: GraphMessage): string | undefined {
  const addr = msg.from?.emailAddress?.address?.trim().toLowerCase();
  return addr && addr.includes("@") ? addr : undefined;
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
  message: GraphMessage;
  direction: "inbound" | "outbound";
}): Promise<"created" | "updated" | "skipped"> {
  const { prisma } = await import("@dg/database");
  const fromAddress = primaryFrom(input.message);
  const toAddresses = recipientAddresses(input.message.toRecipients);
  const ccAddresses = recipientAddresses(input.message.ccRecipients);
  const subject = input.message.subject?.trim() || undefined;
  const when =
    input.direction === "outbound"
      ? input.message.sentDateTime
      : input.message.receivedDateTime || input.message.sentDateTime;
  const sentAt = when ? new Date(when) : new Date();

  const associateEmails =
    input.direction === "inbound"
      ? ([fromAddress, ...toAddresses].filter(Boolean) as string[])
      : ([...toAddresses, fromAddress].filter(Boolean) as string[]);
  const contactId = await findContactIdByEmail(input.organisationId, associateEmails);

  const existing = await prisma.orgCommunication.findFirst({
    where: {
      organisationId: input.organisationId,
      provider: MICROSOFT_PROVIDER,
      externalId: input.message.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    channel: "email",
    direction: input.direction,
    source: "mailbox",
    status: "delivered",
    subject: subject ?? null,
    bodyPreview: (input.message.bodyPreview || "").slice(0, 500) || null,
    fromAddress: fromAddress ?? null,
    toAddresses: toAddresses.length ? toAddresses : fromAddress ? [fromAddress] : [],
    ccAddresses,
    contactId: contactId ?? null,
    threadKey: input.message.conversationId
      ? `microsoft:${input.message.conversationId}`
      : null,
    provider: MICROSOFT_PROVIDER,
    externalId: input.message.id,
    whySent: "Synced from connected Microsoft 365 mailbox",
    triggerRule: "microsoft.sync",
    sentAt,
    metadata: {
      mailboxEmail: input.mailboxEmail,
      conversationId: input.message.conversationId ?? null,
      parentFolderId: input.message.parentFolderId ?? null,
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

export type SyncOrgMicrosoftResult = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: number;
  examined: number;
  mailboxEmail?: string;
  lastSyncAt?: string;
};

async function syncFolder(
  organisationId: string,
  mailboxEmail: string,
  accessToken: string,
  folder: "inbox" | "sentitems",
  maxMessages: number,
): Promise<{ created: number; updated: number; skipped: number; examined: number }> {
  const url = new URL(
    `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages`,
  );
  url.searchParams.set("$top", String(maxMessages));
  url.searchParams.set(
    "$select",
    "id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,conversationId,parentFolderId",
  );
  url.searchParams.set("$orderby", "receivedDateTime desc");

  const list = await graphApiGet(url.toString(), accessToken);
  if (!list.ok) {
    throw new Error(list.message);
  }

  const messages =
    list.data && typeof list.data === "object" && "value" in list.data
      ? ((list.data as GraphMessageList).value ?? [])
      : [];

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const direction = folder === "sentitems" ? "outbound" : "inbound";

  for (const message of messages) {
    if (!message?.id) {
      skipped += 1;
      continue;
    }
    try {
      const result = await upsertMailboxMessage({
        organisationId,
        mailboxEmail,
        message,
        direction,
      });
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  return { created, updated, skipped, examined: messages.length };
}

export async function syncOrgMicrosoftMailbox(
  organisationId: string,
  options?: { maxMessages?: number },
): Promise<SyncOrgMicrosoftResult> {
  const maxMessages = Math.min(options?.maxMessages ?? 40, 50);

  const ensured = await ensureValidOrgMicrosoft365AccessToken(organisationId);
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
    (await fetchMicrosoftProfileEmail(ensured.accessToken)) ||
    undefined;

  if (!mailboxEmail) {
    return {
      ok: false,
      message: "Could not resolve Microsoft profile email",
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
    };
  }

  try {
    const inbox = await syncFolder(
      organisationId,
      mailboxEmail,
      ensured.accessToken,
      "inbox",
      maxMessages,
    );
    const sent = await syncFolder(
      organisationId,
      mailboxEmail,
      ensured.accessToken,
      "sentitems",
      maxMessages,
    );

    const created = inbox.created + sent.created;
    const updated = inbox.updated + sent.updated;
    const skipped = inbox.skipped + sent.skipped;
    const examined = inbox.examined + sent.examined;
    const lastSyncAt = new Date().toISOString();

    await saveOrgMicrosoft365ConnectorTokens(organisationId, {
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
      message: `Synced ${created + updated} of ${examined} recent messages`,
      created,
      updated,
      skipped,
      examined,
      mailboxEmail,
      lastSyncAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Microsoft sync failed";
    const tokens: OrgMicrosoft365ConnectorTokens = {
      ...ensured.tokens,
      label: mailboxEmail,
      lastError: message,
      health: {
        status: "error",
        lastSyncAt: ensured.tokens.health?.lastSyncAt ?? null,
        lastError: message,
        message,
      },
    };
    await saveOrgMicrosoft365ConnectorTokens(organisationId, tokens);
    return {
      ok: false,
      message,
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
      mailboxEmail,
    };
  }
}
