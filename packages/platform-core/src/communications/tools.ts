import type { Prisma } from "@dg/database";
import { createContact, listContacts, updateContact } from "../contacts";
import { createOpportunity, listOpportunities } from "../opportunities";
import { createTask } from "../tasks";
import { getAuthorisedAgentContext } from "./context";
import { emptyIfUnmigrated } from "./db";
import type { AgentToolName } from "./providers/types";

export type ToolExecutionContext = {
  organisationId: string;
  agentId?: string | null;
  sessionId?: string | null;
  enabledTools: AgentToolName[] | string[];
};

export type ToolResult = {
  ok: boolean;
  tool: string;
  result?: Record<string, unknown>;
  error?: string;
};

const TOOL_FEATURES: Record<string, string> = {
  get_business_profile: "comms.knowledge.read",
  get_business_hours: "comms.knowledge.read",
  search_contact: "crm.contacts.read",
  create_contact: "crm.contacts.write",
  update_contact: "crm.contacts.write",
  search_opportunity: "crm.opportunities.read",
  create_opportunity: "crm.opportunities.write",
  update_opportunity: "crm.opportunities.write",
  create_task: "crm.tasks.write",
  get_available_appointments: "comms.agents.configure",
  book_appointment: "comms.agents.configure",
  send_sms: "comms.messages.send",
  send_email: "comms.messages.send",
  transfer_to_human: "comms.call_centre.read",
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function logAction(input: {
  organisationId: string;
  sessionId?: string | null;
  agentId?: string | null;
  tool: string;
  status: string;
  args: Record<string, unknown>;
  output?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  error?: string;
}) {
  const { prisma } = await import("@dg/database");
  await emptyIfUnmigrated(async () => {
    await prisma.agentAction.create({
      data: {
        organisationId: input.organisationId,
        sessionId: input.sessionId ?? null,
        agentId: input.agentId ?? null,
        tool: input.tool,
        status: input.status,
        input: input.args as Prisma.InputJsonValue,
        output: (input.output ?? undefined) as Prisma.InputJsonValue | undefined,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        error: input.error ?? null,
        actorType: "agent",
      },
    });
  }, undefined);
}

async function executeNamedTool(
  ctx: ToolExecutionContext,
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (tool) {
    case "get_business_profile": {
      const profile = await getAuthorisedAgentContext(ctx.organisationId);
      return { ok: true, tool, result: profile };
    }
    case "get_business_hours": {
      const profile = await getAuthorisedAgentContext(ctx.organisationId);
      return {
        ok: true,
        tool,
        result: { hours: profile.hours, timezone: profile.timezone },
      };
    }
    case "search_contact": {
      const query = str(args.query) || str(args.phone) || str(args.email);
      if (!query) return { ok: false, tool, error: "query, phone, or email is required" };
      const found = await listContacts({
        organisationId: ctx.organisationId,
        search: query,
        limit: 5,
      });
      return {
        ok: true,
        tool,
        result: {
          contacts: found.items.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            email: c.email,
            status: c.status,
          })),
        },
      };
    }
    case "create_contact": {
      const firstName = str(args.firstName) || str(args.name) || "Unknown";
      const contact = await createContact({
        organisationId: ctx.organisationId,
        firstName,
        lastName: str(args.lastName) || undefined,
        email: str(args.email) || undefined,
        phone: str(args.phone) || undefined,
        source: "AI Communications",
      });
      return {
        ok: true,
        tool,
        result: { contactId: contact.id, firstName: contact.firstName },
      };
    }
    case "update_contact": {
      const contactId = str(args.contactId);
      if (!contactId) return { ok: false, tool, error: "contactId is required" };
      const contact = await updateContact({
        organisationId: ctx.organisationId,
        contactId,
        firstName: str(args.firstName) || undefined,
        lastName: str(args.lastName) || undefined,
        email: str(args.email) || undefined,
        phone: str(args.phone) || undefined,
      });
      if (!contact) return { ok: false, tool, error: "Contact not found" };
      return { ok: true, tool, result: { contactId: contact.id } };
    }
    case "search_opportunity": {
      const listed = await listOpportunities({
        organisationId: ctx.organisationId,
        limit: 10,
      });
      const query = str(args.query).toLowerCase();
      const items = listed.items
        .filter((row) => !query || row.title.toLowerCase().includes(query))
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          title: row.title,
          stage: row.stage,
          status: row.status,
          contactId: row.contactId,
        }));
      return { ok: true, tool, result: { opportunities: items } };
    }
    case "create_opportunity": {
      const title = str(args.title);
      if (!title) return { ok: false, tool, error: "title is required" };
      const opportunity = await createOpportunity({
        organisationId: ctx.organisationId,
        title,
        stage: str(args.stage) || "new",
        contactId: str(args.contactId) || undefined,
        metadata: {
          source: "AI Communications",
          channel: "voice",
          sessionId: ctx.sessionId,
          agentId: ctx.agentId,
        },
      });
      return { ok: true, tool, result: { opportunityId: opportunity.id } };
    }
    case "update_opportunity": {
      return {
        ok: false,
        tool,
        error: "update_opportunity is not enabled in Phase 1 — create a follow-up task instead",
      };
    }
    case "create_task": {
      const title = str(args.title);
      if (!title) return { ok: false, tool, error: "title is required" };
      const task = await createTask({
        organisationId: ctx.organisationId,
        title,
        description: str(args.description) || undefined,
        entityType: str(args.entityType) || (ctx.sessionId ? "CommunicationSession" : undefined),
        entityId: str(args.entityId) || ctx.sessionId || undefined,
        sourceApp: "ai-communications",
        metadata: { sessionId: ctx.sessionId, agentId: ctx.agentId },
      });
      return { ok: true, tool, result: { taskId: task.id } };
    }
    case "get_available_appointments":
    case "book_appointment":
      return { ok: false, tool, error: "Appointment booking ships in Phase 2" };
    case "send_sms": {
      const to = str(args.to) || str(args.phone);
      const body = str(args.body) || str(args.message);
      if (!to || !body) return { ok: false, tool, error: "to and body are required" };
      const { sendMessage } = await import("./index");
      const sent = await sendMessage({
        organisationId: ctx.organisationId,
        channel: "sms",
        to,
        body,
        metadata: { sessionId: ctx.sessionId },
      });
      return { ok: true, tool, result: { status: sent.status, id: sent.id } };
    }
    case "send_email": {
      const to = str(args.to) || str(args.email);
      const body = str(args.body) || str(args.message);
      if (!to || !body) return { ok: false, tool, error: "to and body are required" };
      const { sendMessage } = await import("./index");
      const sent = await sendMessage({
        organisationId: ctx.organisationId,
        channel: "email",
        to,
        subject: str(args.subject) || "Message from DigitalGate",
        body,
        metadata: { sessionId: ctx.sessionId },
      });
      return { ok: true, tool, result: { status: sent.status, id: sent.id } };
    }
    case "transfer_to_human":
      return {
        ok: true,
        tool,
        result: {
          transferred: true,
          reason: str(args.reason) || "Caller requested a human",
        },
      };
    default:
      return { ok: false, tool, error: "Unknown tool" };
  }
}

