import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../src/app/(shell)/apps/reviews/requests/page.tsx", import.meta.url),
  "utf8",
);
const queueButton = readFileSync(
  new URL("../src/components/reviews/QueueReviewRequestButton.tsx", import.meta.url),
  "utf8",
);
const feed = readFileSync(
  new URL("../src/components/reviews/ReviewFeedList.tsx", import.meta.url),
  "utf8",
);

test("the advertised review requests route has a real customer journey", () => {
  assert.match(page, /listReviewRequestCandidates/);
  assert.match(page, /QueueReviewRequestButton/);
  assert.match(page, /module: "growth"[\s\S]*action: "create"/);
});

test("review follow-up wording does not imply automatic delivery", () => {
  assert.match(page, /does not send an email[\s\S]*or SMS automatically/);
  assert.match(queueButton, /Create follow-up/);
  assert.match(queueButton, /Follow-up added to the timeline/);
});

test("review feed no longer directs customers to a legacy WordPress path", () => {
  assert.doesNotMatch(feed, /WordPress/i);
});
