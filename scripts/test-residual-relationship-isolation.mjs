import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  LinkedFinanceRecordNotFoundError,
  isLinkedFinanceRecordNotFoundError,
} from "../packages/platform-core/src/finance/applications.ts";
import {
  LinkedPmRecordNotFoundError,
  isLinkedPmRecordNotFoundError,
} from "../packages/platform-core/src/property-management/index.ts";
import {
  LinkedCommercialRecordNotFoundError,
  isLinkedCommercialRecordNotFoundError,
} from "../packages/platform-core/src/commercial/index.ts";
import {
  LinkedPropertyRecordNotFoundError,
  isLinkedPropertyRecordNotFoundError,
} from "../packages/platform-core/src/properties/index.ts";
import {
  LinkedCommerceRecordNotFoundError,
  isLinkedCommerceRecordNotFoundError,
} from "../packages/platform-core/src/commerce/document-engine.ts";

const finance = fs.readFileSync(
  "packages/platform-core/src/finance/applications.ts",
  "utf8",
);
const financeApi = fs.readFileSync(
  "src/app/api/v1/finance/applications/route.ts",
  "utf8",
);
const pm = fs.readFileSync(
  "packages/platform-core/src/property-management/index.ts",
  "utf8",
);
const pmLeaseApi = fs.readFileSync(
  "src/app/api/v1/property-management/leases/route.ts",
  "utf8",
);
const pmMaintenanceApi = fs.readFileSync(
  "src/app/api/v1/property-management/maintenance/route.ts",
  "utf8",
);
const commercial = fs.readFileSync(
  "packages/platform-core/src/commercial/index.ts",
  "utf8",
);
const commercialApi = fs.readFileSync("src/app/api/v1/commercial/route.ts", "utf8");
const properties = fs.readFileSync(
  "packages/platform-core/src/properties/index.ts",
  "utf8",
);
const propertyApi = fs.readFileSync("src/app/api/v1/properties/route.ts", "utf8");
const payment = fs.readFileSync(
  "packages/platform-core/src/commerce/payment-engine.ts",
  "utf8",
);
const paymentApi = fs.readFileSync(
  "src/app/api/v1/commerce/payment-requests/route.ts",
  "utf8",
);
const documentEngine = fs.readFileSync(
  "packages/platform-core/src/commerce/document-engine.ts",
  "utf8",
);

const createFinance = finance.slice(
  finance.indexOf("export async function createFinanceApplication"),
  finance.indexOf("export async function updateFinanceApplication"),
);
const updateFinance = finance.slice(
  finance.indexOf("export async function updateFinanceApplication"),
);
const createPmLease = pm.slice(
  pm.indexOf("export async function createPmLease"),
  pm.indexOf("export async function updatePmLease"),
);
const updatePmLease = pm.slice(
  pm.indexOf("export async function updatePmLease"),
  pm.indexOf("export async function listPmMaintenance"),
);
const createPmMaintenance = pm.slice(
  pm.indexOf("export async function createPmMaintenance"),
  pm.indexOf("export async function updatePmMaintenance"),
);
const updatePmMaintenance = pm.slice(
  pm.indexOf("export async function updatePmMaintenance"),
);
const createCommercialLease = commercial.slice(
  commercial.indexOf("export async function createCommercialLease"),
);
const createProperty = properties.slice(
  properties.indexOf("export async function createProperty"),
  properties.indexOf("export async function createPropertyFromLead"),
);
const createPropertyFromLead = properties.slice(
  properties.indexOf("export async function createPropertyFromLead"),
);
const createPayment = payment.slice(
  payment.indexOf("export async function createPaymentRequest"),
);

test("named isolation errors distinguish residual relationship IDs", () => {
  assert.equal(new LinkedFinanceRecordNotFoundError("contact").code, "linked_contact_not_found");
  assert.equal(isLinkedFinanceRecordNotFoundError(new LinkedFinanceRecordNotFoundError("contact")), true);

  assert.equal(new LinkedPmRecordNotFoundError("property").code, "linked_property_not_found");
  assert.equal(new LinkedPmRecordNotFoundError("owner_contact").code, "linked_owner_contact_not_found");
  assert.equal(new LinkedPmRecordNotFoundError("tenant_contact").code, "linked_tenant_contact_not_found");
  assert.equal(new LinkedPmRecordNotFoundError("contact").code, "linked_contact_not_found");
  assert.equal(isLinkedPmRecordNotFoundError(new LinkedPmRecordNotFoundError("property")), true);

  assert.equal(
    new LinkedCommercialRecordNotFoundError("commercial_property").code,
    "linked_commercial_property_not_found",
  );
  assert.equal(
    new LinkedCommercialRecordNotFoundError("landlord_contact").code,
    "linked_landlord_contact_not_found",
  );
  assert.equal(
    new LinkedCommercialRecordNotFoundError("tenant_contact").code,
    "linked_tenant_contact_not_found",
  );
  assert.equal(
    isLinkedCommercialRecordNotFoundError(new LinkedCommercialRecordNotFoundError("tenant_contact")),
    true,
  );

  assert.equal(
    new LinkedPropertyRecordNotFoundError("owner_contact").code,
    "linked_owner_contact_not_found",
  );
  assert.equal(new LinkedPropertyRecordNotFoundError("lead").code, "linked_lead_not_found");
  assert.equal(
    isLinkedPropertyRecordNotFoundError(new LinkedPropertyRecordNotFoundError("lead")),
    true,
  );

  assert.equal(new LinkedCommerceRecordNotFoundError("invoice").code, "linked_invoice_not_found");
  assert.equal(new LinkedCommerceRecordNotFoundError("quote").code, "linked_quote_not_found");
  assert.equal(new LinkedCommerceRecordNotFoundError("contact").code, "linked_contact_not_found");
  assert.equal(
    isLinkedCommerceRecordNotFoundError(new LinkedCommerceRecordNotFoundError("invoice")),
    true,
  );
  assert.equal(isLinkedFinanceRecordNotFoundError(new Error("title is required")), false);
});