export async function executeAgentTool(input: {
  ctx: ToolExecutionContext;
  tool: string;
  args?: Record<string, unknown>;
}): Promise<ToolResult> {
  const tool = input.tool.trim();
  const args = input.args && typeof input.args === "object" ? input.args : {};

  if (!input.ctx.enabledTools.includes(tool as AgentToolName)) {
    const denied: ToolResult = { ok: false, tool, error: "Tool is not enabled for this agent" };
    await logAction({ ...input.ctx, tool, status: "denied", args, error: denied.error });
    return denied;
  }

  if (!TOOL_FEATURES[tool]) {
    const denied: ToolResult = { ok: false, tool, error: "Unregistered tool" };
    await logAction({ ...input.ctx, tool, status: "denied", args, error: denied.error });
    return denied;
  }

  try {
    const result = await executeNamedTool(input.ctx, tool, args);
    await logAction({
      organisationId: input.ctx.organisationId,
      sessionId: input.ctx.sessionId,
      agentId: input.ctx.agentId,
      tool,
      status: result.ok ? "ok" : "error",
      args,
      output: result.result,
      entityType:
        typeof result.result?.contactId === "string"
          ? "Contact"
          : typeof result.result?.opportunityId === "string"
            ? "Opportunity"
            : typeof result.result?.taskId === "string"
              ? "Task"
              : undefined,
      entityId: String(
        result.result?.contactId ??
          result.result?.opportunityId ??
          result.result?.taskId ??
          "",
      ) || undefined,
      error: result.error,
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Tool failed";
    await logAction({
      organisationId: input.ctx.organisationId,
      sessionId: input.ctx.sessionId,
      agentId: input.ctx.agentId,
      tool,
      status: "error",
      args,
      error,
    });
    return { ok: false, tool, error };
  }
}

export { TOOL_FEATURES };
