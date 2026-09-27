import assert from "node:assert/strict";
import fs from "node:fs";

const contact = fs.readFileSync("packages/platform-core/src/marketing/contact-enquiry-emails.ts", "utf8");
const stay = fs.readFileSync("packages/platform-core/src/accommodation/public-stay.ts", "utf8");

assert.match(contact, /Generic lead types are shared across tenant websites/);
assert.match(contact, /siteSlug === "digitalgate"/);
assert.doesNotMatch(contact, /leadType === "enquiry"\s*\|\|[\s\S]{0,120}return true;/);

assert.match(stay, /host booking notify failed/);
assert.match(stay, /Booking reference:/);
assert.match(stay, /sendStayEnquiryHostNotification\(\{/);

console.log("CVH booking email routing contract OK.");
