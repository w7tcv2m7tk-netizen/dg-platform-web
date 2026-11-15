/** Execute the real checkout builder with synthetic authority; no provider/DB client is loaded. */
import vm from 'node:vm';
import ts from 'typescript';
import * as catalogue from '../packages/platform-core/src/billing/commercial-catalogue.ts';
import * as billing from '../packages/platform-core/src/billing/subscription-types.ts';
import * as industry from '../packages/platform-core/src/industry/platform.ts';
import * as apps from '../packages/platform-core/src/billing/paid-apps.ts';

export async function checkoutBehaviourFindings(source) {
  const findings = [];
  async function scenario(plan, change = {}, reject = false, selection = {}) {
    const calls = [];
    const creations = [];
    const retrieved = [];
    const price = { id: `fixture_${plan.id}`, active: true, unit_amount: plan.monthlyCents,
      currency: 'aud', recurring: { interval: 'month', interval_count: 1 }, ...change };
    class Stripe {
      prices = { retrieve: async id => { retrieved.push(id); return price; } };
      checkout = { sessions: { create: async parameters => {
        creations.push(parameters);
        return { id: 'cs_test_synthetic', ...parameters };
      } } };
    }
    const modules = {
      'server-only': {}, stripe: { default: Stripe },
      './commercial-catalogue': catalogue, './subscription-types': billing,
      '../industry/platform': industry, './paid-apps': apps,
      './commercial-offer': { parseCustomCommercialOffer: () => { throw new Error('Unexpected custom checkout'); } },
      './checkout-coordinator': { coordinatePlatformCheckout: async input => {
        calls.push(input.parameters);
        // Observe the builder request at the fake Stripe boundary; no network.
        return input.stripe.checkout.sessions.create(input.parameters);
      } },
      '@dg/database': { prisma: { organisation: { findUnique: async () => ({ billingCustomerId: null, settings: {} }) } } },
      './subscription-store': { getPlatformSubscription: async () => null },
    };
    const exports = {};
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    vm.runInNewContext(code, { exports, require: id => {
      if (!Object.hasOwn(modules, id)) throw new Error(`Unexpected checkout dependency: ${id}`);
      return modules[id];
    }, process: { env: { STRIPE_SECRET_KEY: 'sk_test_fixture_only',
      STRIPE_PRICE_STARTER: 'fixture_starter', STRIPE_PRICE_GROWTH: 'fixture_professional',
      STRIPE_PRICE_SCALE: 'fixture_business', NEXT_PUBLIC_APP_URL: 'https://fixture.invalid' } } }, { timeout: 1000 });
    let error;
    try { await exports.createPlatformCheckoutSession({ organisationId: 'synthetic_org', email: 'fixture@example.invalid',
      platformTier: plan.id, ...selection }); } catch (e) { error = e; }
    if (reject) return error?.name === 'Error'
      && error.message === `Configured Stripe price does not match the published ${plan.id} monthly AUD catalogue price.`
      && creations.length === 0 && calls.length === 0 && retrieved.length === 1;
    if (error || calls.length !== 1 || creations.length !== 1 || retrieved.length !== 1) return false;
    const params = creations[0];
    if (params !== calls[0] || params.mode !== 'subscription') return false;
    if (params.subscription_data?.trial_period_days !== billing.BILLING_COMMERCIAL_CONFIG.trialDays) return false;
    if (params.line_items?.[0]?.price !== `fixture_${plan.id}`) return false;
    const expected = selection.industryApps?.length ? [apps.GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS, industry.INDUSTRY_COMMERCIAL_LOCK.additionalTemplatePriceCents]
      : selection.premiumApps?.length ? [apps.GROWTH_SUITE_MONTHLY_CENTS] : [];
    const lines = params.line_items.slice(1);
    return JSON.stringify(lines.map(line => line.price_data?.unit_amount)) === JSON.stringify(expected)
      && lines.every(line => line.quantity === 1 && line.price_data?.currency === 'aud' && line.price_data?.recurring?.interval === 'month');
  }
  for (const plan of catalogue.PLATFORM_COMMERCIAL_PLANS) {
    for (const [name, change] of Object.entries({ amount: { unit_amount: plan.monthlyCents + 1 },
      inactive: { active: false }, currency: { currency: 'usd' }, interval: { recurring: { interval: 'year' } },
      intervalCount: { recurring: { interval: 'month', interval_count: 2 } } })) {
      if (!await scenario(plan, change, true)) findings.push(`price-${plan.id}-${name}`);
    }
    if (!await scenario(plan)) findings.push(`trial-${plan.id}`);
    if (!await scenario(plan, {}, false, { premiumApps: ['growth_suite'] })) findings.push(`suite-${plan.id}`);
    if (!await scenario(plan, {}, false, { premiumApps: ['growth_suite'], industryApps: ['real-estate', 'property-management'] })) findings.push(`industry-suite-${plan.id}`);
  }
  return findings;
}
