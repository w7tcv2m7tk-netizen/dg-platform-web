import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../src/lib/public-website-form-fields.ts"),
    ).href
  );
}

describe("mapWebsiteFormFields", () => {
  it("maps nameless-style ids and leftover extras into a Gen 2 payload", async () => {
    const { mapWebsiteFormFields } = await load();
    const mapped = mapWebsiteFormFields({
      name: "Alex Roe",
      email: "alex@example.com",
      phone: "0400000000",
      subject: "Stay enquiry",
      message: "Can we bring the dog?",
      industry: "Accommodation",
    });
    assert.equal(mapped.name, "Alex Roe");
    assert.equal(mapped.email, "alex@example.com");
    assert.equal(mapped.phone, "0400000000");
    assert.match(mapped.message || "", /Stay enquiry/);
    assert.match(mapped.message || "", /Can we bring the dog/);
    assert.match(mapped.message || "", /industry: Accommodation/i);
  });

  it("falls back to a name when the form only has contact details", async () => {
    const { mapWebsiteFormFields } = await load();
    const mapped = mapWebsiteFormFields({
      email: "guest@example.com",
    });
    assert.equal(mapped.name, "Website enquiry");
    assert.equal(mapped.email, "guest@example.com");
  });
});
