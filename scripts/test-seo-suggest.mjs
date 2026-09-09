/**
 * parseSeoSuggestion — robustly extracts SEO JSON from an LLM response
 * (plain JSON, fenced code block, or JSON embedded in prose), and rejects junk.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const { parseSeoSuggestion } = await import(
  pathToFileURL(
    path.join(root, "packages/platform-core/src/websites/seo-suggest.ts"),
  ).href
);

describe("parseSeoSuggestion", () => {
  it("parses plain JSON with all fields", () => {
    const out = parseSeoSuggestion(
      JSON.stringify({
        title: "Smart Business Platform",
        description: "Run, understand and grow your business.",
        ogTitle: "DigitalGate",
        ogDescription: "One platform.",
        keywords: ["ai", "business platform", "automation"],
      }),
    );
    assert.equal(out.title, "Smart Business Platform");
    assert.equal(out.description, "Run, understand and grow your business.");
    assert.equal(out.ogTitle, "DigitalGate");
    assert.deepEqual(out.keywords, ["ai", "business platform", "automation"]);
  });

  it("parses JSON inside a ```json fenced block", () => {
    const out = parseSeoSuggestion(
      "Here you go:\n```json\n{\"title\":\"Hello\",\"keywords\":[\"a\",\"b\"]}\n```\nHope that helps!",
    );
    assert.equal(out.title, "Hello");
    assert.deepEqual(out.keywords, ["a", "b"]);
  });

  it("parses JSON embedded in prose", () => {
    const out = parseSeoSuggestion(
      'Sure — {"title": "T", "description": "D"} is my suggestion.',
    );
    assert.equal(out.title, "T");
    assert.equal(out.description, "D");
  });

  it("accepts keywords as a comma-separated string and og_ snake_case", () => {
    const out = parseSeoSuggestion(
      JSON.stringify({ og_title: "OG", keywords: "one, two , three" }),
    );
    assert.equal(out.ogTitle, "OG");
    assert.deepEqual(out.keywords, ["one", "two", "three"]);
  });

  it("returns null for junk / empty / no usable fields", () => {
    assert.equal(parseSeoSuggestion(""), null);
    assert.equal(parseSeoSuggestion("no json here"), null);
    assert.equal(parseSeoSuggestion("{not valid json}"), null);
    assert.equal(parseSeoSuggestion(JSON.stringify({ foo: "bar" })), null);
  });

  it("trims blank strings to undefined (won't overwrite with empties)", () => {
    const out = parseSeoSuggestion(
      JSON.stringify({ title: "   ", description: "Real" }),
    );
    assert.equal(out.title, undefined);
    assert.equal(out.description, "Real");
  });
});
