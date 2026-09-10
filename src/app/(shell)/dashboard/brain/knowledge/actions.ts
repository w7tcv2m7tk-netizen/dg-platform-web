"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  approveKnowledgeItem,
  isOrgAdminRole,
  proposeKnowledgeItem,
  rejectKnowledgeItem,
  upsertKnowledgeSource,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

async function requireKnowledgeApprover() {
  const { session, clerkUserId } = await getPlatformPageContext();
  if (!session || !clerkUserId) {
    throw new Error("You must be signed in to review Business Brain knowledge.");
  }
  if (!isOrgAdminRole(session.role)) {
    throw new Error("Only organisation owners and admins can manage Business Brain knowledge.");
  }
  return { session, actorId: clerkUserId };
}

function readItemId(formData: FormData) {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string" || itemId.length < 1 || itemId.length > 200) {
    throw new Error("Invalid knowledge item.");
  }
  return itemId;
}

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function proposeKnowledgeAction(formData: FormData) {
  const { session, actorId } = await requireKnowledgeApprover();
  const title = readText(formData, "title", 160);
  const statement = readText(formData, "statement", 5000);
  const type = readText(formData, "type", 50) || "fact";
  const importance = readText(formData, "importance", 20) || "medium";

  if (!title || !statement) {
    throw new Error("Add a title and the knowledge DigitalGate should remember.");
  }

  const allowedTypes = new Set(["fact", "decision", "strategy", "policy", "process", "principle"]);
  const allowedImportance = new Set(["low", "medium", "high", "critical"]);
  if (!allowedTypes.has(type) || !allowedImportance.has(importance)) {
    throw new Error("Invalid knowledge classification.");
  }

  const sourceRef = `user-entry:${randomUUID()}`;
  const sourceId = await upsertKnowledgeSource({
    organisationId: session.organisationId,
    sourceType: "user_entry",
    title,
    sourceApp: "business_brain",
    sourceRef,
    capturedAt: new Date(),
    metadata: { enteredBy: actorId },
  });

  await proposeKnowledgeItem({
    organisationId: session.organisationId,
    type,
    title,
    statement,
    importance,
    sourceId,
    sourceRef,
    sourceExcerpt: statement.slice(0, 500),
    createdBy: actorId,
    metadata: { sourceType: "user_entry" },
  });

  revalidatePath("/dashboard/brain");
  revalidatePath("/dashboard/brain/knowledge");
}

export async function approveKnowledgeAction(formData: FormData) {
  const { session, actorId } = await requireKnowledgeApprover();
  const itemId = readItemId(formData);

  await approveKnowledgeItem({
    organisationId: session.organisationId,
    itemId,
    actorId,
  });

  revalidatePath("/dashboard/brain");
  revalidatePath("/dashboard/brain/knowledge");
  revalidatePath("/dashboard/advisor");
}

export async function rejectKnowledgeAction(formData: FormData) {
  const { session, actorId } = await requireKnowledgeApprover();
  const itemId = readItemId(formData);
  const reason = formData.get("reason");

  await rejectKnowledgeItem({
    organisationId: session.organisationId,
    itemId,
    actorId,
    reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 500) : undefined,
  });

  revalidatePath("/dashboard/brain");
  revalidatePath("/dashboard/brain/knowledge");
  revalidatePath("/dashboard/advisor");
}
