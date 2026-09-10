import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const social = fs.readFileSync("src/app/api/v1/social/drafts/route.ts", "utf8");
const marketing = fs.readFileSync("src/app/api/v1/marketing/campaigns/route.ts", "utf8");
const requests = fs.readFileSync("src/app/api/v1/reviews/requests/route.ts", "utf8");
const replies = fs.readFileSync("src/app/api/v1/reviews/reply-draft/route.ts", "utf8");

const growthOrganisationCreate = /requirePermission\(session,\s*\{[\s\S]*?module:\s*"growth"[\s\S]*?action:\s*"create"[\s\S]*?scope:\s*"organisation"[\s\S]*?\}\)/;

function postHandler(source) {
  const start = source.indexOf("export async function POST");
  assert.ok(start >= 0, "POST handler must exist");
  return source.slice(start);
}

for (const [name, source, mutation] of [
  ["social drafts", social, "createActivity"],
  ["marketing campaigns", marketing, "createActivity"],
  ["review requests", requests, "queueReviewRequest"],
]) {
  test(`${name} require organisation-scope Growth create before mutation`, () => {
    const post = postHandler(source);
    const gate = post.search(growthOrganisationCreate);
    const write = post.indexOf(mutation);
    assert.ok(gate >= 0, `${name} must require Growth organisation create`);
    assert.ok(write > gate, `${name} mutation must occur after authority gate`);
  });
}

test("review reply generation can remain non-persistent without Growth write authority", () => {
  const post = postHandler(replies);
  const generation = post.indexOf("draftReviewReply");
  const persist = post.indexOf("if (persist)");
  const gate = post.indexOf("requirePermission(session", persist);
  const write = post.indexOf("createActivity", persist);
  assert.ok(generation >= 0 && persist > generation, "draft generation must precede persistence branch");
  assert.ok(gate > persist, "Growth authority must be required inside persistence branch");
  assert.ok(write > gate, "persisted activity must occur after Growth authority gate");
});

test("all Growth mutation routes use the canonical permission helper", () => {
  for (const source of [social, marketing, requests, replies]) {
    assert.match(source, /requirePermission/);
    assert.doesNotMatch(source, /session\.role\s*[!=]==?\s*"owner"/);
  }
});