test("lookups are organisation-scoped, not global ID existence", () => {
  assert.match(finance, /id: contactId, organisationId, deletedAt: null/);
  assert.match(pm, /id: propertyId, organisationId/);
  assert.match(pm, /id: contactId, organisationId, deletedAt: null/);
  assert.match(commercial, /id: commercialPropertyId, organisationId/);
  assert.match(commercial, /id: contactId, organisationId, deletedAt: null/);
  assert.match(properties, /id: ownerContactId, organisationId, deletedAt: null/);
  assert.match(properties, /id: leadId, organisationId/);
  assert.match(documentEngine, /id: invoiceId, organisationId/);
  assert.doesNotMatch(
    finance.slice(
      finance.indexOf("async function resolveFinanceRelationshipIds"),
      finance.indexOf("export async function listFinanceApplications"),
    ),
    /findUnique\(\s*\{\s*where:\s*\{\s*id:/,
  );
});

test("finance rejects foreign contactId before write and keeps omitted contact unattached", () => {
  assert.match(createFinance, /await resolveFinanceRelationshipIds\(input\.organisationId/);
  assert.match(createFinance, /contactId: input\.contactId/);
  assert.ok(
    createFinance.indexOf("resolveFinanceRelationshipIds") <
      createFinance.indexOf("prisma.financeApplication.create"),
  );
  assert.match(createFinance, /contactId: links\.contactId \?\? null/);
  assert.match(updateFinance, /await resolveFinanceRelationshipIds\(input\.organisationId/);
  assert.ok(
    updateFinance.indexOf("resolveFinanceRelationshipIds") <
      updateFinance.indexOf("prisma.financeApplication.update"),
  );
  assert.doesNotMatch(updateFinance, /connect: \{ id: input\.contactId \}/);
  assert.match(updateFinance, /connect: \{ id: links\.contactId \}/);
  assert.match(updateFinance, /disconnect: true/);
  assert.match(financeApi, /isLinkedFinanceRecordNotFoundError\(error\)/);
  assert.match(financeApi, /status: 422/);
});

test("PM lease rejects foreign property and contact IDs before write", () => {
  assert.match(createPmLease, /await resolvePmLeaseRelationshipIds\(input\.organisationId/);
  assert.match(createPmLease, /propertyId: input\.propertyId/);
  assert.match(createPmLease, /ownerContactId: input\.ownerContactId/);
  assert.match(createPmLease, /tenantContactId: input\.tenantContactId/);
  assert.ok(
    createPmLease.indexOf("resolvePmLeaseRelationshipIds") <
      createPmLease.indexOf("prisma.pmLease.create"),
  );
  assert.match(createPmLease, /propertyId: links\.propertyId \?\? null/);
  assert.match(createPmLease, /ownerContactId: links\.ownerContactId \?\? null/);
  assert.match(createPmLease, /tenantContactId: links\.tenantContactId \?\? null/);
  assert.match(updatePmLease, /await resolvePmLeaseRelationshipIds\(input\.organisationId/);
  assert.doesNotMatch(updatePmLease, /connect: \{ id: input\.propertyId \}/);
  assert.doesNotMatch(updatePmLease, /connect: \{ id: input\.ownerContactId \}/);
  assert.match(pmLeaseApi, /isLinkedPmRecordNotFoundError\(error\)/);
  assert.match(pm, /owner_contact/);
  assert.match(pm, /tenant_contact/);
});

test("PM maintenance rejects foreign propertyId and contactId before write", () => {
  assert.match(
    createPmMaintenance,
    /await resolvePmMaintenanceRelationshipIds\(input\.organisationId/,
  );
  assert.match(createPmMaintenance, /propertyId: input\.propertyId/);
  assert.match(createPmMaintenance, /contactId: input\.contactId/);
  assert.ok(
    createPmMaintenance.indexOf("resolvePmMaintenanceRelationshipIds") <
      createPmMaintenance.indexOf("prisma.pmMaintenanceRequest.create"),
  );
  assert.match(createPmMaintenance, /propertyId: links\.propertyId \?\? null/);
  assert.match(createPmMaintenance, /contactId: links\.contactId \?\? null/);
  assert.match(updatePmMaintenance, /await resolvePmMaintenanceRelationshipIds/);
  assert.doesNotMatch(updatePmMaintenance, /connect: \{ id: input\.contactId \}/);
  assert.match(updatePmMaintenance, /connect: \{ id: links\.contactId \}/);
  assert.match(pmMaintenanceApi, /isLinkedPmRecordNotFoundError\(error\)/);
});

test("commercial lease rejects foreign property and contact IDs before write", () => {
  assert.match(
    createCommercialLease,
    /await resolveCommercialLeaseRelationshipIds\(input\.organisationId/,
  );
  assert.match(createCommercialLease, /commercialPropertyId: input\.commercialPropertyId/);
  assert.match(createCommercialLease, /landlordContactId: input\.landlordContactId/);
  assert.match(createCommercialLease, /tenantContactId: input\.tenantContactId/);
  assert.ok(
    createCommercialLease.indexOf("resolveCommercialLeaseRelationshipIds") <
      createCommercialLease.indexOf("prisma.commercialLease.create"),
  );
  assert.match(
    createCommercialLease,
    /commercialPropertyId: links\.commercialPropertyId \?\? null/,
  );
  assert.match(createCommercialLease, /landlordContactId: links\.landlordContactId \?\? null/);
  assert.match(createCommercialLease, /tenantContactId: links\.tenantContactId \?\? null/);
  assert.match(commercialApi, /isLinkedCommercialRecordNotFoundError\(error\)/);
  assert.match(commercialApi, /kind === "lease"/);
});

test("property create rejects foreign ownerContactId and leadId before write", () => {
  assert.match(createProperty, /await resolvePropertyRelationshipIds\(input\.organisationId/);
  assert.match(createProperty, /ownerContactId: input\.ownerContactId/);
  assert.match(createProperty, /leadId: input\.leadId/);
  assert.ok(
    createProperty.indexOf("resolvePropertyRelationshipIds") <
      createProperty.indexOf("prisma.property.create"),
  );
  assert.match(createProperty, /ownerContactId: links\.ownerContactId \?\? null/);
  assert.match(createProperty, /leadId: links\.leadId \?\? null/);
  const propertyPost = propertyApi.slice(propertyApi.indexOf("export async function POST"));
  assert.match(propertyPost, /isLinkedPropertyRecordNotFoundError\(error\)/);
  assert.match(propertyPost, /action === "from_lead"/);
  assert.match(propertyPost, /createPropertyFromLead\(/);
  assert.match(propertyPost, /code: "lead_not_found"/);
  assert.match(
    createPropertyFromLead,
    /where: \{ id: input\.leadId, organisationId: input\.organisationId \}/,
  );
  assert.doesNotMatch(
    createPropertyFromLead.slice(0, createPropertyFromLead.indexOf("const property = await createProperty")),
    /resolvePropertyRelationshipIds/,
    "createPropertyFromLead must not grow a second isolation path",
  );
});

test("payment request reuses commerce relationship helpers before write", () => {
  assert.match(createPayment, /await resolveCommerceRelationshipIds\(input\.organisationId/);
  assert.match(createPayment, /contactId: input\.contactId/);
  assert.match(createPayment, /quoteId: input\.quoteId/);
  assert.match(createPayment, /invoiceId: input\.invoiceId/);
  assert.ok(
    createPayment.indexOf("resolveCommerceRelationshipIds") <
      createPayment.indexOf("prisma.commercePaymentRequest.create"),
  );
  assert.match(createPayment, /contactId: links\.contactId \?\? null/);
  assert.match(createPayment, /quoteId: links\.quoteId \?\? null/);
  assert.match(createPayment, /invoiceId: links\.invoiceId \?\? null/);
  assert.match(documentEngine, /if \(invoiceId\) \{\s*await assertCommerceInvoiceInOrganisation/);
  assert.match(paymentApi, /isLinkedCommerceRecordNotFoundError\(err\)/);
  assert.match(paymentApi, /status: 422/);
  assert.ok(
    paymentApi.indexOf("isLinkedCommerceRecordNotFoundError") <
      paymentApi.indexOf('code: "payment_error"'),
  );
});

test("omitted and null optional relationships stay optional", () => {
  assert.match(finance, /function normalizeOptionalRelationId/);
  assert.match(pm, /function normalizeOptionalRelationId/);
  assert.match(commercial, /function normalizeOptionalRelationId/);
  assert.match(properties, /function normalizeOptionalRelationId/);
  assert.match(createFinance, /contactId: links\.contactId \?\? null/);
  assert.match(createPmLease, /propertyId: links\.propertyId \?\? null/);
  assert.match(createPmMaintenance, /contactId: links\.contactId \?\? null/);
  assert.match(createCommercialLease, /tenantContactId: links\.tenantContactId \?\? null/);
  assert.match(createProperty, /leadId: links\.leadId \?\? null/);
  assert.match(createPayment, /invoiceId: links\.invoiceId \?\? null/);
});
