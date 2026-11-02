/** Read-only source reconciliation. No credentials, provider clients or database imports. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PLATFORM_COMMERCIAL_PLANS as plans } from '../packages/platform-core/src/billing/commercial-catalogue.ts';
import { GEN2_PLATFORM_PLANS as onboarding } from '../packages/platform-core/src/onboarding/gen2-journey.ts';
import { PLATFORM_TIER_CATALOG as pricing } from '../src/lib/pricing-catalog.ts';
import { maxUsersForTier, maxActiveBusinessesForTier, canUseIndustryIntegrations } from '../src/lib/plans.ts';
import { BILLING_COMMERCIAL_CONFIG as billing } from '../packages/platform-core/src/billing/subscription-types.ts';
import { expectedPurchasedLineItems, stripeItemsMatchPurchasedSelections } from '../packages/platform-core/src/billing/purchased-line-items.ts';
import { GROWTH_APP_CATALOGUE as apps, PAID_APP_PRICES_CENTS as appPrices } from '../packages/platform-core/src/billing/paid-apps.ts';

import { INDUSTRY_COMMERCIAL_LOCK as industry, INDUSTRY_PLATFORMS, industryCheckoutLines } from '../packages/platform-core/src/industry/platform.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
export function reconcile(read = path => readFileSync(resolve(root, path), 'utf8')) {
  const findings = [];
  let checks = 0;
  const check = (id, sources, ok, detail) => { checks++; if (!ok) findings.push({ id, sources, detail }); };
  const source = path => { try { return read(path); } catch { check('missing-source', [path], false, 'Required source unavailable'); return ''; } };
  const lockPath = 'docs/commercial/PRICING-AND-PACKAGING.md';
  const modelPath = 'docs/foundations/COMMERCIAL-MODEL.md';
  const publicPath = 'marketing/pages/pricing-page.html';
  const lock = source(lockPath), model = source(modelPath), html = source(publicPath);
  const publicCards = [...html.matchAll(/<div class="plan-name">([\s\S]*?)<\/div>[\s\S]*?<div class="plan-price">([^<]+)/g)].map(m => ({ name: m[1].replace(/<[^>]+>/g, '').replace(/^[^A-Za-z]+/, '').trim(), price: m[2].trim() }));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const plan of plans) {
    const dollars = plan.monthlyCents / 100;
    for (const [path, doc] of [[lockPath, lock], [modelPath, model]]) {
      check(`price-${plan.id}`, [path, 'packages/platform-core/src/billing/commercial-catalogue.ts'], new RegExp(`${plan.name} \\*\\*\\$${dollars}/mo`).test(doc), `${plan.name} catalogue is AUD $${dollars}/month; document must explicitly agree`);
    }
    const ui = pricing.find(p => p.key === plan.id);
    check(`public-catalogue-${plan.id}`, ['src/lib/pricing-catalog.ts'], ui?.price === `$${dollars}`, 'UI catalogue price differs');
    check(`public-card-${plan.id}`, [publicPath], publicCards.some(card => card.name === plan.name && card.price === `$${dollars}`), 'Public plan card missing or price differs');
    check(`onboarding-${plan.id}`, ['packages/platform-core/src/onboarding/gen2-journey.ts'], onboarding.find(p => p.id === plan.id)?.monthlyCents === plan.monthlyCents, 'Onboarding differs from catalogue');
    check(`limits-${plan.id}`, ['src/lib/plans.ts'], maxUsersForTier(plan.id) === plan.maxUsers && maxActiveBusinessesForTier(plan.id) === plan.maxActiveBusinesses && canUseIndustryIntegrations(plan.id) === (plan.id === 'business'), 'Tier limits or specialist gate differ');
    for (const cadence of ['monthly', 'annual']) {
      const input = { platformTier: plan.id, platformPriceId: `fixture_${plan.id}`, cadence, industryApps: [], premiumApps: [] };
      const expected = expectedPurchasedLineItems(input);
      const item = { quantity: 1, price: { id: input.platformPriceId, unit_amount: plan.monthlyCents * (cadence === 'annual' ? billing.annualMonthsEquivalent : 1), currency: 'aud', recurring: { interval: cadence === 'annual' ? 'year' : 'month' }, product: 'fixture_product' } };
      check(`stripe-${plan.id}-${cadence}`, ['packages/platform-core/src/billing/purchased-line-items.ts'], expected.length === 1 && stripeItemsMatchPurchasedSelections([item], input) && !stripeItemsMatchPurchasedSelections([{ ...item, price: { ...item.price, unit_amount: item.price.unit_amount + 1 } }], input), 'Synthetic Stripe price mapping/amount acceptance or rejection differs');
    }
  }
  for (const app of apps) {
    const label = app.appId === 'reviews' ? 'Reputation' : app.appId === 'prospecting' ? 'Prospecting & Opportunity Engine' : app.label.replace('DigitalGate ', '');
    check(`growth-${app.appId}`, [lockPath, 'packages/platform-core/src/billing/paid-apps.ts'], lock.includes(`| ${label} | **${app.monthlyCents ? `$${app.monthlyCents / 100}/mo` : 'Free'}** |`) && (!app.key || appPrices[app.key] === app.monthlyCents), 'Growth App lock, catalogue or billed price differs');
  }
  check('scale-document-limits', [lockPath, modelPath], /Scale supports up to 20 users/.test(lock) && /up to 5 businesses total/.test(lock) && /scale=20, enterprise=custom/.test(model), 'Scale 20 users / 5 businesses not reconciled');
  check('trial-annual', [lockPath, 'packages/platform-core/src/billing/subscription-types.ts', publicPath], lock.includes(`free for ${billing.trialDays} days`) && text.includes(`${billing.trialDays}-day`) && lock.includes(`**${billing.annualMonthsEquivalent} months**`), 'Trial/annual copy differs');
  const checkout = source('packages/platform-core/src/billing/platform-checkout.ts');
  const wizard = source('src/components/onboarding/Gen2OnboardingWizard.tsx');
  check('trial-consumers', ['packages/platform-core/src/billing/platform-checkout.ts', 'src/components/onboarding/Gen2OnboardingWizard.tsx'], checkout.includes('trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays') && wizard.includes('BILLING_COMMERCIAL_CONFIG.trialDays'), 'Checkout or onboarding bypasses trial configuration');
  check('stripe-config-validation', ['packages/platform-core/src/billing/platform-checkout.ts'], ['STRIPE_PRICE_STARTER', 'STRIPE_PRICE_GROWTH', 'STRIPE_PRICE_SCALE', 'price.active !== true', 'price.unit_amount !== expectedAmountCents', 'price.currency.toLowerCase() !== "aud"'].every(s => checkout.includes(s)), 'Configured Stripe mapping validation missing (source contract only)');
  check('bundle-lock', [lockPath, 'packages/platform-core/src/billing/paid-apps.ts', publicPath], /Growth Suite.*399/.test(lock) && /499/.test(lock), 'Code/public pricing offer Growth Suite $399 and Suite + Industry $499, but staff lock lacks bundle definition; owner reconciliation required');
  check('public-from-price', [publicPath, lockPath], !/Core Platform from \$249/.test(html), 'Public metadata says Core Platform from $249 while Starter is $99');
  check('industry-documents', [lockPath, modelPath, 'packages/platform-core/src/industry/platform.ts'], lock.includes(`| **Industry App** | **$${industry.industryPriceCents / 100}/mo**`) && model.includes(`**$${industry.industryPriceCents / 100}/mo**`) && lock.includes(`**+\$${industry.additionalTemplatePriceCents / 100}/mo**`) && industry.includedTemplates === 1, 'Industry price, included template or expansion price differs');
  for (const platform of INDUSTRY_PLATFORMS) {
    const ids = platform.specialisations.slice(0, 2).map(s => s.id);
    const lines = industryCheckoutLines(ids.length ? ids : [platform.id]);
    check(`industry-lines-${platform.id}`, ['packages/platform-core/src/industry/platform.ts'], lines.length === Math.max(1, ids.length) && lines[0]?.amountCents === industry.industryPriceCents && (ids.length < 2 || lines[1]?.amountCents === industry.additionalTemplatePriceCents), 'Industry checkout must include one template and charge only additional templates');
  }
  const seed = JSON.parse(source('docs/business-brain/digitalgate-knowledge-seed.json') || '{}');
  check('brain-seed-status', ['docs/business-brain/digitalgate-knowledge-seed.json'], seed.defaultStatus === 'proposed', 'Seed approval status changed; require explicit approval evidence');
  return { checks, findings, unverified: ['Live Stripe products/Price IDs/active state and configured environment mappings', 'Live approved Business Brain coverage and supersession', 'Deployed website, hosted onboarding and subscription/account-wide entitlement enforcement'] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = reconcile();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.findings.length ? 1 : 0;
}
