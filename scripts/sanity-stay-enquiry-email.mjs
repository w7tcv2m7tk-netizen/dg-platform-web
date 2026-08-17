/**
 * Sanity: CVH stay enquiry host email includes dates and excludes the guest.
 * Run: node scripts/sanity-stay-enquiry-email.mjs
 */

function formatStayDate(ymd) {
  const raw = (ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return new Date(`${raw}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stayEnquiryNights(checkin, checkout) {
  if (!checkin || !checkout || checkout <= checkin) return 0;
  const start = new Date(`${checkin}T12:00:00`);
  const end = new Date(`${checkout}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function stayEnquiryDateLine(checkin, checkout) {
  const from = formatStayDate(checkin);
  const to = formatStayDate(checkout);
  if (from && to) {
    const nights = stayEnquiryNights(checkin, checkout);
    const nightLabel = nights > 0 ? ` (${nights} night${nights === 1 ? "" : "s"})` : "";
    return `${from} → ${to}${nightLabel}`;
  }
  return "Not specified";
}

function resolveStayEnquiryHostEmails({ guestEmail, profileEmails = [], extra = [] }) {
  const guest = (guestEmail || "").trim().toLowerCase();
  const stay = "stay@currumbinvalleyhideaway.com.au";
  const seen = new Set();
  const out = [];
  for (const value of [stay, ...profileEmails, ...extra]) {
    const email = (value || "").trim().toLowerCase();
    if (!email || !email.includes("@") || email === guest || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

const dates = stayEnquiryDateLine("2026-10-14", "2026-10-15");
const hosts = resolveStayEnquiryHostEmails({
  guestEmail: "guest@example.com",
  profileEmails: ["ben@currumbinvalleyhideaway.com.au", "guest@example.com"],
});

let failed = 0;
function check(name, ok, detail) {
  if (!ok) {
    failed += 1;
    console.error("FAIL", name, detail);
  } else {
    console.log("ok", name);
  }
}

check("dates include both nights", dates.includes("14") && dates.includes("15") && dates.includes("1 night"), dates);
check("subject-ready date line", dates !== "Not specified", dates);
check("stay inbox included", hosts.includes("stay@currumbinvalleyhideaway.com.au"), hosts);
check("host business email included", hosts.includes("ben@currumbinvalleyhideaway.com.au"), hosts);
check("guest excluded from host list", !hosts.includes("guest@example.com"), hosts);

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nStay enquiry host email contract OK.");
