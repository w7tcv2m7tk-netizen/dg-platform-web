/**
 * Services App — shared engine types + Service Templates.
 * @see docs/foundations/SERVICES-APP.md
 */

export const SERVICE_TEMPLATE_KEYS = [
  "electrician",
  "plumber",
  "builder",
  "cleaner",
  "landscaper",
  "hvac",
  "pest_control",
  "painter",
  "handyman",
  "solar",
  "pool_service",
  "general",
] as const;

export type ServiceTemplateKey = (typeof SERVICE_TEMPLATE_KEYS)[number];

export const SERVICE_JOB_STATUSES = ["open", "won", "lost", "cancelled"] as const;
export type ServiceJobStatus = (typeof SERVICE_JOB_STATUSES)[number];

export type ServiceWorkflowStage = {
  id: string;
  label: string;
};

export type ServiceJobTypeDef = {
  id: string;
  label: string;
};

export type ServiceTemplate = {
  key: ServiceTemplateKey;
  label: string;
  description: string;
  /** Catalogue lines suggested into Business Profile / Commerce later */
  services: string[];
  jobTypes: ServiceJobTypeDef[];
  workflow: ServiceWorkflowStage[];
  /** Extra job metadata field keys for the UI */
  jobFields: { id: string; label: string; type: "text" | "textarea" | "boolean" }[];
  terminology: {
    job: string;
    customer: string;
    quote: string;
  };
};

export type ServiceJobRecord = {
  id: string;
  organisationId: string;
  title: string;
  stage: string;
  status: ServiceJobStatus;
  jobType: string | null;
  description: string | null;
  contactId: string | null;
  leadId: string | null;
  quoteId: string | null;
  assignedUserId: string | null;
  siteAddress: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  completedAt: string | null;
  templateKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceJobInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  stage?: string;
  status?: ServiceJobStatus;
  jobType?: string;
  description?: string;
  contactId?: string;
  leadId?: string;
  siteAddress?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  assignedUserId?: string | null;
  templateKey?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateServiceJobInput = {
  organisationId: string;
  jobId: string;
  actorId?: string;
  title?: string;
  stage?: string;
  status?: ServiceJobStatus;
  jobType?: string | null;
  description?: string | null;
  contactId?: string | null;
  siteAddress?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  assignedUserId?: string | null;
  quoteId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ListServiceJobsOptions = {
  organisationId: string;
  status?: string;
  stage?: string;
  contactId?: string;
  /** Jobs scheduled on/after this ISO date */
  scheduledFrom?: string;
  scheduledTo?: string;
  limit?: number;
  offset?: number;
};
