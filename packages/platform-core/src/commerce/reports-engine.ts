/**
 * Commerce financial reports from invoices & payments.
 *
 * Honest scope: DigitalGate is not a general ledger. Balance Sheet and Cash Flow
 * summarise AR + settled payments only — no fake double-entry.
 */

export type ReportDateRange = {
  from: Date;
  to: Date;
};

export type CommerceReportLine = {
  label: string;
  amountCents: number;
  note?: string;
};

export type CommerceProfitAndLossReport = {
  kind: "profit_and_loss";
  organisationId: string;
  range: { from: string; to: string };
  currency: string;
  scopeNote: string;
  income: CommerceReportLine[];
  expenses: CommerceReportLine[];
  incomeTotalCents: number;
  expenseTotalCents: number;
  netProfitCents: number;
};

export type CommerceGstReport = {
  kind: "gst";
  organisationId: string;
  range: { from: string; to: string };
  currency: string;
  scopeNote: string;
  /** GST collected on invoices issued in range (ex void) */
  gstOnSalesCents: number;
  taxableSalesExGstCents: number;
  gstFreeSalesCents: number;
  totalSalesIncGstCents: number;
  /** GST on refunds in range (reduces net GST) */
  gstOnRefundsCents: number;
  netGstCents: number;
  invoiceCount: number;
  lines: Array<{
    invoiceNumber: string | null;
    issuedAt: string;
    status: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  }>;
};

export type CommerceBalanceSheetReport = {
  kind: "balance_sheet";
  organisationId: string;
  asOf: string;
  currency: string;
  scopeNote: string;
  assets: CommerceReportLine[];
  liabilities: CommerceReportLine[];
  equity: CommerceReportLine[];
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
};

export type CommerceCashFlowReport = {
  kind: "cash_flow";
  organisationId: string;
  range: { from: string; to: string };
  currency: string;
  scopeNote: string;
  operatingInflows: CommerceReportLine[];
  operatingOutflows: CommerceReportLine[];
  netCashCents: number;
  paymentCount: number;
  refundCount: number;
};

