/**
 * illion BankStatements connector contract.
 *
 * Public illion material confirms API/integration support and delivery of
 * statements/data to a secure URL, including XML/JSON raw data. Exact partner
 * endpoints and authentication fields are intentionally not invented here;
 * those are configured only from illion-issued integration documentation.
 */
export const ILLION_BANKSTATEMENTS_CONNECTOR_ID = "illion-bankstatements" as const;
export const ILLION_BANKSTATEMENTS_TEMPLATE_ID = "mortgage_broking" as const;

export type IllionBankStatementsDelivery = {
  documentId?: string;
  applicantReference?: string;
  receivedAt?: string;
  rawFormat?: "json" | "xml" | "pdf" | string;
  accounts?: unknown[];
  transactions?: unknown[];
  income?: unknown;
  expenses?: unknown;
  documents?: unknown[];
};

export function mapIllionBankStatementsMetadata(input: IllionBankStatementsDelivery) {
  return {
    connector: ILLION_BANKSTATEMENTS_CONNECTOR_ID,
    externalDocumentId: input.documentId ?? null,
    applicantReference: input.applicantReference ?? null,
    receivedAt: input.receivedAt ?? null,
    rawFormat: input.rawFormat ?? null,
    hasAccounts: Boolean(input.accounts?.length),
    hasTransactions: Boolean(input.transactions?.length),
    hasIncomeAnalysis: input.income != null,
    hasExpenseAnalysis: input.expenses != null,
    documentCount: input.documents?.length ?? 0,
  };
}

export function illionBankStatementsExternalRef(documentId: string): string {
  return `illion-bankstatements:${documentId.trim()}`;
}
