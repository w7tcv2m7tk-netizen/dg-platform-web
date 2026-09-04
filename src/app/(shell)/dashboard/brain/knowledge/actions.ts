"use server";

import { revalidatePath } from "next/cache";
import {
  approveKnowledgeItem,
  isOrgAdminRole,
  rejectKnowledgeItem,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

async function requireKnowledgeApprover() {
  const { session, clerkUserId } = await getPlatformPageContext();
  if (!session || !clerkUserId) {
    throw new Error("You must be signed in to review Business Brain knowledge.");
  }
  if (!isOrgAdminRole(session.role)) {
    throw new Error("Only organisation owners and admins can approve or reject Business Brain knowledge.");
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
