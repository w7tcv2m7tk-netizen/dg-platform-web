export type LendApplicantSnapshot = {
  externalId?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
};

export type LendLeadSnapshot = {
  externalId: string | number;
  applicant?: LendApplicantSnapshot;
  businessName?: string;
  amount?: number;
  lenderName?: string;
  purpose?: string;
  productType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STAGE_ALIASES: Record<string, string> = {
  enquiry: "enquiry",
  inquiry: "enquiry",
  fact_find: "fact_find",
  factfind: "fact_find",
  submitted: "submitted",
  conditional: "conditional",
  conditional_approval: "conditional",
  unconditional: "unconditional",
  unconditional_approval: "unconditional",
  settled: "settled",
  declined: "declined",
  rejected: "declined",
};

function normaliseStatus(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Conservative mapping: only known Lend statuses advance the DigitalGate
 * mortgage-broking pipeline. Unknown provider statuses remain enquiry and are
 * retained verbatim in metadata for review.
 */
export function mapLendStatusToFinanceStage(status?: string): string {
  return STAGE_ALIASES[normaliseStatus(status)] ?? "enquiry";
}

export function mapLendApplicantToContact(snapshot?: LendApplicantSnapshot) {
  const name = snapshot?.name?.trim() || [snapshot?.firstName, snapshot?.lastName].filter(Boolean).join(" ").trim();
  return {
    name: name || undefined,
    email: snapshot?.email?.trim().toLowerCase() || undefined,
    phone: snapshot?.phone?.trim() || undefined,
    source: "lend",
  };
}

export function mapLendLeadToFinanceApplication(snapshot: LendLeadSnapshot) {
  const externalId = String(snapshot.externalId);
  const applicant = mapLendApplicantToContact(snapshot.applicant);
  const title = snapshot.businessName?.trim() || applicant.name || `Lend application ${externalId}`;
  const amount = typeof snapshot.amount === "number" && Number.isFinite(snapshot.amount)
    ? Math.round(snapshot.amount * 100)
    : undefined;
  return {
    title,
    stage: mapLendStatusToFinanceStage(snapshot.status),
    loanAmountCents: amount,
    lenderName: snapshot.lenderName?.trim() || undefined,
    metadata: {
      connector: "lend",
      externalId,
      externalApplicantId: snapshot.applicant?.externalId != null ? String(snapshot.applicant.externalId) : undefined,
      lendStatus: snapshot.status ?? null,
      purpose: snapshot.purpose ?? null,
      productType: snapshot.productType ?? null,
      sourceCreatedAt: snapshot.createdAt ?? null,
      sourceUpdatedAt: snapshot.updatedAt ?? null,
    },
  };
}

export function lendExternalRef(externalId: string | number): string {
  return `lend:${String(externalId)}`;
}
