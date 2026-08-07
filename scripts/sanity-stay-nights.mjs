/**
 * Sanity: stay nights are check-in inclusive, check-out exclusive.
 * Run: node scripts/sanity-stay-nights.mjs
 */

function daysBetween(from, to) {
  const out = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function stayNights(checkin, checkout) {
  if (!checkin || !checkout || checkout <= checkin) return [];
  return daysBetween(checkin, addDays(checkout, -1));
}

function occupies(checkin, checkout, day) {
  return Boolean(checkin && checkout && day >= checkin && day < checkout);
}

const cases = [
  {
    name: "3-night stay",
    checkin: "2026-08-01",
    checkout: "2026-08-04",
    expect: ["2026-08-01", "2026-08-02", "2026-08-03"],
    free: "2026-08-04",
  },
  {
    name: "single night",
    checkin: "2026-08-10",
    checkout: "2026-08-11",
    expect: ["2026-08-10"],
    free: "2026-08-11",
  },
  {
    name: "month boundary",
    checkin: "2026-07-30",
    checkout: "2026-08-02",
    expect: ["2026-07-30", "2026-07-31", "2026-08-01"],
    free: "2026-08-02",
  },
];

let failed = 0;
for (const c of cases) {
  const nights = stayNights(c.checkin, c.checkout);
  const ok =
    JSON.stringify(nights) === JSON.stringify(c.expect) &&
    !occupies(c.checkin, c.checkout, c.free) &&
    c.expect.every((d) => occupies(c.checkin, c.checkout, d));
  if (!ok) {
    failed += 1;
    console.error("FAIL", c.name, { nights, expect: c.expect });
  } else {
    console.log("ok", c.name, nights.join(", "));
  }
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nAll stay-night semantics OK (check-in inclusive, check-out exclusive).");
