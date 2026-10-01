import assert from "node:assert/strict";
import { buildDiscoveryTextQuery } from "../packages/platform-core/src/business-discovery/industry-packs.ts";

assert.equal(
  buildDiscoveryTextQuery({
    industry: "Real Estate",
    businessType: "Agency",
    location: "Currumbin, QLD",
  }),
  "Real Estate Agency in Currumbin, QLD",
  "generic Agency must qualify Real Estate rather than replace it",
);

assert.equal(
  buildDiscoveryTextQuery({
    industry: "Finance",
    businessType: "Mortgage Broker",
    location: "Brisbane, QLD",
  }),
  "Mortgage Broker in Brisbane, QLD",
  "specific business types remain authoritative",
);

assert.equal(
  buildDiscoveryTextQuery({
    industry: "Real Estate",
    businessType: "Agency",
    location: "Currumbin, QLD",
    q: "LJ Hooker",
  }),
  "LJ Hooker in Currumbin, QLD",
  "explicit name/keyword searches remain authoritative",
);

console.log("Business discovery relevance regression checks passed");
