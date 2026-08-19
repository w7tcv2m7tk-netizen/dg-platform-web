import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/accommodation/guest-identity.ts",
      ),
    ).href
  );
}

describe("shouldCreateGuestContactFromStay", () => {
  it("blocks Airbnb / Booking.com iCal placeholders without email or phone", async () => {
    const { shouldCreateGuestContactFromStay } = await load();
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Reserved",
        status: "airbnb",
        source: "airbnb",
        ref: "ota:airbnb:abc",
      }),
      false,
    );
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Booking.com block",
        status: "bookingcom",
        source: "bookingcom",
      }),
      false,
    );
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Airbnb guest",
        source: "ical",
      }),
      false,
    );
  });

  it("allows a real guest when email or phone is present", async () => {
    const { shouldCreateGuestContactFromStay } = await load();
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Reserved",
        source: "airbnb",
        email: "guest@example.com",
      }),
      true,
    );
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Sam Guest",
        phone: "0400000000",
      }),
      true,
    );
  });

  it("still allows a staff-entered direct stay with a real name", async () => {
    const { shouldCreateGuestContactFromStay } = await load();
    assert.equal(
      shouldCreateGuestContactFromStay({
        guestName: "Sam Guest",
        source: "gen2",
        status: "confirmed",
      }),
      true,
    );
  });
});
