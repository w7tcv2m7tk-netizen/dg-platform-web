import assert from "node:assert/strict";
import fs from "node:fs";

const contact = fs.readFileSync("packages/platform-core/src/marketing/contact-enquiry-emails.ts", "utf8");
const stay = fs.readFileSync("packages/platform-core/src/accommodation/public-stay.ts", "utf8");
const stayEmails = fs.readFileSync("packages/platform-core/src/accommodation/stay-enquiry-emails.ts", "utf8");
const automation = fs.readFileSync("packages/platform-core/src/automation/defaults.ts", "utf8");
const bookings = fs.readFileSync("src/components/accommodation/AccommodationBookingsTable.tsx", "utf8");

assert.match(contact, /Generic lead types are shared across tenant websites/);
assert.match(contact, /const isDigitalGateOrg/);
assert.match(contact, /if \(!isDigitalGateOrg\) return false/);
assert.match(stay, /host booking notify failed/);
assert.match(stay, /Booking reference:/);
assert.match(stay, /sendStayEnquiryHostNotification\(\{/);
assert.match(stayEmails, /We've received your booking request — Currumbin Valley Hideaway/);
assert.match(stayEmails, /PayID, your booking remains pending until payment is received and confirmed/);
assert.match(automation, /orgBrandKey === "cvh"/);
assert.match(automation, /renderCvhBookingRequestAck/);
assert.match(bookings, /function shortBookingRef/);
assert.match(bookings, /title=\{fullBookingRef\(b\)\}/);
assert.match(bookings, /w-\[22%\].*Guest/);
assert.match(bookings, /min-w-\[920px\]/);

console.log("CVH booking email routing and booking table contract OK.");