function iso(d: Date) {
  return d.toISOString();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseReportRange(from?: string | null, to?: string | null): ReportDateRange {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromDate = from ? startOfDay(new Date(from)) : startOfDay(defaultFrom);
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(now);
  return { from: fromDate, to: toDate };
}

export async function getProfitAndLossReport(
  organisationId: string,
  range: ReportDateRange,
): Promise<CommerceProfitAndLossReport> {
  const { prisma } = await import("@dg/database");

  const [paidInvoices, succeededPayments] = await Promise.all([
    prisma.commerceInvoice.findMany({
      where: {
        organisationId,
        status: "paid",
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      select: { subtotalCents: true, taxCents: true, totalCents: true },
    }),
    prisma.commercePayment.aggregate({
      where: {
        organisationId,
        status: "succeeded",
        paidAt: { gte: range.from, lte: range.to },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const invoiceRevenue = paidInvoices.reduce((s, i) => s + i.totalCents, 0);
  const paymentRevenue = succeededPayments._sum.amountCents ?? 0;
  /** Prefer settled payments when present; else paid invoices */
  const revenueCents = paymentRevenue > 0 ? paymentRevenue : invoiceRevenue;
  const gstPortion = paidInvoices.reduce((s, i) => s + i.taxCents, 0);

  const income: CommerceReportLine[] = [
    {
      label: "Sales / invoice receipts",
      amountCents: revenueCents,
      note:
        paymentRevenue > 0
          ? "Succeeded Commerce payments in range"
          : "Paid invoices in range (no payments recorded)",
    },
  ];
  if (gstPortion > 0 && paymentRevenue === 0) {
    income.push({
      label: "  of which GST collected",
      amountCents: gstPortion,
      note: "Included in totals above",
    });
  }

  const expenses: CommerceReportLine[] = [
    {
      label: "Operating expenses",
      amountCents: 0,
      note: "Not tracked in DigitalGate Commerce — connect accounting later",
    },
  ];

  return {
    kind: "profit_and_loss",
    organisationId,
    range: { from: iso(range.from), to: iso(range.to) },
    currency: "AUD",
    scopeNote:
      "Based on invoices & payments in DigitalGate. Not a full accounting P&L — expenses and COGS are not recorded here.",
    income,
    expenses,
    incomeTotalCents: revenueCents,
    expenseTotalCents: 0,
    netProfitCents: revenueCents,
  };
}

export async function getGstReport(
  organisationId: string,
  range: ReportDateRange,
): Promise<CommerceGstReport> {
  const { prisma } = await import("@dg/database");

  const invoices = await prisma.commerceInvoice.findMany({
    where: {
      organisationId,
      status: { notIn: ["void", "draft"] },
      createdAt: { gte: range.from, lte: range.to },
    },
    orderBy: { createdAt: "asc" },
    select: {
      invoiceNumber: true,
      status: true,
      createdAt: true,
      subtotalCents: true,
      taxCents: true,
      totalCents: true,
    },
  });

  const refunds = await prisma.commerceRefund.aggregate({
    where: {
      organisationId,
      status: "succeeded",
      createdAt: { gte: range.from, lte: range.to },
    },
    _sum: { amountCents: true },
  });

  const gstOnSalesCents = invoices.reduce((s, i) => s + i.taxCents, 0);
  const taxableSalesExGstCents = invoices
    .filter((i) => i.taxCents > 0)
    .reduce((s, i) => s + i.subtotalCents, 0);
  const gstFreeSalesCents = invoices
    .filter((i) => i.taxCents === 0)
    .reduce((s, i) => s + i.totalCents, 0);
  const totalSalesIncGstCents = invoices.reduce((s, i) => s + i.totalCents, 0);
  /** Approximate: assume refunds are GST-inclusive at 10% if any */
  const refundTotal = refunds._sum.amountCents ?? 0;
  const gstOnRefundsCents =
    refundTotal > 0 ? Math.round((refundTotal * 1000) / 11000) : 0;

  return {
    kind: "gst",
    organisationId,
    range: { from: iso(range.from), to: iso(range.to) },
    currency: "AUD",
    scopeNote:
      "AU GST summary from issued invoices (sent/paid/etc.). Not a BAS lodgement — verify in your accounting software before filing.",
    gstOnSalesCents,
    taxableSalesExGstCents,
    gstFreeSalesCents,
    totalSalesIncGstCents,
    gstOnRefundsCents,
    netGstCents: gstOnSalesCents - gstOnRefundsCents,
    invoiceCount: invoices.length,
    lines: invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      issuedAt: i.createdAt.toISOString(),
      status: i.status,
      subtotalCents: i.subtotalCents,
      taxCents: i.taxCents,
      totalCents: i.totalCents,
    })),
  };
}

export async function getBalanceSheetReport(
  organisationId: string,
  asOf: Date = new Date(),
): Promise<CommerceBalanceSheetReport> {
  const { prisma } = await import("@dg/database");
  const end = endOfDay(asOf);

  const [arInvoices, paymentsToDate, refundsToDate] = await Promise.all([
    prisma.commerceInvoice.findMany({
      where: {
        organisationId,
        status: { in: ["sent", "viewed", "partially_paid", "overdue"] },
        createdAt: { lte: end },
      },
      select: { totalCents: true },
    }),
    prisma.commercePayment.aggregate({
      where: {
        organisationId,
        status: "succeeded",
        paidAt: { lte: end },
      },
      _sum: { amountCents: true },
    }),
    prisma.commerceRefund.aggregate({
      where: {
        organisationId,
        status: "succeeded",
        createdAt: { lte: end },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const accountsReceivableCents = arInvoices.reduce((s, i) => s + i.totalCents, 0);
  const cashCollectedCents =
    (paymentsToDate._sum.amountCents ?? 0) - (refundsToDate._sum.amountCents ?? 0);

  const assets: CommerceReportLine[] = [
    {
      label: "Cash collected (Commerce payments − refunds)",
      amountCents: cashCollectedCents,
      note: "Settled via payment connectors — not a bank balance",
    },
    {
      label: "Accounts receivable (open invoices)",
      amountCents: accountsReceivableCents,
      note: "Sent / viewed / partially paid / overdue",
    },
  ];

  const liabilities: CommerceReportLine[] = [
    {
      label: "Liabilities",
      amountCents: 0,
      note: "Not tracked in DigitalGate (no AP / loans ledger)",
    },
  ];

  const totalAssetsCents = cashCollectedCents + accountsReceivableCents;
  const equity: CommerceReportLine[] = [
    {
      label: "Retained earnings (Commerce activity)",
      amountCents: totalAssetsCents,
      note: "Balancing figure from Commerce assets only",
    },
  ];

  return {
    kind: "balance_sheet",
    organisationId,
    asOf: iso(end),
    currency: "AUD",
    scopeNote:
      "Scaffolded from invoices & payments in DigitalGate — not a double-entry balance sheet. Use for AR / cash collected visibility only.",
    assets,
    liabilities,
    equity,
    totalAssetsCents,
    totalLiabilitiesCents: 0,
    totalEquityCents: totalAssetsCents,
  };
}

export async function getCashFlowReport(
  organisationId: string,
  range: ReportDateRange,
): Promise<CommerceCashFlowReport> {
  const { prisma } = await import("@dg/database");

  const [payments, refunds] = await Promise.all([
    prisma.commercePayment.findMany({
      where: {
        organisationId,
        status: "succeeded",
        paidAt: { gte: range.from, lte: range.to },
      },
      select: { amountCents: true, paymentMethod: true },
    }),
    prisma.commerceRefund.findMany({
      where: {
        organisationId,
        status: "succeeded",
        createdAt: { gte: range.from, lte: range.to },
      },
      select: { amountCents: true },
    }),
  ]);

  const inflowCents = payments.reduce((s, p) => s + p.amountCents, 0);
  const outflowCents = refunds.reduce((s, r) => s + r.amountCents, 0);

  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    const key = p.paymentMethod || "other";
    byMethod[key] = (byMethod[key] ?? 0) + p.amountCents;
  }

  const operatingInflows: CommerceReportLine[] = [
    {
      label: "Customer payments received",
      amountCents: inflowCents,
    },
    ...Object.entries(byMethod).map(([method, amountCents]) => ({
      label: `  via ${method}`,
      amountCents,
    })),
  ];

  const operatingOutflows: CommerceReportLine[] = [
    {
      label: "Refunds paid",
      amountCents: outflowCents,
      note: outflowCents === 0 ? "No succeeded refunds in range" : undefined,
    },
  ];

  return {
    kind: "cash_flow",
    organisationId,
    range: { from: iso(range.from), to: iso(range.to) },
    currency: "AUD",
    scopeNote:
      "Operating cash from Commerce payment connectors only. Does not include bank transfers marked paid manually without a payment record, or non-Commerce bank activity.",
    operatingInflows,
    operatingOutflows,
    netCashCents: inflowCents - outflowCents,
    paymentCount: payments.length,
    refundCount: refunds.length,
  };
}
