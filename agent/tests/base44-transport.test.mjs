import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BridgeRequestError,
  bridgeRequest,
  computeRetryDelay,
  formatTransportError,
} from '../lib/base44-transport.mjs';

const CONFIG = {
  serverUrl: 'https://example.test',
  appId: 'test-app',
  commandSecret: 'test-command-secret',
  pollIntervalMs: 15_000,
  maxBackoffMs: 300_000,
};

test('bridgeRequest returns JSON data for a successful response', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ data: [{ id: 'node-1' }] });

  const result = await bridgeRequest(CONFIG, 'listDeviceNodes');

  assert.deepEqual(result, [{ id: 'node-1' }]);
});

test('bridgeRequest preserves 429 status and Retry-After', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json(
    { error: 'Request failed with status code 429' },
    { status: 429, headers: { 'Retry-After': '7' } },
  );

  await assert.rejects(
    () => bridgeRequest(CONFIG, 'updateDeviceNode', { id: 'node-1' }),
    (error) => {
      assert.ok(error instanceof BridgeRequestError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterMs, 7_000);
      return true;
    },
  );
});

test('bridgeRequest exposes the underlying fetch failure cause', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const cause = Object.assign(new Error('Connect timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' });
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause }); };

  await assert.rejects(
    () => bridgeRequest(CONFIG, 'listPendingCommands', { node_id: 'node-1' }),
    /fetch failed \(UND_ERR_CONNECT_TIMEOUT: Connect timeout\)/,
  );
});

test('computeRetryDelay backs off exponentially, honors Retry-After, and clamps', () => {
  const noJitter = () => 0.5;

  assert.equal(computeRetryDelay(CONFIG, 1, null, noJitter), 15_000);
  assert.equal(computeRetryDelay(CONFIG, 2, null, noJitter), 30_000);
  assert.equal(computeRetryDelay(CONFIG, 3, { retryAfterMs: 120_000 }, noJitter), 120_000);
  assert.equal(computeRetryDelay(CONFIG, 20, { retryAfterMs: 900_000 }, noJitter), 300_000);
});

test('formatTransportError includes a nested network error code', () => {
  const cause = Object.assign(new Error('socket closed'), { code: 'ECONNRESET' });
  const error = new TypeError('fetch failed', { cause });

  assert.equal(formatTransportError(error), 'fetch failed (ECONNRESET: socket closed)');
});
