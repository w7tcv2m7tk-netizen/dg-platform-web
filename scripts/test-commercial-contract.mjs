import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcile } from './commercial-contract.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lock = 'docs/commercial/PRICING-AND-PACKAGING.md';
const publicPath = 'marketing/pages/pricing-page.html';
// An in-memory reconciled fixture exercises the detector without changing policy/files.
function fixture(path) {
  let value = read(path);
  if (path === lock) value += '\nGrowth Suite $399; Growth Suite + Industry $499\n';
  if (path === publicPath) value = value.replaceAll('Core Platform from $249', 'Core Platform from $99') + '<div class="plan-name">Starter</div><div class="plan-price">$99<span>/mo</span></div>';
  return value;
}
test('reconciled fixture passes; known repository discrepancies remain visible', () => {
  assert.deepEqual(reconcile(fixture).findings, []);
  assert.deepEqual(reconcile().findings.map(f => f.id), ['public-card-starter', 'bundle-lock', 'public-from-price']);
});
for (const [name, path, before, after, expected] of [
  ['approved price drift', lock, 'Starter **$99/mo**', 'Starter **$100/mo**', 'price-starter'],
  ['public card drift', publicPath, '>$249<span>', '>$250<span>', 'public-card-professional'],
  ['trial drift', lock, 'free for 14 days', 'free for 21 days', 'trial-annual'],
  ['Scale limit drift', lock, 'Scale supports up to 20 users', 'Scale supports unlimited users', 'scale-document-limits'],
  ['industry price drift', lock, '**$149/mo**', '**$99/mo**', 'industry-documents'],
  ['Growth App drift', lock, '| Advertising | **$99/mo** |', '| Advertising | **$100/mo** |', 'growth-advertising'],
  ['Stripe mapping validation removed', 'packages/platform-core/src/billing/platform-checkout.ts', 'price.unit_amount !== expectedAmountCents', 'false', 'stripe-config-validation'],
  ['checkout trial bypass', 'packages/platform-core/src/billing/platform-checkout.ts', 'trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays', 'trial_period_days: 28', 'trial-consumers'],
]) test(name, () => {
  assert.ok(fixture(path).includes(before), 'mutation must actually apply');
  const result = reconcile(p => p === path ? fixture(p).replace(before, after) : fixture(p));
  assert.ok(result.findings.some(f => f.id === expected), JSON.stringify(result.findings));
});
test('missing source fails closed', () => {
  const result = reconcile(p => { if (p === lock) throw new Error('missing'); return fixture(p); });
  assert.ok(result.findings.some(f => f.id === 'missing-source'));
});
test('provider and deployed-state limitations remain explicit', () => {
  assert.equal(reconcile(fixture).unverified.length, 3);
});
