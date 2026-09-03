import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/accommodation/route.ts", "utf8");
const migration = fs.readFileSync("src/lib/wordpress-migration.ts", "utf8");

test("native accommodation reads cannot select WordPress as a runtime source", () => {
  assert.doesNotMatch(route, /source\s*===\s*["']wp["']/);
  assert.doesNotMatch(route, /fetchWpAccommodation(?:Availability|Bookings|Housekeeping|Summary|Units)/);
});

test("native accommodation writes do not mirror or fall back to WordPress", () => {
  assert.doesNotMatch(route, /createWpAccommodationBookings/);
  assert.doesNotMatch(route, /patchWpAccommodation(?:Bookings|Guests|Housekeeping|Units)/);
  assert.doesNotMatch(route, /deleteWpAccommodationBookings/);
  assert.doesNotMatch(route, /syncWpAccommodationOtaCalendars/);
  assert.doesNotMatch(route, /writePath:\s*["'](?:wordpress|wp_then_neon|neon_then_wp)["']/);
});

test("WordPress import is explicit migration-only, never an implicit native fallback", () => {
  assert.match(route, /action\s*===\s*["']migrate_wordpress["']/);
  assert.doesNotMatch(route, /action\s*===\s*["']sync_wordpress["']/);
  assert.doesNotMatch(route, /action\s*===\s*["']sync_units["']/);
  assert.match(migration, /mode:\s*["']migration_only["']/);
});

test("native booking and OTA writes are explicitly Neon paths", () => {
  assert.match(route, /writePath:\s*["']neon["']/);
  assert.match(route, /writePath:\s*["']gen2_ical["']/);
  assert.match(route, /createStayBookingGen2First/);
  assert.match(route, /syncOtaCalendarsFromUnits/);
});
