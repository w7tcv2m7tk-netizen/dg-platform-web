export type FinanceApplicationStatus = "open" | "closed" | "won" | "lost";

export type FinanceApplicationRecord = {
  id: string;
  organisationId: string;
  title: string;
  stage: string;
  status: FinanceApplicationStatus;
  contactId: string | null;
  loanAmountCents: number | null;
  lenderName: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFinanceApplicationInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  stage?: string;
  contactId?: string;
  loanAmountCents?: number;
  lenderName?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateFinanceApplicationInput = {
  organisationId: string;
  applicationId: string;
  actorId?: string;
  title?: string;
  stage?: string;
  status?: FinanceApplicationStatus;
  contactId?: string | null;
  loanAmountCents?: number | null;
  lenderName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ListFinanceApplicationsOptions = {
  organisationId: string;
  status?: string;
  stage?: string;
  q?: string;
  limit?: number;
  offset?: number;
};
