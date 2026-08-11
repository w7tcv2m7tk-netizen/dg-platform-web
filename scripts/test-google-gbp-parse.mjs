/**
 * Smoke parsers for Google Business Profile connector helpers.
 * Run: node --experimental-strip-types --test scripts/test-google-gbp-parse.mjs
 *
 * (Mirrors other connector smoke scripts — no live Google calls.)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Import via relative path into package source (strip-types).
import {
  mapGbpStarRating,
  parseGbpAccounts,
  parseGbpLocation,
  parseGbpReviews,
  toGbpReviewsParent,
} from "../packages/platform-core/src/connectors/google/gbp-parse.ts";

describe("GBP parsers", () => {
  it("parses accounts", () => {
    const accounts = parseGbpAccounts({
      accounts: [
        { name: "accounts/123", accountName: "Acme", type: "PERSONAL", role: "OWNER" },
      ],
    });
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].name, "accounts/123");
    assert.equal(accounts[0].accountName, "Acme");
  });

  it("parses location profile fields", () => {
    const loc = parseGbpLocation({
      name: "locations/456",
      title: "Acme Cafe",
      websiteUri: "https://example.com",
      phoneNumbers: { primaryPhone: "+61 2 0000 0000" },
      storefrontAddress: {
        addressLines: ["1 Main St"],
        locality: "Sydney",
        administrativeArea: "NSW",
        postalCode: "2000",
        regionCode: "AU",
      },
      categories: { primaryCategory: { displayName: "Cafe" } },
      metadata: {
        placeId: "ChIJtest",
        mapsUri: "https://maps.google.com/?cid=1",
      },
      latlng: { latitude: -33.86, longitude: 151.2 },
      openInfo: { status: "OPEN" },
      profile: { description: "Great coffee" },
    });
    assert.ok(loc);
    assert.equal(loc.title, "Acme Cafe");
    assert.equal(loc.locality, "Sydney");
    assert.equal(loc.primaryCategory, "Cafe");
    assert.equal(loc.placeId, "ChIJtest");
    assert.equal(loc.description, "Great coffee");
  });

  it("normalises reviews parent path", () => {
    assert.equal(
      toGbpReviewsParent("accounts/123", "locations/456"),
      "accounts/123/locations/456",
    );
    assert.equal(
      toGbpReviewsParent("accounts/123", "accounts/123/locations/456"),
      "accounts/123/locations/456",
    );
  });

  it("maps star ratings and reviews", () => {
    assert.equal(mapGbpStarRating("FIVE"), 5);
    assert.equal(mapGbpStarRating("TWO"), 2);
    const reviews = parseGbpReviews(
      {
        reviews: [
          {
            name: "accounts/123/locations/456/reviews/abc",
            starRating: "FOUR",
            comment: "Nice place",
            reviewer: { displayName: "Sam" },
            createTime: "2026-01-01T00:00:00Z",
            reviewReply: { comment: "Thanks!" },
          },
        ],
      },
      "accounts/123/locations/456",
    );
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].starRating, 4);
    assert.equal(reviews[0].reviewerDisplayName, "Sam");
    assert.equal(reviews[0].reviewReplyComment, "Thanks!");
  });
});
