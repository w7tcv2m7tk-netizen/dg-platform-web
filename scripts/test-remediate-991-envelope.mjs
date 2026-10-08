import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { physical991Envelope, PHYSICAL_991_ORIGIN as origin, PHYSICAL_991_PATH as path } from '../src/lib/remediate-991-request.ts';
const require = createRequire(import.meta.url);
const { NextRequestAdapter } = require('next/dist/server/web/spec-extension/adapters/next-request.js');
const headers = { Origin: origin };
const request = (extra = {}) => new Request(origin + path, { method: 'POST', headers, ...extra });
const streamed = stream => request({ body: stream, duplex: 'half' });

test('Next.js adapted zero-byte network POST passes, including repeated checks', async () => {
  const req = NextRequestAdapter.fromNodeNextRequest({ method: 'POST', url: origin + path, headers, body: Readable.from([]) }, new AbortController().signal);
  assert.notEqual(req.body, null);
  assert.deepEqual(await Promise.all([physical991Envelope(req), physical991Envelope(req)]), [true, true]);
  assert.equal(await physical991Envelope(req), true);
  req.headers.set('Origin', 'https://invalid.example');
  assert.equal(await physical991Envelope(req), false);
});
test('absent body and zero-byte streams pass', async () => {
  for (const req of [request(), request({ body: '' }), streamed(new ReadableStream({ start(c) { c.enqueue(new Uint8Array()); c.close(); } }))]) {
    assert.equal(await physical991Envelope(req), true);
  }
});
test('non-empty and oversized bodies fail at the first non-empty chunk', async () => {
  for (const body of ['x', '{}', new Uint8Array(1024 * 1024)]) assert.equal(await physical991Envelope(request({ body })), false);
  let cancelled = false;
  const req = streamed(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } }));
  assert.equal(await physical991Envelope(req), false);
  assert.equal(cancelled, true);
  assert.equal(await physical991Envelope(req), false);
});
test('unreadable, locked, consumed and aborted bodies fail closed', async () => {
  assert.equal(await physical991Envelope(streamed(new ReadableStream({ start(c) { c.error(new Error('synthetic')); } }))), false);
  const locked = request({ body: '' }); const reader = locked.body.getReader();
  assert.equal(await physical991Envelope(locked), false); reader.releaseLock();
  const consumed = request({ body: '' }); await consumed.text();
  assert.equal(await physical991Envelope(consumed), false);
  const controller = new AbortController(); controller.abort();
  assert.equal(await physical991Envelope(request({ signal: controller.signal })), false);
});
test('stalled body and stalled cancellation cannot bypass the deadline', async () => {
  const req = streamed(new ReadableStream({ cancel() { return new Promise(() => {}); } }));
  const started = performance.now();
  assert.equal(await physical991Envelope(req), false);
  assert.ok(performance.now() - started < 3000);
  assert.equal(await physical991Envelope(req), false);
});
test('method, exact URL, Origin and API-key restrictions remain enforced', async () => {
  for (const req of [request({ method: 'GET' }), request({ headers: {} }), request({ headers: { Origin: 'https://invalid.example' } }), request({ headers: { ...headers, 'X-API-Key': '' } }), new Request(origin + path + '?x=1', { method: 'POST', headers })]) {
    assert.equal(await physical991Envelope(req), false);
  }
});

test('endless empty chunks cannot starve the timeout', async () => {
  const req = streamed(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array()); } }));
  assert.equal(await physical991Envelope(req), false);
});
