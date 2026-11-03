import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcile } from './commercial-contract.mjs';
import { checkoutBehaviourFindings } from './checkout-behaviour-contract.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lock = 'docs/commercial/PRICING-AND-PACKAGING.md';
const publicPath = 'marketing/pages/pricing-page.html';
// In-memory mutations exercise the detector without changing policy/files.
const fixture = read;
test('reconciled repository passes', async () => {
  assert.deepEqual((await reconcile()).findings, []);
});
for (const [name, path, before, after, expected] of [
  ['approved price drift', lock, 'Starter **$99/mo**', 'Starter **$100/mo**', 'price-starter'],
  ['public card drift', publicPath, '>$249<span>', '>$250<span>', 'public-card-professional'],
  ['trial drift', lock, 'free for 14 days', 'free for 21 days', 'trial-annual'],
  ['Scale limit drift', lock, 'Scale supports up to 20 users', 'Scale supports unlimited users', 'scale-document-limits'],
  ['industry price drift', lock, '**$149/mo**', '**$99/mo**', 'industry-documents'],
  ['Growth App drift', lock, '| Advertising | **$99/mo** |', '| Advertising | **$100/mo** |', 'growth-advertising'],
  ['public starting price drift', publicPath, 'Core Platform from $99', 'Core Platform from $249', 'public-from-price'],
  ['public Starter card removed', publicPath, '<span class="plan-icon">🚀</span>Starter', '<span class="plan-icon">🚀</span>Start', 'public-card-starter'],
  ['Stripe mapping validation removed', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.unit_amount !== expectedAmountCents', 'false', 'stripe-config-validation'],
  ['checkout trial bypass', 'packages/platform-core/src/billing/platform-checkout.ts', 'trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays', 'trial_period_days: 28', 'trial-consumers'],
]) test(name, async () => {
  assert.ok(fixture(path).includes(before), 'mutation must actually apply');
  const result = await reconcile(p => p === path ? fixture(p).replace(before, after) : fixture(p));
  assert.ok(result.findings.some(f => f.id === expected), JSON.stringify(result.findings));
});
test('Growth Suite bundle lock removed', async () => {
  const result = await reconcile(p => p === lock ? fixture(p).replaceAll('$399', '$398') : fixture(p));
  assert.ok(result.findings.some(f => f.id.startsWith('bundle-lock-')), JSON.stringify(result.findings));
});
test('missing source fails closed', async () => {
  const result = await reconcile(p => { if (p === lock) throw new Error('missing'); return fixture(p); });
  assert.ok(result.findings.some(f => f.id === 'missing-source'));
});
test('provider and deployed-state limitations remain explicit', async () => {
  assert.equal((await reconcile(fixture)).unverified.length, 3);
});

for (const [name, path, before, after, expected] of [
  ['bundle Industry $499 to $498 despite Scale $499', lock, '**$499/mo** | Complete Growth Suite', '**$498/mo** | Complete Growth Suite', 'bundle-lock-Growth Suite + Industry'],
  ['public bundle wrong price', publicPath, '$399<span>/mo', '$398<span>/mo', 'bundle-public-Growth Suite'],
  ['missing named bundle definition', lock, '| **Growth Suite + Industry** |', '| **Unknown bundle** |', 'bundle-lock-Growth Suite + Industry'],
  ['bundle incorrectly includes Core', lock, 'Add-on to the selected Core Platform plan;', 'Includes the selected Core Platform plan;', 'bundle-lock-Growth Suite'],
  ['public bundle incorrectly includes Core', publicPath, 'Add-on to your selected Core Platform plan', 'Includes your selected Core Platform plan', 'bundle-public-Growth Suite'],
  ['bundle missing included template', lock, 'one Industry App and its included primary Industry Template', 'one Industry App', 'bundle-lock-Growth Suite + Industry'],
  ['bundle additional template wrong price', lock, 'additional Industry Templates remain **+$29/mo**', 'additional Industry Templates remain **+$28/mo**', 'bundle-lock-Growth Suite + Industry'],
  ['starting price $100', publicPath, 'Core Platform from $99/mo.', 'Core Platform from $100/mo.', 'public-from-price'],
  ['starting metadata removed', publicPath, 'name="description"', 'name="removed-description"', 'public-from-price'],
  ['starting metadata incorrectly reworded', publicPath, 'Core Platform from $99/mo.', 'Packages from $99/mo.', 'public-from-price'],
  ['comment cannot preserve amount enforcement', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.unit_amount !== expectedAmountCents', 'false /* price.unit_amount !== expectedAmountCents */', 'checkout-behaviour'],
  ['comment cannot preserve active enforcement', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.active !== true', 'false /* price.active !== true */', 'checkout-behaviour'],
  ['comment cannot preserve currency enforcement', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.currency.toLowerCase() !== "aud"', 'false /* price.currency.toLowerCase() !== "aud" */', 'checkout-behaviour'],
  ['comment cannot preserve interval enforcement', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.recurring?.interval !== "month"', 'false /* price.recurring?.interval !== "month" */', 'checkout-behaviour'],
  ['checkout cannot remove Core line', 'packages/platform-core/src/billing/platform-checkout.ts', 'line_items: lineItems,', 'line_items: lineItems.slice(1),', 'checkout-behaviour'],
  ['checkout cannot change bundle amount', 'packages/platform-core/src/billing/platform-checkout.ts', 'const bundleAmount = annual', 'const bundleAmount = true /* annual */', 'checkout-behaviour'],
  ['missing checkout source fails closed', 'packages/platform-core/src/billing/platform-checkout.ts', 'export async function createPlatformCheckoutSession', 'async function unavailableCheckout', 'checkout-behaviour'],
  ['comment cannot preserve trial', 'packages/platform-core/src/billing/platform-checkout.ts', 'trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays', 'trial_period_days: 28 /* trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays */', 'checkout-behaviour'],
]) test(name, async () => {
  assert.ok(fixture(path).includes(before), 'mutation must actually apply');
  const result = await reconcile(p => p === path ? fixture(p).replace(before, after) : fixture(p));
  assert.ok(result.findings.some(f => f.id === expected), JSON.stringify(result.findings));
});

// Independent review counterexamples: inactive HTML must never satisfy a contract.
for (const [name, mutate, expected] of [
  ['commented starting-price metadata', html => html.replace(/<meta name="description"[^>]*>/, value => `<!--${value}-->`), 'public-from-price'],
  ['commented Growth Suite name', html => html.replace('<div class="plan-name">Growth Suite</div>', '<!--<div class="plan-name">Growth Suite</div>-->'), 'bundle-public-Growth Suite'],
  ['commented Industry bundle name', html => html.replace('<div class="plan-name">Growth Suite + Industry</div>', '<!--<div class="plan-name">Growth Suite + Industry</div>-->'), 'bundle-public-Growth Suite + Industry'],
  ['duplicate conflicting description', html => html.replace('<meta name="description"', '<meta name="description" content="Core Platform from $100/mo."><meta name="description"'), 'public-from-price'],
  ['duplicate conflicting named bundle', html => html.replace('<div class="plan-name">Growth Suite</div>', '<div class="plan-name">Growth Suite</div><div class="plan-price">$398<span>/mo</span></div><div class="plan-name">Growth Suite</div>'), 'bundle-public-Growth Suite'],
  ['duplicate conflicting bundle price', html => html.replace('$399<span>/mo</span></div>', '$399<span>/mo</span></div><div class="plan-price">$398<span>/mo</span></div>'), 'bundle-public-Growth Suite'],
  ['unterminated metadata comment', html => html.replace('<meta name="description"', '<!--<meta name="description"'), 'public-from-price'],
]) test(name, async () => {
  const original = fixture(publicPath);
  const changed = mutate(original);
  assert.notEqual(changed, original, 'mutation must actually apply');
  const result = await reconcile(path => path === publicPath ? changed : fixture(path));
  assert.ok(result.findings.some(f => f.id === expected), JSON.stringify(result.findings));
});

test('commented stale markup cannot conflict with valid active markup', async () => {
  const result = await reconcile(path => path === publicPath
    ? '<!--<meta name="description" content="Core Platform from $100/mo."><div class="plan-name">Growth Suite</div><div class="plan-price">$398</div>-->' + fixture(path)
    : fixture(path));
  assert.deepEqual(result.findings, []);
});

for (const [name, prefix] of [
  ['provider create before rejection', 'await stripe.checkout.sessions.create({ mode: "subscription", line_items: [] });'],
  ['unexpected TypeError instead of validation', 'throw new TypeError("mock method unavailable");'],
  ['unexpected Error instead of validation', 'throw new Error("unrelated failure");'],
]) test(name, async () => {
  const path = 'packages/platform-core/src/billing/platform-checkout.ts';
  const before = 'throw new Error(`Configured Stripe price does not match the published ${tier} monthly AUD catalogue price.`);';
  assert.ok(fixture(path).includes(before));
  const result = await reconcile(p => p === path ? fixture(p).replace(before, `${prefix}\n    ${before}`) : fixture(p));
  assert.ok(result.findings.some(f => f.id === 'checkout-behaviour'), JSON.stringify(result.findings));
});


test('real checkout builder: all three tiers reject invalid prices and deliver valid 14-day requests to fake Stripe', async () => {
  assert.deepEqual(await checkoutBehaviourFindings(fixture('packages/platform-core/src/billing/platform-checkout.ts')), []);
});
