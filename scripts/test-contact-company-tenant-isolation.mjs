import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  LINKED_COMPANY_NOT_FOUND,
  LinkedCompanyNotFoundError,
  isLinkedCompanyNotFoundError,
} from "../packages/platform-core/src/contacts/index.ts";

const contacts = fs.readFileSync("packages/platform-core/src/contacts/index.ts", "utf8");
const createApi = fs.readFileSync("src/app/api/v1/contacts/route.ts", "utf8");
const updateApi = fs.readFileSync("src/app/api/v1/contacts/[id]/route.ts", "utf8");

test("foreign company IDs are a named isolation error, not a silent attach", () => {
  assert.equal(LINKED_COMPANY_NOT_FOUND, "linked_company_not_found");
  const error = new LinkedCompanyNotFoundError();
  assert.equal(error.code, LINKED_COMPANY_NOT_FOUND);
  assert.equal(isLinkedCompanyNotFoundError(error), true);
  assert.equal(isLinkedCompanyNotFoundError(new Error("nope")), false);
});

test("createContact and updateContact resolve company by id + organisationId before write", () => {
  const assertAt = contacts.indexOf("export async function assertCompanyInOrganisation");
  const createAt = contacts.indexOf("export async function createContact");
  const updateAt = contacts.indexOf("export async function updateContact");
  assert.ok(assertAt >= 0);
  assert.ok(createAt > assertAt);
  assert.ok(updateAt > createAt);

  const helper = contacts.slice(
    assertAt,
    contacts.indexOf("function serializeContact"),
  );
  assert.match(helper, /id: companyId, organisationId, deletedAt: null/);
  assert.match(helper, /throw new LinkedCompanyNotFoundError/);

  const createFn = contacts.slice(createAt, updateAt);
  assert.match(createFn, /await assertCompanyInOrganisation\(input\.organisationId, companyId\)/);
  assert.ok(
    createFn.indexOf("assertCompanyInOrganisation") < createFn.indexOf("prisma.contact.create"),
    "createContact must verify the company before inserting the contact",
  );

  const updateFn = contacts.slice(updateAt);
  assert.match(updateFn, /await assertCompanyInOrganisation\(input\.organisationId, nextCompanyId\)/);
  assert.ok(
    updateFn.indexOf("assertCompanyInOrganisation") <
      updateFn.indexOf("{ connect: { id: nextCompanyId } }"),
    "updateContact must verify the company before Prisma connect",
  );
  assert.doesNotMatch(
    updateFn,
    /connect: \{ id: input\.companyId \}/,
    "updateContact must not connect a raw client-supplied company id",
  );
});

test("contact APIs map a foreign company id to 422 instead of writing it", () => {
  const post = createApi.slice(createApi.indexOf("export async function POST"));
  assert.match(post, /isLinkedCompanyNotFoundError\(error\)/);
  assert.match(post, /status: 422/);
  assert.ok(post.indexOf("createContact(") < post.indexOf("isLinkedCompanyNotFoundError"));

  const patch = updateApi.slice(updateApi.indexOf("export async function PATCH"));
  assert.match(patch, /isLinkedCompanyNotFoundError\(error\)/);
  assert.match(patch, /status: 422/);
  assert.ok(patch.indexOf("updateContact(") < patch.indexOf("isLinkedCompanyNotFoundError"));
});
