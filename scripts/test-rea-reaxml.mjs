/**
 * Unit tests for REA REAXML builder (residential validation + mapping).
 * Run: node --experimental-strip-types --test scripts/test-rea-reaxml.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReaListingXml,
  formatReaModTime,
  normaliseReaState,
  splitReaStreetAddress,
  stripHtmlForReaxml,
} from "../packages/platform-core/src/connectors/rea/reaxml.ts";

const baseProperty = {
  id: "prop_abc123",
  addressLine1: "Unit 2/55 Pyrmont Street",
  suburb: "Pyrmont",
  state: "NSW",
  postcode: "2009",
  country: "AU",
  propertyType: "apartment",
  bedrooms: 2,
  bathrooms: 1,
  listingPriceCents: 125_000_000,
  status: "listed",
  metadata: {
    images: ["https://cdn.example.com/main.jpg", "https://cdn.example.com/living.png"],
    marketing: {
      headline: "Harbour views & light-filled living",
      description: "A lovely home with <b>pool</b> and balcony. Air conditioning.",
      features: "Pool, Balcony, Dishwasher, Study",
    },
    car_spaces: 2,
    lock_up_garages: 1,
    land_size: "180 sqm",
    inspection_times: "Sat 11:00am to 11:30am\nSun 1:00pm to 1:30pm",
  },
};

const contact = {
  name: "Alex Agent",
  email: "alex@roe.example",
  telephone: "0412 345 678",
};

describe("REA address helpers", () => {
  it("splits unit/street number", () => {
    const parts = splitReaStreetAddress("Unit 2/55 Pyrmont Street");
    assert.equal(parts.subNumber, "2");
    assert.equal(parts.streetNumber, "55");
    assert.equal(parts.street, "Pyrmont Street");
  });

  it("normalises AU states", () => {
    assert.equal(normaliseReaState("QLD"), "qld");
    assert.equal(normaliseReaState("Victoria"), "vic");
    assert.equal(normaliseReaState("zz"), null);
  });

  it("strips HTML from description text", () => {
    assert.equal(stripHtmlForReaxml("Hello <b>world</b> & friends"), "Hello world & friends");
  });

  it("formats modTime", () => {
    const t = formatReaModTime(new Date("2026-08-13T10:05:09+10:00"));
    assert.match(t, /^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}$/);
  });
});

describe("buildReaListingXml residential", () => {
  it("emits validated residential XML with required elements", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: baseProperty,
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const { xml } = result;
    assert.match(xml, /<residential[^>]*status="current"/);
    assert.match(xml, /<agentID>ABCDEF<\/agentID>/);
    assert.match(xml, /<uniqueID>dg-prop_abc123<\/uniqueID>/);
    assert.match(xml, /<authority value="sale"\/>/);
    assert.match(xml, /<underOffer value="no"\/>/);
    assert.match(xml, /<subNumber>2<\/subNumber>/);
    assert.match(xml, /<streetNumber>55<\/streetNumber>/);
    assert.match(xml, /<street>Pyrmont Street<\/street>/);
    assert.match(xml, /<suburb display="yes">PYRMONT<\/suburb>/);
    assert.match(xml, /<state>nsw<\/state>/);
    assert.match(xml, /<postcode>2009<\/postcode>/);
    assert.match(xml, /<country>AUS<\/country>/);
    assert.match(xml, /<category name="Apartment"\/>/);
    assert.match(xml, /<headline>Harbour views &amp; light-filled living<\/headline>/);
    assert.doesNotMatch(xml, /<b>/);
    assert.match(xml, /<bedrooms>2<\/bedrooms>/);
    assert.match(xml, /<bathrooms>1<\/bathrooms>/);
    assert.match(xml, /<garages>1<\/garages>/);
    assert.match(xml, /<openSpaces>1<\/openSpaces>/);
    assert.match(xml, /<poolInGround>true<\/poolInGround>/);
    assert.match(xml, /<balcony>true<\/balcony>/);
    assert.match(xml, /<price display="yes">1250000<\/price>/);
    assert.match(xml, /<img id="m"/);
    assert.match(xml, /<img id="a"/);
    assert.match(xml, /<inspection>Sat 11:00am to 11:30am<\/inspection>/);
    assert.match(xml, /<landDetails>[\s\S]*unit="squareMeter">180</);
    assert.match(xml, /<listingAgent id="1">[\s\S]*<name>Alex Agent<\/name>/);
  });

  it("hides price and sets Contact Agent priceView", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: {
        ...baseProperty,
        metadata: { ...baseProperty.metadata, display_as_contact_agent: true },
      },
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.xml, /<price display="no">1250000<\/price>/);
    assert.match(result.xml, /<priceView>Contact Agent<\/priceView>/);
  });

  it("sets underOffer when Gen 2 status is under_offer", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: { ...baseProperty, status: "under_offer" },
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.xml, /<underOffer value="yes"\/>/);
  });

  it("emits auction authority + date", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: {
        ...baseProperty,
        metadata: {
          ...baseProperty.metadata,
          authority: "auction",
          auction_date: "2026-09-01T11:00:00",
        },
      },
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.xml, /<authority value="auction"\/>/);
    assert.match(result.xml, /<auction date="2026-09-01T11:00:00"\/>/);
  });

  it("emits VIC statementOfInformation from disclosure PDF", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: {
        ...baseProperty,
        state: "VIC",
        suburb: "Richmond",
        postcode: "3121",
        addressLine1: "39 Main Road",
        metadata: {
          ...baseProperty.metadata,
          disclosureStatement: {
            url: "https://cdn.example.com/soi.pdf",
            contentType: "application/pdf",
            fileName: "soi.pdf",
            sizeBytes: 12,
            storage: "blob",
            uploadedAt: "2026-08-01T00:00:00.000Z",
          },
        },
      },
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(
      result.xml,
      /<attachment usage="statementOfInformation"[^>]*url="https:\/\/cdn\.example\.com\/soi\.pdf"/,
    );
  });

  it("emits soldDetails for sold status", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-prop_abc123",
      property: {
        ...baseProperty,
        status: "sold",
        metadata: {
          sold_price_cents: 130_000_000,
          sold_date: "2026-08-10-12:00:00",
        },
      },
      contact,
      status: "sold",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.xml, /status="sold"/);
    assert.match(result.xml, /<soldPrice display="yes">1300000<\/soldPrice>/);
    assert.match(result.xml, /<soldDate>2026-08-10-12:00:00<\/soldDate>/);
  });

  it("fails closed when mandatory fields missing", () => {
    const result = buildReaListingXml({
      reaAgencyId: "AB", // invalid
      uniqueId: "dg-1",
      property: {
        id: "x",
        addressLine1: "NoNumber Street",
        suburb: "",
        state: "NSW",
        postcode: "20",
        bedrooms: null,
        bathrooms: null,
        listingPriceCents: null,
        metadata: {},
      },
      contact: { name: "" },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.some((e) => /agentID/i.test(e)));
    assert.ok(result.errors.some((e) => /streetNumber/i.test(e)));
    assert.ok(result.errors.some((e) => /suburb/i.test(e)));
    assert.ok(result.errors.some((e) => /postcode/i.test(e)));
    assert.ok(result.errors.some((e) => /bedrooms/i.test(e)));
    assert.ok(result.errors.some((e) => /bathrooms/i.test(e)));
    assert.ok(result.errors.some((e) => /price/i.test(e)));
    assert.ok(result.errors.some((e) => /image/i.test(e)));
    assert.ok(result.errors.some((e) => /listingAgent\/name/i.test(e)));
  });

  it("fails closed for land/commercial roots", () => {
    const land = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-1",
      property: { ...baseProperty, propertyType: "land" },
      contact,
    });
    assert.equal(land.ok, false);
    if (!land.ok) {
      assert.match(land.errors[0] ?? "", /not mapped/i);
    }
  });
});

describe("buildReaListingXml rental", () => {
  it("emits rental when listing_type=rent", () => {
    const result = buildReaListingXml({
      reaAgencyId: "ABCDEF",
      uniqueId: "dg-rent-1",
      property: {
        ...baseProperty,
        listingPriceCents: 65_000,
        metadata: {
          ...baseProperty.metadata,
          listing_type: "rent",
          rent_cents: 65_000,
          date_available: "2026-09-01-12:00:00",
          pet_friendly: true,
        },
      },
      contact,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.listingType, "rental");
    assert.match(result.xml, /<rental[^>]*status="current"/);
    assert.match(result.xml, /<rent period="week">650<\/rent>/);
    assert.match(result.xml, /<dateAvailable>2026-09-01-12:00:00<\/dateAvailable>/);
    assert.match(result.xml, /<petFriendly>true<\/petFriendly>/);
  });
});
