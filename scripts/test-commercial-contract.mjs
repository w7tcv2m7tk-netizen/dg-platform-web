import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcile } from './commercial-contract.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lock = 'docs/commercial/PRICING-AND-PACKAGING.md';
const publicPath = 'marketing/pages/pricing-page.html';
// In-memory mutations exercise the detector without changing policy/files.
const fixture = read;
test('reconciled repository passes', () => {
  assert.deepEqual(reconcile().findings, []);
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
]) test(name, () => {
  assert.ok(fixture(path).includes(before), 'mutation must actually apply');
  const result = reconcile(p => p === path ? fixture(p).replace(before, after) : fixture(p));
  assert.ok(result.findings.some(f => f.id === expected), JSON.stringify(result.findings));
});
test('Growth Suite bundle lock removed', () => {
  const result = reconcile(p => p === lock ? fixture(p).replaceAll('$399', '$398') : fixture(p));
  assert.ok(result.findings.some(f => f.id === 'bundle-lock'), JSON.stringify(result.findings));
});
test('missing source fails closed', () => {
  const result = reconcile(p => { if (p === lock) throw new Error('missing'); return fixture(p); });
  assert.ok(result.findings.some(f => f.id === 'missing-source'));
});
test('provider and deployed-state limitations remain explicit', () => {
  assert.equal(reconcile(fixture).unverified.length, 3);
});
