import {
  TASK_STATUSES,
  completeTask,
  createTask,
  getTask,
  listTasks,
  updateTask,
  type TaskStatus,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.tasks.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const row = await getTask(session.organisationId, id);
    if (!row) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Task not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: row });
  }

  const result = await listTasks({
    organisationId: session.organisationId,
    status: searchParams.get("status") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    assignedUserId: searchParams.get("assignedUserId") ?? undefined,
    limit: searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined,
    offset: searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.tasks.write");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "title required" } },
      { status: 422 },
    );
  }

  if (body.status !== undefined && !isTaskStatus(body.status)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: `status must be one of: ${TASK_STATUSES.join(", ")}`,
        },
      },
      { status: 422 },
    );
  }

  const task = await createTask({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    title,
    description:
      typeof body.description === "string" ? body.description : undefined,
    status: isTaskStatus(body.status) ? body.status : undefined,
    assignedUserId:
      typeof body.assignedUserId === "string" ? body.assignedUserId : undefined,
    dueAt: typeof body.dueAt === "string" || body.dueAt === null ? body.dueAt : undefined,
    entityType: typeof body.entityType === "string" ? body.entityType : undefined,
    entityId: typeof body.entityId === "string" ? body.entityId : undefined,
    priority: typeof body.priority === "string" ? body.priority : undefined,
    sourceApp: typeof body.sourceApp === "string" ? body.sourceApp : undefined,
    createRelatedActivity:
      typeof body.createRelatedActivity === "boolean"
        ? body.createRelatedActivity
        : undefined,
  });

  return NextResponse.json({ data: task }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.tasks.write");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : undefined;

  if (!id) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id required" } },
      { status: 422 },
    );
  }

  if (body?.action === "complete" || body?.status === "completed") {
    const updated = await completeTask(
      session.organisationId,
      id,
      session.clerkUserId,
    );
    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Task not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  }

  if (body?.status !== undefined && !isTaskStatus(body.status)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: `status must be one of: ${TASK_STATUSES.join(", ")}`,
        },
      },
      { status: 422 },
    );
  }

  const updated = await updateTask({
    organisationId: session.organisationId,
    taskId: id,
    actorId: session.clerkUserId,
    title: typeof body?.title === "string" ? body.title : undefined,
    description:
      typeof body?.description === "string" || body?.description === null
        ? body.description
        : undefined,
    status: isTaskStatus(body?.status) ? body.status : undefined,
    assignedUserId:
      typeof body?.assignedUserId === "string" || body?.assignedUserId === null
        ? body.assignedUserId
        : undefined,
    dueAt:
      typeof body?.dueAt === "string" || body?.dueAt === null
        ? body.dueAt
        : undefined,
    entityType:
      typeof body?.entityType === "string" || body?.entityType === null
        ? body.entityType
        : undefined,
    entityId:
      typeof body?.entityId === "string" || body?.entityId === null
        ? body.entityId
        : undefined,
    priority:
      typeof body?.priority === "string" || body?.priority === null
        ? body.priority
        : undefined,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Task not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
