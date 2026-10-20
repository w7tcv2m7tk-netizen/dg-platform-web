/** Execute the real route exports with isolated auth/business dependencies. */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { CheckoutTemporarilyUnavailable } from "../packages/platform-core/src/billing/checkout-creation-gate.ts";

export function checkoutPost(kind, create) {
  const modules = {
    "@dg/platform-core/billing/checkout-creation-gate": { CheckoutTemporarilyUnavailable },
    "@dg/platform-core/billing/platform-checkout": {
      createPlatformCheckoutSession: create, createCustomCommercialCheckoutSession: create,
    },
    "@dg/platform-core": {
      INDUSTRY_TAXONOMY: [],
      getGen2OnboardingProgress: async () => ({}),
      getOrganisationCommercialOffer: async () => kind === "custom" ? { platformTier: "professional" } : null,
      getOrganisationBillingStatus: async () => null,
      saveGen2OnboardingProgress: async () => ({}),
    },
    "@/lib/platform-api": {
      requirePlatformAuth: async () => ({ organisationId: "fixture", email: "fixture@example.test" }),
      isNextResponse: value => value instanceof Response,
      rejectDemoLiveAction: async () => null, requirePermission: () => null,
    },
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
  };
  const file = `src/app/api/v1/${kind === "billing" ? "billing/checkout" : "onboarding/gen2"}/route.ts`;
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => {
      if (!(name in modules)) throw new Error(`Unexpected route dependency: ${name}`);
      return modules[name];
    },
    Response, console, process,
  }, { filename: file });
  return () => exports.POST(new Request(`https://fixture.example.test/api/${kind}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  }));
}
