/**
 * Finance broking templates — stages, application types, required fields.
 * Accounting remains label-only until Xero exists.
 *
 * Note: Industry catalog uses a separate `FinanceTemplateKey` in industry/platform.ts —
 * keep these names distinct to avoid barrel export clashes.
 */

export type BrokingTemplateKey = "mortgage_broking" | "accounting";

export type FinanceStage = { id: string; label: string };

export type FinanceApplicationType = { id: string; label: string };

export type FinanceField = {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required?: boolean;
};

export type BrokingTemplate = {
  key: BrokingTemplateKey;
  label: string;
  description: string;
  /** Usable product floor vs label-only placeholder */
  status: "active" | "label_only";
  stages: FinanceStage[];
  applicationTypes: FinanceApplicationType[];
  requiredFields: FinanceField[];
};

export const MORTGAGE_BROKING_TEMPLATE: BrokingTemplate = {
  key: "mortgage_broking",
  label: "Mortgage / finance broking",
  description:
    "Loan applications pipeline — enquiry through settlement on Core CRM contacts",
  status: "active",
  stages: [
    { id: "enquiry", label: "Enquiry" },
    { id: "fact_find", label: "Fact find" },
    { id: "submitted", label: "Submitted" },
    { id: "conditional", label: "Conditional" },
    { id: "unconditional", label: "Unconditional" },
    { id: "settled", label: "Settled" },
    { id: "declined", label: "Declined" },
  ],
  applicationTypes: [
    { id: "home_loan", label: "Home loan" },
    { id: "refinance", label: "Refinance" },
    { id: "investment", label: "Investment loan" },
    { id: "business", label: "Business loan" },
    { id: "other", label: "Other" },
  ],
  requiredFields: [
    { id: "title", label: "Application title", type: "text", required: true },
    { id: "contactId", label: "Borrower (CRM)", type: "select", required: false },
    { id: "loanAmountCents", label: "Loan amount", type: "number", required: false },
    { id: "lenderName", label: "Lender", type: "text", required: false },
  ],
};

/** Parked until Xero — do not deepen in this programme. */
export const ACCOUNTING_TEMPLATE: BrokingTemplate = {
  key: "accounting",
  label: "Accounting & bookkeeping",
  description: "Label only until Xero connector exists — use Commerce for invoices today",
  status: "label_only",
  stages: [],
  applicationTypes: [],
  requiredFields: [],
};

const TEMPLATES: Record<BrokingTemplateKey, BrokingTemplate> = {
  mortgage_broking: MORTGAGE_BROKING_TEMPLATE,
  accounting: ACCOUNTING_TEMPLATE,
};

export function isBrokingTemplateKey(value: string): value is BrokingTemplateKey {
  return value === "mortgage_broking" || value === "accounting";
}

export function getFinanceTemplate(key?: string | null): BrokingTemplate {
  if (key && isBrokingTemplateKey(key)) return TEMPLATES[key];
  return MORTGAGE_BROKING_TEMPLATE;
}

export function listBrokingTemplates(): BrokingTemplate[] {
  return Object.values(TEMPLATES);
}

/** Default pipeline stage ids for broking board. */
export function getBrokingStageIds(): string[] {
  return MORTGAGE_BROKING_TEMPLATE.stages.map((s) => s.id);
}
